let menuItems = [];

// Application Routing State Management Variables
let currentCategory = "All";
let searchQuery = "";
let cartItems = [];
let cartCount = 0;

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
document.addEventListener("DOMContentLoaded", () => {
    loadCart();

    renderMenu();
    updateCartButton();
    renderCartPage();
    fetchMenuItemsFromBackend();

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
        
        // Handle both direct arrays or wrapped object responses (e.g. { items: [...] })
        menuItems = Array.isArray(data) ? data : (data.items || data.menuItems || []);
        
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
                    <button onclick="openItemDetailsPage(${JSON.stringify(item.id)})" class="menu-card-link">
                        View Details
                        <svg xmlns="http://www.w3.org/2000/svg" class="menu-card-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onclick="addToCart(${JSON.stringify(item.id)})" class="menu-card-button">
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
        <div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h3 class="font-semibold text-gray-900">${item.name}</h3>
                <p class="text-sm text-gray-500">${item.category}</p>
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