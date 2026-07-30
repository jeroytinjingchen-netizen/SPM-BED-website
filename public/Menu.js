const AUTH_STORAGE_KEY = 'hawkerhub-auth';
let menuItems = [];

// Application Routing State Management Variables
let currentCategory = "All";
let searchQuery = "";
let cartItems = [];
let cartCount = 0;
let serverCartId = null;
let usingServerCart = false;

function getAuth() {
    const authRaw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authRaw) return null;
    try {
        return JSON.parse(authRaw);
    } catch {
        return null;
    }
}

function isLoggedIn() {
    const auth = getAuth();
    return Boolean(auth && auth.token);
}

function normalizeCartItems(items) {
    return (Array.isArray(items) ? items : []).map((item, index) => {
        const quantity = item.Quantity ?? item.quantity ?? 0;
        const unitPrice = item.UnitPrice ?? item.unitPrice ?? item.price ?? 0;
        const displayId = item.id ?? item.CartItemNo ?? index + 1;

        return {
            ...item,
            id: displayId,
            CartItemNo: item.CartItemNo,
            StallID: item.StallID || item.stallId || item.stallID || item.StallID,
            ItemCode: item.ItemCode || item.itemCode,
            quantity,
            price: unitPrice,
            name: item.name || item.ItemCode || item.itemCode || item.ItemDesc || `Item ${displayId}`,
            category: item.category || item.ItemCategory || ''
        };
    });
}

function buildCartItemPayload(item, quantity = 1) {
    const stallId = item.StallID || item.stallId || item.stallID || item.stall_id || item.StallId || item.vendor_id || item.vendorId;
    const itemCode = item.ItemCode || item.itemCode || item.item_code || item.code;

    if (!stallId || !itemCode) {
        throw new Error('Cart item is missing StallID or ItemCode');
    }

    return {
        StallID: stallId,
        ItemCode: itemCode,
        Quantity: quantity,
        UnitPrice: item.UnitPrice || item.unitPrice || item.price || 0
    };
}

async function fetchServerCart() {
    const auth = getAuth();
    if (!auth || !auth.token) return null;

    try {
        const res = await fetch('/api/cart', {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });

        if (!res.ok) {
            console.warn('Unable to fetch server cart:', res.status);
            return null;
        }

        const data = await res.json();
        serverCartId = data.cart && (data.cart.CartID || data.cart.CartId || null);
        usingServerCart = true;
        return { items: Array.isArray(data.items) ? data.items : [], cartId: serverCartId };
    } catch (error) {
        console.error('Error fetching server cart:', error);
        return null;
    }
}

async function loadCart() {
    if (isLoggedIn()) {
        const serverCart = await fetchServerCart();
        if (serverCart) {
            cartItems = normalizeCartItems(serverCart.items);
            usingServerCart = true;
        } else {
            usingServerCart = false;
            const savedCart = localStorage.getItem("hawkerhub-cart");
            if (savedCart) {
                try {
                    const parsed = JSON.parse(savedCart);
                    cartItems = normalizeCartItems(Array.isArray(parsed) ? parsed : []);
                } catch (error) {
                    console.error('Unable to parse hawkerhub-cart from localStorage:', error, savedCart);
                    cartItems = [];
                    localStorage.removeItem("hawkerhub-cart");
                }
            } else {
                cartItems = [];
            }
        }
    } else {
        usingServerCart = false;
        const savedCart = localStorage.getItem("hawkerhub-cart");
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                cartItems = normalizeCartItems(Array.isArray(parsed) ? parsed : []);
            } catch (error) {
                console.error('Unable to parse hawkerhub-cart from localStorage:', error, savedCart);
                cartItems = [];
                localStorage.removeItem("hawkerhub-cart");
            }
        } else {
            cartItems = [];
        }
    }

    cartCount = cartItems.reduce((sum, item) => sum + (item.Quantity || item.quantity || 0), 0);
}

function saveCart() {
    // Keep a local snapshot so guests can still see their cart and logged-in users can recover if needed.
    localStorage.setItem("hawkerhub-cart", JSON.stringify(cartItems));
    cartCount = cartItems.reduce((sum, item) => sum + (item.Quantity || item.quantity || 0), 0);
    updateCartButton();
    renderCartPage();
}

// Initialize App DOM Layout Lifecycle Hooks
document.addEventListener("DOMContentLoaded", async () => {
    await loadCart();
    await fetchMenuItemsFromBackend();

    // Initial draw phase
    updateCartButton();
    renderCartPage();

    const clearCartButton = document.getElementById("clear-cart");
    if (clearCartButton) {
        clearCartButton.addEventListener("click", () => {
            cartItems = [];
            saveCart();
        });
    }
    
    // Wire Search Input Field Text Events
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderMenu();
        });
    }
});

