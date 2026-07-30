let menuItems = [];

function escapeSingleQuotedString(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Application Routing State Management Variables
let currentCategory = "All";
let currentStall = "ALL";
let searchQuery = "";
let cartItems = [];
let cartCount = 0;

// Stall name mapping
const stallNames = {
    "STL0000001": "Ali Nasi Lemak (#01-01)",
    "STL0000002": "Ben Chicken Rice (#01-02)",
    "STL0000003": "Chloe Western (#02-01)",
    "STL0000004": "Aisha Briyani (#02-02)",
    "STL0000005": "Daniel Ramen (#03-01)",
    "STL0000006": "Farah Desserts (#03-02)",
    "STL0000007": "Kumar Curry (#03-03)",
    "STL0000008": "Nur Noodles (#04-01)",
    "STL0000009": "Rahim Rice (#04-02)",
    "STL0000010": "Mei Ling Veg (#04-03)",
    "STL0000011": "Jason Burgers (#05-01)",
    "STL0000012": "Siti Satay (#05-02)",
    "STL0000013": "Ahmad Soup (#05-03)",
    "STL0000014": "Priya Indian (#06-01)",
    "STL0000015": "Arjun Tandoori (#06-02)",
    "STL0000016": "Wei Jian Noodles (#06-03)",
    "STL0000017": "Hannah Salad (#07-01)",
    "STL0000018": "Irfan Fried (#07-02)",
    "STL0000019": "Nabila Cake (#07-03)",
    "STL0000020": "Ryan Ribs (#08-01)"
};

function getStallName(stallId) {
    return stallNames[stallId] || stallId;
}

function loadCart() {
    const savedCart = localStorage.getItem("hawkerhub-cart");
    if (savedCart) {
        cartItems = JSON.parse(savedCart);
    }
    cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

function saveCart() {
    localStorage.setItem("hawkerhub-cart", JSON.stringify(cartItems));
    cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    updateCartButton();
    renderCartPage();
}

// Initialize App DOM Layout Lifecycle Hooks
document.addEventListener("DOMContentLoaded", async () => {
    loadCart();
    await fetchMenuItemsFromBackend();

    // Initialize "All Items" button as active by default
    const allBtn = document.querySelector('[data-category="All"]');
    if (allBtn) {
        allBtn.classList.add("active");
    }

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
async function fetchMenuItemsFromBackend() {
    try {
        // Hits your express route: app.get("/api/menu/search", menuController.searchMenu)
        const response = await fetch('/api/menu/search');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const rawItems = Array.isArray(data) ? data : (data.items || data.menuItems || []);

        menuItems = rawItems.map(item => ({
            id: item.id ?? item.ItemCode ?? item.ItemID ?? item.ItemId ?? item.ItemCode ?? '',
            name: item.name ?? item.ItemName ?? item.ItemDesc ?? item.ItemDescription ?? 'Unnamed item',
            description: item.description ?? item.ItemDescription ?? item.ItemDesc ?? item.ItemCode ?? '',
            price: Number(item.price ?? item.ItemPrice ?? item.Price ?? 0) || 0,
            category: item.category ?? item.ItemCategory ?? 'All',
            available: item.available ?? item.isAvailable ?? true,
            raw: item
        }));

        renderMenu();
    } catch (error) {
        console.error("Error fetching menu items from BED:", error);
        const itemCountEl = document.getElementById("item-count");
        if (itemCountEl) {
            itemCountEl.textContent = "Error loading menu from database.";
        }
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
        const btnCategory = btn.getAttribute('data-category');
        if(btnCategory === category) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    renderMenu();
}

// Stall Filter Function
function filterByStall(stallId) {
    currentStall = stallId;
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
        const matchesStall = currentStall === "ALL" || item.raw?.StallID === currentStall;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery) || 
                              item.description.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesStall && matchesSearch;
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
                <p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">${getStallName(item.raw?.StallID || 'Unknown')}</p>
            </div>
            <div class="menu-card-footer">
                <span class="menu-card-price">$${item.price.toFixed(2)}</span>
                <div class="menu-card-actions">
                    <button onclick="openItemDetailsPage('${escapeSingleQuotedString(item.id)}')" class="menu-card-link">
                        View Details
                        <svg xmlns="http://www.w3.org/2000/svg" class="menu-card-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onclick="addToCart('${escapeSingleQuotedString(item.id)}')" class="menu-card-button">
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

function addToCart(id) {
    const normalizedId = String(id);
    const item = menuItems.find(i => String(i.id) === normalizedId);
    if (!item) return;

    const existingItem = cartItems.find(cartItem => String(cartItem.id) === normalizedId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({ ...item, quantity: 1 });
    }

    saveCart();
    alert(`${item.name} has been added to the cart.`);
}

function changeCartQuantity(id, delta) {
    const item = cartItems.find(cartItem => cartItem.id === id);
    if (!item) return;

    const nextQuantity = item.quantity + delta;
    if (nextQuantity < 1) return;

    item.quantity = nextQuantity;
    saveCart();
}


function removeCartItem(id) {
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

    if (!cartItemsContainer || !emptyCart || !summaryCount || !summarySubtotal || !cartSummary) return;

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
        <div style="display: flex; flex-direction: column; gap: 0.75rem; border-radius: 0.75rem; border: 1px solid #e9ecef; background-color: #f8f9fa; padding: 1rem;">
            <div>
                <h3 style="font-weight: 600; color: #111827;">${item.name}</h3>
                <p style="font-size: 0.875rem; color: #6b7280;">${item.category}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; border-radius: 9999px; border: 1px solid #d1d5db; background-color: white;">
                    <button onclick="changeCartQuantity(${item.id}, -1)" style="padding: 0.5rem 0.75rem; font-size: 1.25rem; font-weight: 600; color: #374151; background: none; border: none; cursor: pointer; hover-color: var(--primary-color);" aria-label="Decrease quantity">−</button>
                    <span style="min-width: 2.25rem; text-align: center; font-size: 1rem; font-weight: 600; color: #111827;">${item.quantity}</span>
                    <button onclick="changeCartQuantity(${item.id}, 1)" style="padding: 0.5rem 0.75rem; font-size: 1.25rem; font-weight: 600; color: #374151; background: none; border: none; cursor: pointer;" aria-label="Increase quantity">+</button>
                </div>
                <span style="font-size: 0.875rem; font-weight: 600; color: var(--primary-color);">$${(item.price * item.quantity).toFixed(2)}</span>
                <button onclick="removeCartItem(${item.id})" style="border-radius: 9999px; background-color: #ef4444; padding: 0.5rem 0.75rem; font-size: 1rem; font-weight: 600; color: white; border: none; cursor: pointer; margin-left: auto;" aria-label="Remove item">×</button>
            </div>
        </div>
    `).join("");

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    summaryCount.textContent = totalItems;
    summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartSummary.textContent = `${totalItems} item${totalItems === 1 ? "" : "s"} selected`;
    if (checkoutButton) {
        checkoutButton.classList.remove("hidden");
        checkoutButton.classList.add("inline-flex");
    }
}

// Checkout handler: sync local cart to server, create order, then navigate
async function handleCheckoutClick(e) {
    e.preventDefault();
    const authRaw = localStorage.getItem('hawkerhub-auth');
    const auth = authRaw ? JSON.parse(authRaw) : null;
    if (!auth || !auth.token) {
        alert('You must be logged in to checkout.');
        return;
    }

    try {
        if (cartItems.length === 0) {
            alert('Your cart is empty. Add items before checkout.');
            return;
        }

        // Get server cartId for this customer
        const getRes = await fetch('/api/cart', { headers: { 'Authorization': `Bearer ${auth.token}` } });
        if (!getRes.ok) throw new Error('Could not retrieve cart from server');
        const data = await getRes.json();
        const cartId = data.cart && (data.cart.CartID || data.cart.CartId);
        if (!cartId) throw new Error('No open cart found');

        // Sync local cartItems to server cart
        for (const item of cartItems) {
            const stallId = item.raw?.StallID || item.stallId || item.StallID || item.stall_id || 'STL0000001';
            const itemCode = item.raw?.ItemCode || item.itemCode || item.ItemCode || item.code || item.id;
            const addRes = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}`
                },
                body: JSON.stringify({
                    StallID: stallId,
                    ItemCode: itemCode,
                    Quantity: item.quantity || 1,
                    UnitPrice: item.price || item.unitPrice || item.UnitPrice || 0
                })
            });
            if (!addRes.ok) {
                const err = await addRes.json();
                throw new Error(err.error || 'Failed to sync cart item');
            }
        }

        // Checkout with synced cart
        const postRes = await fetch('/api/cart/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify({ cartId, pmtType: 'Cash' })
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
    const normalizedId = String(id);
    const item = menuItems.find(i => String(i.id) === normalizedId);
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