// Mock Database Array tailored to Appendix A Hawker Operations (Main dishes, drinks)
let menuItems = [
    {
        id: 1,
        stallID: "STL0000001",
        itemCode: "ITM01",
        name: "Signature Hainanese Chicken Rice",
        category: "Mains",
        price: 5.50,
        description: "Tender poached chicken served with fragrant seasoned rice, chili sauce, and minced ginger.",
        available: true
    },
    {
        id: 2,
        stallID: "STL0000002",
        itemCode: "ITM02",
        name: "Wok-Fried Hokkien Mee",
        category: "Mains",
        price: 6.00,
        description: "Stir-fried yellow noodles and thick bee hoon braised in rich prawn broth, topped with prawns and squid.",
        available: true
    },
    {
        id: 3,
        stallID: "STL0000003",
        itemCode: "ITM03",
        name: "Crispy Handmade Spring Rolls",
        category: "Sides",
        price: 3.50,
        description: "Deep-fried golden pastry skins stuffed with seasoned shredded turnips, carrots, and mushrooms.",
        available: true
    },
    {
        id: 4,
        stallID: "STL0000004",
        itemCode: "ITM04",
        name: "Iced Kopi Melaka",
        category: "Beverages",
        price: 2.80,
        description: "Traditional Nanyang coffee sweetened with aromatic palm sugar syrup and fresh milk.",
        available: true
    },
    {
        id: 5,
        stallID: "STL0000005",
        itemCode: "ITM05",
        name: "Spicy Laksa Lemak",
        category: "Mains",
        price: 6.50,
        description: "Thick rice noodles served in rich spicy coconut curry broth with fish cake and cockles.",
        available: true
    },
    {
        id: 6,
        stallID: "STL0000006",
        itemCode: "ITM06",
        name: "Charcoal Grilled Chicken Satay",
        category: "Sides",
        price: 4.80,
        description: "Grilled marinated chicken skewers served with spicy peanut sauce.",
        available: false
    },
    {
        id: 7,
        stallID: "STL0000007",
        itemCode: "ITM07",
        name: "Teh Tarik (Frothy Milk Tea)",
        category: "Beverages",
        price: 2.20,
        description: "Traditional pulled milk tea with a smooth and frothy texture.",
        available: true
    }
];

// Application Routing State Management Variables
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
        
        // Handle both direct arrays or wrapped object responses (e.g. { items: [...] })
       const backendItems = Array.isArray(data)
    ? data
    : (data.items || data.menuItems || []);

menuItems = backendItems.map((item, index) => ({
    id: item.id || item.MenuItemID || index + 1,

    stallID: item.stallID || item.StallID,
    itemCode: item.itemCode || item.ItemCode,

    name: item.name || item.ItemDesc,
    category: item.category || item.ItemCategory,
    price: Number(item.price || item.ItemPrice),

    description:
        item.description ||
        item.ItemDescription ||
        item.ItemDesc,

    available:
        item.available !== undefined
            ? item.available
            : item.Available !== undefined
                ? item.Available
                : true
}));
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
                   <div class="menu-card-actions">

        <div class="menu-card-actions">

    <button
    class="heart-btn"
    onclick="toggleHeart(this, '${item.stallID}', '${item.itemCode}')">
    🤍
</button>

    <button onclick="openItemDetailsPage(${item.id})" class="menu-card-link">
        View Details
    </button>

    <button onclick="addToCart(${item.id})" class="menu-card-button">
        Add to Cart
    </button>

</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}