// ==========================================
// BACK-END API FETCH (FED -> BED CONNECTION)
// ==========================================
function normalizeMenuItems(items) {
    return (Array.isArray(items) ? items : []).map((item, index) => {
        const quantity = item.Quantity ?? item.quantity ?? 0;
        const unitPrice = item.ItemPrice ?? item.price ?? item.UnitPrice ?? 0;
        const stallId = item.StallID || item.stallId || item.stallID || item.stall_id || item.StallId || item.vendor_id || item.vendorId || null;
        const itemCode = item.ItemCode || item.itemCode || item.item_code || item.code || null;
        const displayId = item.id ?? item.ItemID ?? item.CartItemNo ?? index + 1;

        return {
            ...item,
            id: displayId,
            name: item.name || item.item_name || item.ItemDesc || item.itemDesc || `Item ${index + 1}`,
            description: item.description || item.ItemDesc || item.item_desc || item.desc || '',
            price: Number(unitPrice) || 0,
            category: item.category || item.ItemCategory || item.item_category || item.ItemCategory || '',
            quantity,
            StallID: stallId,
            ItemCode: itemCode,
            available: item.available ?? item.availability ?? true
        };
    });
}

async function fetchMenuItemsFromBackend() {
    try {
        // Hits your express route: app.get("/api/menu/search", menuController.searchMenu)
        const response = await fetch('/api/menu/search'); 
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const rows = Array.isArray(data) ? data : (data.items || data.menuItems || []);
        const normalized = normalizeMenuItems(rows);
        if (normalized.length > 0) {
            menuItems = normalized;
        }

        renderMenu(); 
    } catch (error) {
        console.error("Error fetching menu items from BED:", error);
        const itemCountEl = document.getElementById("item-count");
        if (itemCountEl) {
            itemCountEl.textContent = "Error loading menu from database.";
        }
        renderMenu();
    }
}
// Navigation View Engine (Handles opening standard standalone page views)
function navigateTo(viewId) {
    // Hide all existing view templates 
    document.querySelectorAll('.page-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Uncover targeted view id block
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    
    // Ensure window scrolls back to top on transitions
    window.scrollTo({ top: 0 });
}

// Category State Action Engine Filter Actions
function filterCategory(category) {
    currentCategory = category;
    
    // Dynamic Active Button Selection Toggles
    const buttons = document.querySelectorAll(".category-btn");
    buttons.forEach(btn => {
        const text = btn.textContent.trim();
        if(text === category || (category === "All" && text === "All Items")) {
            btn.classList.remove("bg-gray-100", "text-gray-700", "hover:bg-gray-200");
            btn.classList.add("bg-indigo-600", "text-white", "shadow-xs");
        } else {
            btn.classList.remove("bg-indigo-600", "text-white", "shadow-xs");
            btn.classList.add("bg-gray-100", "text-gray-700", "hover:bg-gray-200");
        }
    });
    renderMenu();
}

// Core Array Filtering & Dynamic Card Injection
function renderMenu() {
    const grid = document.getElementById("menu-grid");
    const emptyState = document.getElementById("empty-state");
    if (!grid || !emptyState) return;
    
    // Evaluation Pipeline Filter
    const filtered = menuItems.filter(item => {
        const matchesCategory = currentCategory === "All" || item.category === currentCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery) || 
                              item.description.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    // Write metric text content
    document.getElementById("item-count").textContent = `Showing ${filtered.length} item${filtered.length === 1 ? '' : 's'}`;

    // Clean Layout Grid Pipeline Context Elements
    grid.innerHTML = "";
    if (filtered.length === 0) {
        grid.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
    }

    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    // Map Template Elements Dynamically onto View Container
    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card";
        
        card.innerHTML = `
            <div class="menu-card-body">
                <div class="menu-card-meta">
                    <span class="menu-card-category">${item.category}</span>
                    <span class="menu-card-status ${item.available ? 'available' : 'out-of-stock'}">
                        ${item.available ? 'In Stock' : 'Out of Stock'}
                    </span>
                </div>
                <h3 class="menu-card-title">${item.name}</h3>
                <p class="menu-card-description">${item.description}</p>
            </div>
            <div class="menu-card-footer">
                <span class="menu-card-price">$${item.price.toFixed(2)}</span>
                <div class="menu-card-actions">
                    <button onclick="openItemDetailsPage(${item.id})" class="menu-card-link">
                        View Details
                        <svg xmlns="http://www.w3.org/2000/svg" class="menu-card-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onclick="addToCart(${item.id})" class="menu-card-button">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateCartButton() {
    const cartCountEl = document.getElementById("cart-count");
    if (cartCountEl) {
        cartCountEl.textContent = cartCount;
    }
}

async function addToCart(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    if (isLoggedIn()) {
        const auth = getAuth();
        if (!item.StallID || !item.ItemCode) {
            console.error('Cannot add item to cart: missing StallID or ItemCode', item);
            alert('This menu item is not configured correctly for cart checkout. Please refresh the page.');
            return;
        }

        const payloadItem = buildCartItemPayload(item, 1);

        try {
            const res = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}`
                },
                body: JSON.stringify({ items: [payloadItem] })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.message || 'Unable to add item to cart');
            }

            serverCartId = data.cartId;
            cartItems = normalizeCartItems(Array.isArray(data.items) ? data.items : []);
            usingServerCart = true;
            saveCart();
            alert(`${item.name} has been added to the cart.`);
        } catch (err) {
            console.error('Add to cart failed:', err);
            alert('Unable to add item to cart: ' + (err.message || err));
        }

        return;
    }

    const existingItem = cartItems.find(cartItem => cartItem.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({ ...item, quantity: 1 });
    }

    saveCart();
    alert(`${item.name} has been added to the cart.`);
}

