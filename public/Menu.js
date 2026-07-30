// ==========================================
// Application State Trackers
// ==========================================
let menuItems = [];
let currentCategory = "All";
let searchQuery = "";
let selectedStall = "ALL";
let cartItems = [];
let cartCount = 0;

// ==========================================
// Cart Local Storage Engine
// ==========================================
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
}

function updateCartButton() {
    const cartCountEl = document.getElementById("cart-count");
    if (cartCountEl) {
        cartCountEl.textContent = cartCount;
    }
}

function addToCart(id) {
    const item = menuItems.find(i => (i.ItemCode || i.id) === id);
    if (!item) return;

    const itemId = item.ItemCode || item.id;
    const itemName = item.ItemDesc || item.name;
    const itemPrice = parseFloat(item.ItemPrice || item.price || 0);

    const existingItem = cartItems.find(cartItem => cartItem.id === itemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({ 
            id: itemId, 
            name: itemName, 
            price: itemPrice, 
            category: item.ItemCategory || item.category || "Mains",
            quantity: 1 
        });
    }

    saveCart();
    alert(`${itemName} has been added to your cart.`);
}

// ==========================================
// Initialization Lifecycle Hook
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadCart();
    updateCartButton();

    // Initial Database Fetch from Backend API
    fetchMenuItemsFromBackend();

    // Wire Real-time Search Input Field
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderMenu();
        });
    }
});

// ==========================================
// BACKEND API CONNECTIONS (Zhen Yu - Member 2)
// ==========================================

// 1. Core Fetch All Menu Items
async function fetchMenuItemsFromBackend() {
    try {
        const response = await fetch('/api/menu/search');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        menuItems = Array.isArray(data) ? data : (data.items || data.menuItems || []);
        renderMenu(); 
    } catch (error) {
        console.error("Error fetching menu items from database:", error);
        const itemCountEl = document.getElementById("item-count");
        if (itemCountEl) {
            itemCountEl.textContent = "Error loading menu from database.";
        }
    }
}

// 2. FEATURE 1: Fetch Menu Items by Specific Hawker Stall
async function filterByStall(stallId) {
    selectedStall = stallId;

    if (stallId === "ALL") {
        await fetchMenuItemsFromBackend();
        return;
    }

    try {
        const response = await fetch(`/api/menu/stall/${stallId}`);
        if (!response.ok) throw new Error("Failed to fetch stall menu items.");

        const data = await response.json();
        menuItems = Array.isArray(data) ? data : [];
        renderMenu();
    } catch (error) {
        console.error("Error filtering stall menu:", error);
    }
}

// 3. FEATURE 2: Filter Menu Items by Category & Preferences
async function filterCategory(category) {
    currentCategory = category;

    // Active Category Button State Toggle
    const buttons = document.querySelectorAll(".category-btn");
    buttons.forEach(btn => {
        const text = btn.textContent.trim();
        if (text === category || (category === "All" && text === "All Items")) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    try {
        const response = await fetch(`/api/menu/filter?category=${encodeURIComponent(category)}`);
        if (!response.ok) throw new Error("Failed to filter category.");

        const data = await response.json();
        menuItems = Array.isArray(data) ? data : [];
        renderMenu();
    } catch (error) {
        console.error("Error filtering category:", error);
    }
}

// 4. FEATURE 3: Retrieve Top 5 Popular / Top-Selling Items
async function fetchPopularItems() {
    try {
        const response = await fetch('/api/menu/popular');
        if (!response.ok) throw new Error("Failed to fetch popular menu items.");

        const data = await response.json();
        menuItems = Array.isArray(data) ? data : [];

        const itemCountEl = document.getElementById("item-count");
        if (itemCountEl) {
            itemCountEl.textContent = `Showing Top ${menuItems.length} Most-Liked Items`;
        }

        renderMenu();
    } catch (error) {
        console.error("Error retrieving popular items:", error);
    }
}

// ==========================================
// View Engine & Navigation Router
// ==========================================
function navigateTo(viewId) {
    document.querySelectorAll('.page-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    
    window.scrollTo({ top: 0 });
}

function openItemDetailsPage(itemId) {
    const item = menuItems.find(i => (i.ItemCode || i.id) === itemId);
    if (!item) return;

    const itemName = item.ItemDesc || item.name;
    const itemCategory = item.ItemCategory || item.category || "Main";
    const itemPrice = parseFloat(item.ItemPrice || item.price || 0).toFixed(2);
    const stallId = item.StallID || "General";

    document.getElementById("detail-page-title").textContent = itemName;
    document.getElementById("detail-page-badge").textContent = itemCategory;
    document.getElementById("detail-page-description").textContent = `Stall Code: ${stallId}. Prepared fresh daily.`;
    document.getElementById("detail-page-price").textContent = `$${itemPrice}`;
    document.getElementById("detail-page-status").textContent = `Stall: ${stallId}`;

    navigateTo('details-view');
}

// ==========================================
// Dynamic Menu Renderer Engine
// ==========================================
function renderMenu() {
    const grid = document.getElementById("menu-grid");
    const emptyState = document.getElementById("empty-state");
    const itemCountEl = document.getElementById("item-count");
    if (!grid || !emptyState) return;

    // Filter using local search query matching
    const filtered = menuItems.filter(item => {
        const name = (item.ItemDesc || item.name || "").toLowerCase();
        const category = (item.ItemCategory || item.category || "").toLowerCase();
        return name.includes(searchQuery) || category.includes(searchQuery);
    });

    if (itemCountEl && !itemCountEl.textContent.includes("Top")) {
        itemCountEl.textContent = `Showing ${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
    }

    grid.innerHTML = "";
    if (filtered.length === 0) {
        grid.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
    }

    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card";

        const itemId = item.ItemCode || item.id;
        const itemName = item.ItemDesc || item.name || "Dish Item";
        const itemCategory = item.ItemCategory || item.category || "Mains";
        const itemPrice = parseFloat(item.ItemPrice || item.price || 0).toFixed(2);
        const totalLikes = item.TotalLikes !== undefined ? `❤️ ${item.TotalLikes} Likes` : '';

        card.innerHTML = `
            <div class="menu-card-body">
                <div class="menu-card-meta">
                    <span class="menu-card-category">${itemCategory}</span>
                    ${totalLikes ? `<span class="popular-badge" style="background:#fef2f2; color:#ef4444; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">${totalLikes}</span>` : ''}
                </div>
                <h3 class="menu-card-title">${itemName}</h3>
            </div>
            <div class="menu-card-footer">
                <span class="menu-card-price">$${itemPrice}</span>
                <div class="menu-card-actions">
                    <button onclick="openItemDetailsPage('${itemId}')" class="menu-card-link">
                        View Details
                    </button>
                    <button onclick="addToCart('${itemId}')" class="menu-card-button">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Sync across browser tabs
window.addEventListener("storage", () => {
    loadCart();
    updateCartButton();
});