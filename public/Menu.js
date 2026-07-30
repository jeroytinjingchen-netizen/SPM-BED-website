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
// Cart Local Storage & State Engine
// ==========================================
function loadCart() {
    const savedCart = localStorage.getItem("hawkerhub-cart");
    if (savedCart) {
        try {
            cartItems = JSON.parse(savedCart);
        } catch (e) {
            console.error("Failed to parse cart data:", e);
            cartItems = [];
        }
    }
    cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

function saveCart() {
    localStorage.setItem("hawkerhub-cart", JSON.stringify(cartItems));
    cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    updateCartButton();
    renderCartPage();
}

function updateCartButton() {
    const cartCountEl = document.getElementById("cart-count");
    if (cartCountEl) {
        cartCountEl.textContent = cartCount;
    }
}

function addToCart(id) {
    const item = menuItems.find(i => (i.ItemCode || i.id || i.itemCode) === id);
    if (!item) return;

    const itemId = item.ItemCode || item.id || item.itemCode;
    const itemName = item.ItemDesc || item.name || "Menu Item";
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

function renderCartPage() {
    const cartContainer = document.getElementById("cart-items-container");
    if (!cartContainer) return;

    if (cartItems.length === 0) {
        cartContainer.innerHTML = `<p class="text-gray-500">Your cart is currently empty.</p>`;
        return;
    }

    cartContainer.innerHTML = cartItems.map(item => `
        <div class="cart-item-row flex justify-between items-center py-2 border-b">
            <div>
                <h4 class="font-bold">${item.name}</h4>
                <p class="text-sm text-gray-500">$${item.price.toFixed(2)} x ${item.quantity}</p>
            </div>
            <span class="font-semibold">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
}

// ==========================================
// Initialization DOM Lifecycle Hooks
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadCart();
    updateCartButton();
    renderCartPage();
    loadFavouriteCount();

    // Initial Database Fetch Phase
    fetchMenuItemsFromBackend();

    // Wire Clear Cart Event
    const clearCartButton = document.getElementById("clear-cart");
    if (clearCartButton) {
        clearCartButton.addEventListener("click", () => {
            cartItems = [];
            saveCart();
        });
    }

    // Wire Real-time Search Input
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderMenu();
        });
    }
});

// ==========================================
// BACKEND API SERVICES (Member 2 - Zhen Yu)
// ==========================================

// 1. Core Fetch All Menu Items (Guarded Against HTML 404 Pages)
async function fetchMenuItemsFromBackend() {
    try {
        const response = await fetch('/api/menu/search'); 
        if (!response.ok) {
            console.warn(`Menu API status: ${response.status}`);
            return;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.warn("API response was not JSON.");
            return;
        }
        
        const data = await response.json();
        menuItems = Array.isArray(data) ? data : (data.items || data.menuItems || []);
        renderMenu(); 
    } catch (error) {
        console.error("Error fetching menu items from database:", error);
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

// 4. FEATURE 3: Retrieve Top 5 Popular / Top-Selling Dishes
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
// MEMBER 4 INTEGRATION: FAVOURITES & LIKES
// ==========================================
async function toggleMenuLike(itemId, button) {
    const item = menuItems.find(menuItem => (menuItem.ItemCode || menuItem.id || menuItem.itemCode) === itemId);

    if (!item) {
        alert("Menu item not found.");
        return;
    }

    const authDataStr = localStorage.getItem("hawkerhub-auth");
    if (!authDataStr) {
        alert("Please log in first.");
        return;
    }

    const authData = JSON.parse(authDataStr);
    if (!authData || !authData.customer || !authData.customer.customerId) {
        alert("Please log in first.");
        return;
    }

    if (button) button.disabled = true;

    try {
        const requestBody = {
            customerID: authData.customer.customerId,
            stallID: item.StallID || item.stallID,
            itemCode: item.ItemCode || item.itemCode || itemId
        };

        const response = await fetch("/api/likes/toggle", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authData.token || ""}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error("Unable to update favourite.");
        }

        const data = await response.json();

        if (button) {
            if (data.liked === true) {
                button.textContent = "❤️";
                button.classList.add("liked");
            } else {
                button.textContent = "♡";
                button.classList.remove("liked");
            }
        }

        await loadFavouriteCount();

    } catch (error) {
        console.error("Like request failed:", error);
    } finally {
        if (button) button.disabled = false;
    }
}

async function loadFavouriteCount() {
    const authDataStr = localStorage.getItem("hawkerhub-auth");
    if (!authDataStr) return;

    try {
        const authData = JSON.parse(authDataStr);
        if (!authData || !authData.customer || !authData.customer.customerId) return;

        const customerID = authData.customer.customerId;
        const response = await fetch(`/api/likes/${customerID}`);
        if (!response.ok) return;

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return;

        const data = await response.json();
        const favEl = document.getElementById("favourite-count");
        if (favEl) {
            favEl.textContent = data.totalLikes || data.likesCount || 0;
        }
    } catch (err) {
        console.error("Unable to load favourite count:", err);
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

function openItemDetailsPage(id) {
    const item = menuItems.find(i => (i.ItemCode || i.id || i.itemCode) === id);
    if (!item) return;

    const itemName = item.ItemDesc || item.name || "Unnamed Item";
    const itemCategory = item.ItemCategory || item.category || "General";
    const itemDesc = item.ItemDesc || item.description || "Freshly prepared daily.";
    const itemPrice = parseFloat(item.ItemPrice || item.price || 0);
    const isAvailable = item.available !== undefined ? item.available : true;

    const titleEl = document.getElementById("detail-page-title");
    const badgeEl = document.getElementById("detail-page-badge");
    const descEl = document.getElementById("detail-page-description");
    const priceEl = document.getElementById("detail-page-price");
    const statusEl = document.getElementById("detail-page-status");

    if (titleEl) titleEl.textContent = itemName;
    if (badgeEl) badgeEl.textContent = itemCategory;
    if (descEl) descEl.textContent = itemDesc;
    if (priceEl) priceEl.textContent = `$${itemPrice.toFixed(2)}`;
    
    if (statusEl) {
        if (isAvailable) {
            statusEl.textContent = "In Stock / Available";
            statusEl.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800";
        } else {
            statusEl.textContent = "Out of Stock / Unavailable";
            statusEl.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800";
        }
    }

    navigateTo('details-view');
}

// ==========================================
// Dynamic Menu Renderer Engine
// ==========================================
function renderMenu() {
    const grid = document.getElementById("menu-grid");
    const emptyState = document.getElementById("empty-state");
    if (!grid || !emptyState) return;

    const filtered = menuItems.filter(item => {
        const name = (item.ItemDesc || item.name || "").toLowerCase();
        const category = (item.ItemCategory || item.category || "").toLowerCase();
        
        const matchesCategory = currentCategory === "All" || category === currentCategory.toLowerCase();
        const matchesSearch = name.includes(searchQuery) || category.includes(searchQuery);

        return matchesCategory && matchesSearch;
    });

    const itemCountEl = document.getElementById("item-count");
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

        const itemId = item.ItemCode || item.id || item.itemCode;
        const itemName = item.ItemDesc || item.name || "Unnamed Dish";
        const itemCategory = item.ItemCategory || item.category || "Mains";
        const itemPrice = parseFloat(item.ItemPrice || item.price || 0).toFixed(2);
        const isAvailable = item.available !== undefined ? item.available : true;
        const totalLikes = item.TotalLikes !== undefined ? `❤️ ${item.TotalLikes} Likes` : '';

        card.innerHTML = `
            <div class="menu-card-body">
                <div class="menu-card-meta">
                    <span class="menu-card-category">${itemCategory}</span>
                    <span class="menu-card-status ${isAvailable ? 'available' : 'out-of-stock'}">
                        ${isAvailable ? 'In Stock' : 'Out of Stock'}
                    </span>
                    ${totalLikes ? `<span class="popular-badge" style="background:#fef2f2; color:#ef4444; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">${totalLikes}</span>` : ''}
                </div>
                <h3 class="menu-card-title">${itemName}</h3>
            </div>
            <div class="menu-card-footer">
                <span class="menu-card-price">$${itemPrice}</span>
                <div class="menu-card-actions">
                    <button class="menu-like-button" onclick="toggleMenuLike('${itemId}', this)">
                        ♡
                    </button>
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

// Sync cart count across tabs
window.addEventListener("storage", () => {
    loadCart();
    updateCartButton();
});