async function toggleHeart(button, stallID, itemCode) {
    const savedAuth = localStorage.getItem("hawkerhub-auth");

    if (!savedAuth) {
        alert("Please log in first.");
        window.location.href = "Index.html";
        return;
    }

    let authData;

    try {
        authData = JSON.parse(savedAuth);
    } catch (error) {
        console.error("Invalid login information:", error);
        alert("Login information is invalid. Please log in again.");
        return;
    }

    const token = authData.token;
    const customer = authData.customer;
    const customerID = customer?.customerId;

    if (!token) {
        alert("Login token is missing.");
        return;
    }

    if (!customerID) {
        alert("Customer ID is missing.");
        console.log("Saved auth data:", authData);
        return;
    }

    button.disabled = true;

    try {
        const response = await fetch("/api/likes/toggle", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                customerID: customerID,
                stallID: stallID,
                itemCode: itemCode
            })
        });

        const result = await response.json();

        console.log("Like response:", result);

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.error ||
                "Unable to update favourite."
            );
        }

        if (result.liked === true) {
            button.textContent = "❤️";
            button.classList.add("liked");
        } else {
            button.textContent = "🤍";
            button.classList.remove("liked");
        }

    } catch (error) {
        console.error("Like error:", error);
        alert(error.message);
    } finally {
        button.disabled = false;
    }
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

function openItemDetailsPage(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    document.getElementById("detail-page-title").textContent = item.name;
    document.getElementById("detail-page-badge").textContent = item.category;
    document.getElementById("detail-page-description").textContent = item.description;
    document.getElementById("detail-page-price").textContent = `$${item.price.toFixed(2)}`;

    const statusEl = document.getElementById("detail-page-status");

    if (item.available) {
        statusEl.textContent = "In Stock / Available";
        statusEl.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800";
    } else {
        statusEl.textContent = "Out of Stock / Unavailable";
        statusEl.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800";
    }

    navigateTo('details-view');
}

// ===============================
// LIKE BUTTON
// ===============================
async function toggleHeart(button, stallID, itemCode) {
    const savedAuth = localStorage.getItem("hawkerhub-auth");

    if (!savedAuth) {
        alert("Please log in first.");
        window.location.href = "Index.html";
        return;
    }

    let authData;

    try {
        authData = JSON.parse(savedAuth);
    } catch (error) {
        console.error("Invalid login data:", error);
        alert("Login information is invalid. Please log in again.");
        return;
    }

    const token = authData.token;
    const customer = authData.customer;
    const customerID = customer.customerId;

    if (!token || !customerID) {
        alert("Token or Customer ID is missing. Please log in again.");
        return;
    }

    try {
        const response = await fetch("/api/likes/toggle", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                customerID: customerID,
                stallID: stallID,
                itemCode: itemCode
            })
        });

        const result = await response.json();

        console.log("Like result:", result);

        if (!response.ok) {
            throw new Error(result.message || "Unable to update favourite.");
        }

        if (result.liked === true) {
            button.textContent = "❤️";
            button.classList.add("liked");
        } else {
            button.textContent = "🤍";
            button.classList.remove("liked");
        }

    } catch (error) {
        console.error("Like error:", error);
        alert(error.message);
    }
}

// ===============================
// LIKE BUTTON
// ===============================
async function toggleHeart(button, stallID, itemCode) {
    const savedAuth = localStorage.getItem("hawkerhub-auth");

    if (!savedAuth) {
        alert("Please log in first.");
        window.location.href = "Index.html";
        return;
    }

    let authData;

    try {
        authData = JSON.parse(savedAuth);
    } catch (error) {
        console.error("Invalid login information:", error);
        alert("Login information is invalid. Please log in again.");
        return;
    }

    const token = authData.token;
    const customer = authData.customer;
    const customerID = customer.customerId;

    if (!token) {
        alert("Login token is missing.");
        return;
    }

    if (!customerID) {
        alert("Customer ID is missing.");
        console.log("Saved auth data:", authData);
        return;
    }

    button.disabled = true;

    try {
        const response = await fetch("/api/likes/toggle", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                customerID: customerID,
                stallID: stallID,
                itemCode: itemCode
            })
        });

        const result = await response.json();

        console.log("Like response:", result);

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.error ||
                "Unable to update favourite."
            );
        }

        if (result.liked === true) {
            button.textContent = "❤️";
            button.classList.add("liked");
        } else {
            button.textContent = "🤍";
            button.classList.remove("liked");
        }

    } catch (error) {
        console.error("Like error:", error);
        alert(error.message);
    } finally {
        button.disabled = false;
    }
}