async function changeCartQuantity(id, delta) {
    const item = cartItems.find(cartItem => cartItem.id === id || cartItem.CartItemNo === id);
    if (!item) return;

    const nextQuantity = (item.Quantity || item.quantity || 0) + delta;
    if (nextQuantity < 1) return;

    if (usingServerCart && serverCartId) {
        const auth = getAuth();
        try {
            const res = await fetch('/api/cart/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}`
                },
                body: JSON.stringify({ cartId: serverCartId, cartItemNo: item.CartItemNo, quantity: nextQuantity })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.message || 'Unable to update cart item');
            }

            cartItems = Array.isArray(data.items) ? data.items : cartItems;
            saveCart();
        } catch (err) {
            console.error('Update cart item failed:', err);
            alert('Unable to update item quantity: ' + (err.message || err));
        }

        return;
    }

    item.quantity = nextQuantity;
    saveCart();
}


async function removeCartItem(id) {
    if (usingServerCart && serverCartId) {
        const item = cartItems.find(cartItem => cartItem.id === id || cartItem.CartItemNo === id);
        if (!item) return;

        const auth = getAuth();
        try {
            const res = await fetch('/api/cart/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}`
                },
                body: JSON.stringify({ cartId: serverCartId, cartItemNo: item.CartItemNo })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.message || 'Unable to remove cart item');
            }

            cartItems = Array.isArray(data.items) ? data.items : cartItems.filter(cartItem => cartItem.CartItemNo !== item.CartItemNo);
            saveCart();
        } catch (err) {
            console.error('Remove cart item failed:', err);
            alert('Unable to remove item from cart: ' + (err.message || err));
        }

        return;
    }

    cartItems = cartItems.filter(cartItem => cartItem.id !== id);
    saveCart();
}

function renderCartPage() {
    if (!document.getElementById("cart-items")) return;

    const cartItemsContainer = document.getElementById("cart-items");
    const emptyCart = document.getElementById("empty-cart");
    const summaryCount = document.getElementById("summary-count");
    const summarySubtotal = document.getElementById("summary-subtotal");
    const cartSummary = document.getElementById("cart-summary");
    const checkoutButton = document.getElementById("checkout-button");
    const cartNotice = document.getElementById("cart-notice");

    if (!cartItemsContainer || !emptyCart || !summaryCount || !summarySubtotal || !cartSummary) return;

    if (cartNotice) {
        if (usingServerCart) {
            cartNotice.textContent = 'Using server cart for logged-in order state.';
            cartNotice.classList.remove('hidden');
        } else {
            cartNotice.textContent = '';
            cartNotice.classList.add('hidden');
        }
    }

    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = "";
        emptyCart.classList.remove("hidden");
        summaryCount.textContent = "0";
        summarySubtotal.textContent = "$0.00";
        cartSummary.textContent = "0 items selected";
        if (checkoutButton) {
            checkoutButton.classList.add("hidden");
            checkoutButton.classList.remove("inline-flex");
        }
        return;
    }

    emptyCart.classList.add("hidden");
    cartItemsContainer.innerHTML = cartItems.map(item => `
        <div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h3 class="font-semibold text-gray-900">${item.name}</h3>
                <p class="text-sm text-gray-500">${item.category || item.ItemCode || ''}</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex items-center rounded-full border border-gray-300 bg-white">
                    <button onclick="changeCartQuantity(${item.id}, -1)" class="px-2.5 py-1.5 text-xl font-semibold text-gray-700 hover:text-indigo-600" aria-label="Decrease quantity">-</button>
                    <span class="min-w-9 text-center text-base font-semibold text-gray-900">${item.quantity}</span>
                    <button onclick="changeCartQuantity(${item.id}, 1)" class="px-2.5 py-1.5 text-xl font-semibold text-gray-700 hover:text-indigo-600" aria-label="Increase quantity">+</button>
                </div>
                <span class="text-sm font-semibold text-indigo-600">$${(item.price * item.quantity).toFixed(2)}</span>
                <button onclick="removeCartItem(${item.id})" class="rounded-full bg-red-500 px-3 py-1.5 text-base font-semibold text-white hover:bg-red-600" aria-label="Remove item">×</button>
            </div>
        </div>
    `).join("");

    const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const subtotal = cartItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    summaryCount.textContent = totalItems;
    summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartSummary.textContent = `${totalItems} item${totalItems === 1 ? "" : "s"} selected`;
    if (checkoutButton) {
        checkoutButton.classList.remove("hidden");
        checkoutButton.classList.add("inline-flex");
    }
}

