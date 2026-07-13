// Mock Database Array tailored to Appendix A Hawker Operations (Main dishes, drinks)
const menuItems = [
    { id: 1, name: "Signature Hainanese Chicken Rice", category: "Mains", price: 5.50, description: "Tender poached chicken served with fragrant seasoned rice, chili sauce, and minced ginger.", available: true },
    { id: 2, name: "Wok-Fried Hokkien Mee", category: "Mains", price: 6.00, description: "Stir-fried yellow noodles and thick bee hoon braised in rich prawn broth, topped with fresh prawns and squid.", available: true },
    { id: 3, name: "Crispy Handmade Spring Rolls", category: "Sides", price: 3.50, description: "Deep-fried golden pastry skins stuffed with seasoned shredded turnips, carrots, and mushrooms. Serves 3 pieces.", available: true },
    { id: 4, name: "Iced Kopi Melaka", category: "Beverages", price: 2.80, description: "Traditional Nanyang dark roasted coffee sweetened with rich, aromatic palm sugar syrup and fresh milk.", available: true },
    { id: 5, name: "Spicy Laksa Lemak", category: "Mains", price: 6.50, description: "Thick rice noodles served in a rich, spicy coconut milk curry broth topped with juicy cockles and fish cakes.", available: true },
    { id: 6, name: "Charcoal Grilled Chicken Satay", category: "Sides", price: 4.80, description: "Grilled marinated chicken skewers charred over charcoal, accompanied by a robust spicy peanut dipping sauce.", available: false },
    { id: 7, name: "Teh Tarik (Frothy Milk Tea)", category: "Beverages", price: 2.20, description: "Black tea combined with condensed milk, poured back and forth repeatedly to create a smooth, frothy head.", available: true }
];

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

    // Initial draw phase
    renderMenu();
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
        card.className = "bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200";
        
        card.innerHTML = `
            <div class="p-5 flex-1">
                <div class="flex justify-between items-start gap-2 mb-2">
                    <span class="inline-block text-[11px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">${item.category}</span>
                    <span class="text-xs ${item.available ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-0.5 rounded-md font-medium">
                        ${item.available ? 'In Stock' : 'Out of Stock'}
                    </span>
                </div>
                <h3 class="font-bold text-gray-900 text-lg leading-snug line-clamp-1">${item.name}</h3>
                <p class="text-gray-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">${item.description}</p>
            </div>
            <div class="bg-gray-50 px-5 py-3.5 border-t border-gray-100 flex justify-between items-center mt-auto gap-2 flex-wrap">
                <span class="text-lg font-bold text-gray-900">$${item.price.toFixed(2)}</span>
                <div class="flex gap-2">
                    <button onclick="openItemDetailsPage(${item.id})" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 focus:outline-hidden cursor-pointer">
                        View Details 
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onclick="addToCart(${item.id})" class="px-3 py-2 text-xs font-semibold rounded-full bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition-colors focus:outline-hidden">
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
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    const existingItem = cartItems.find(cartItem => cartItem.id === id);
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