// Checkout handler: POST to server to create order, then clear local cart and navigate
async function handleCheckoutClick(e) {
    e.preventDefault();
    await loadCart();

    const auth = getAuth();
    if (!auth || !auth.token) {
        alert('You must be logged in to checkout. Please log in first.');
        return;
    }
    if (!auth || !auth.token) {
        alert('You must be logged in to checkout. Please log in first.');
        return;
    }

    if (cartItems.length === 0) {
        alert('Your cart is empty. Please add items before checkout.');
        return;
    }

    try {
        // Get server cartId for this customer
        const getRes = await fetch('/api/cart', { headers: { 'Authorization': `Bearer ${auth.token}` } });
        const data = await getRes.json();
        if (!getRes.ok) {
            if (getRes.status === 401 || getRes.status === 403) {
                throw new Error('Login required or session expired. Please log in again.');
            }
            throw new Error(data.error || data.message || 'Could not retrieve cart from server');
        }
        const cartId = data.cart && (data.cart.CartID || data.cart.CartId);
        if (!cartId) {
            throw new Error('Server returned no open cart. Please ensure you are logged in and have a cart.');
        }

        console.log('Checkout debug: local cartItems=', cartItems, 'server cart items=', data.items, 'cartId=', cartId);

        const serverItems = Array.isArray(data.items) ? data.items : [];
        const sourceItems = cartItems.length > 0 ? cartItems : serverItems;

        const payloadItems = sourceItems.map(item => buildCartItemPayload(item, item.Quantity || item.quantity || 0)).filter(item => item.Quantity > 0);

        console.log('Checkout payload:', { cartId, pmtType: 'Cash', items: payloadItems });

        if (payloadItems.length === 0) {
            throw new Error('Your cart is empty. Add items before checkout or refresh the page to restore your cart.');
        }

        const postRes = await fetch('/api/cart/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify({ cartId, pmtType: 'Cash', items: payloadItems })
        });

        const result = await postRes.json();
        if (!postRes.ok) throw new Error(result.error || 'Checkout failed');

        // clear client-side cart
        cartItems = [];
        saveCart();
        alert(`Order placed (ID: ${result.orderId}). Redirecting to confirmation.`);
        window.location.href = 'order-placed.html';
    } catch (err) {
        console.error('Checkout error:', err);
        alert('Checkout failed: ' + (err.message || String(err)));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('checkout-button');
    if (btn) btn.addEventListener('click', handleCheckoutClick);
});

window.addEventListener("storage", () => {
    loadCart();
    updateCartButton();
    renderCartPage();
});

// Routes to the dedicated full detailed item display page view
function openItemDetailsPage(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    // Inject matching row record dataset metrics straight onto UI views
    document.getElementById("detail-page-title").textContent = item.name;
    document.getElementById("detail-page-badge").textContent = item.category;
    document.getElementById("detail-page-description").textContent = item.description;
    document.getElementById("detail-page-price").textContent = `$${item.price.toFixed(2)}`;
    
    const statusEl = document.getElementById("detail-page-status");
    if(item.available) {
        statusEl.textContent = "In Stock / Available";
        statusEl.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800";
    } else {
        statusEl.textContent = "Out of Stock / Unavailable";
        statusEl.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800";
    }
    

    // Call transition routing switch
    navigateTo('details-view');
}