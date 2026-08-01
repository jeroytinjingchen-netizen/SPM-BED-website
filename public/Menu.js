// Application Routing State Management Variables
let menuItems = [];
let currentCategory = "All";
let currentStall = "ALL";
let searchQuery = "";
let cartItems = [];
let cartCount = 0;
let likedItems = new Set();
let showSpecialsOnly = false; // THE MISSING VARIABLE!

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

async function loadCustomerLikes() {
    const savedAuth = localStorage.getItem("hawkerhub-auth");

    if (!savedAuth) {
        likedItems.clear();
        return;
    }

    try {
        const authData = JSON.parse(savedAuth);

        const token = authData.token;
        const customerID =
            authData.customer?.customerId ||
            authData.customer?.customerID;

        if (!token || !customerID) {
            likedItems.clear();
            return;
        }

        const response = await fetch(
            `/api/customers/${encodeURIComponent(customerID)}/likes`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.error ||
                "Unable to load favourites."
            );
        }

        likedItems = new Set(
            (result.likes || []).map(item =>
                `${item.StallID}-${item.ItemCode}`
            )
        );

    } catch (error) {
        console.error("Load customer likes error:", error);
        likedItems.clear();
    }
}

async function updateFavouriteBadge() {
    const savedAuth = localStorage.getItem("hawkerhub-auth");

    if (!savedAuth) return;

    try {
        const authData = JSON.parse(savedAuth);

        const token = authData.token;

        const customerID =
            authData.customer?.customerId ||
            authData.customer?.customerID;

        const response = await fetch(
            `/api/customers/${customerID}/likes`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        const badge = document.getElementById("favorite-count");

        if (!badge) return;

        badge.textContent = data.totalLikes || 0;

        if ((data.totalLikes || 0) === 0) {
            badge.style.display = "none";
        } else {
            badge.style.display = "inline-flex";
        }

    } catch (error) {
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    loadCart();

    await fetchMenuItemsFromBackend();
    await loadCustomerLikes();
    await updateFavouriteBadge();


    // Initialize "All Items" button as active by default
    const allBtn = document.querySelector('[data-category="All"]');
    if (allBtn) {
        allBtn.classList.add("active");
    }

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

    const checkoutButton = document.getElementById("checkout-button");
    if (checkoutButton) {
        checkoutButton.addEventListener("click", checkoutCart);
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
       const backendItems = Array.isArray(data)
    ? data
    : (data.items || data.menuItems || []);

    menuItems = backendItems.map((item, index) => ({
        id: item.id || item.MenuItemID || index + 1,

        stallID: item.stallID || item.StallID,
    stallName: item.stallName || item.StallName || item.stall_name || item.StallName || null,
        itemCode: item.itemCode || item.ItemCode,

        name: item.name || item.ItemDesc,
        category: item.category || item.ItemCategory,
        price: Number(item.price || item.ItemPrice),

        description:
            item.description ||
            item.ItemDescription ||
            item.ItemDesc,

        available:
            item.IsAvailable !== undefined
                ? item.IsAvailable
                : item.available !== undefined
                    ? item.available
                    : item.Available !== undefined
                        ? item.Available
                        : true,
                        
        isSpecial: item.IsSpecial === true || item.IsSpecial === 1
    }));
    } catch (error) {
        console.error("Error fetching menu items from database:", error);
    }
}

// 2. FEATURE 1: Fetch Menu Items by Specific Hawker Stall
async function filterByStall(stallId) {
    currentStall = stallId;

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

// THE MISSING TOGGLE FUNCTION
function toggleSpecials() {
    showSpecialsOnly = !showSpecialsOnly;
    const btn = document.getElementById("special-btn");
    
    if (showSpecialsOnly) {
        btn.style.backgroundColor = "#fbbf24"; 
        btn.style.color = "#92400e"; 
        btn.textContent = "🔙 View All Items";
    } else {
        btn.style.backgroundColor = "#d9381e"; 
        btn.style.color = "white";
        btn.textContent = "⭐ View Daily Specials";
    }
    
    renderMenu();
}

// Core Array Filtering & Dynamic Card Injection
function renderMenu() {
    const grid = document.getElementById("menu-grid");
    const emptyState = document.getElementById("empty-state");
    if (!grid || !emptyState) return;
    
    // Evaluation Pipeline Filter
    const filtered = menuItems.filter(item => {
        const stallId = item.stallID || item.raw?.StallID || item.StallID;
        const itemCategory = (item.category || item.ItemCategory || item.itemCategory || "").toString().toLowerCase();
        const selectedCategory = currentCategory.toLowerCase();
        const matchesCategory =
            currentCategory === "All" ||
            itemCategory === selectedCategory ||
            (selectedCategory === "mains" && (itemCategory === "main" || itemCategory === "mains")) ||
            (selectedCategory === "sides" && (itemCategory === "side" || itemCategory === "sides" || itemCategory === "snacks" || itemCategory === "snack")) ||
            (selectedCategory === "beverages" && (itemCategory === "drink" || itemCategory === "drinks" || itemCategory === "beverages")) ||
            (selectedCategory === "desserts" && (itemCategory === "dessert" || itemCategory === "desserts"));
        const matchesStall = currentStall === "ALL" || stallId === currentStall;
        const matchesSearch = (item.name || item.ItemDesc || "").toLowerCase().includes(searchQuery) || 
                              (item.description || item.ItemDescription || "").toLowerCase().includes(searchQuery);
        
        // Check if the item is a special (if the toggle is active)
        const matchesSpecial = showSpecialsOnly ? item.isSpecial : true;

        return matchesCategory && matchesStall && matchesSearch && matchesSpecial;
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
                    <div>
                        <span class="menu-card-category">${item.category}</span>${specialBadge}
                    </div>
                    <span class="menu-card-status ${item.available ? 'available' : 'out-of-stock'}">
                        ${item.available ? 'In Stock' : 'Out of Stock'}
                    </span>
                </div>
                <h3 class="menu-card-title" style="${!item.available ? 'text-decoration: line-through; color: #6b7280;' : ''}">${item.name}</h3>
                <p class="menu-card-description">${item.description}</p>
                <p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">${item.stallName ? `${item.stallName} (${item.stallID || item.raw?.StallID || item.StallID || ''})` : (item.stallID || item.raw?.StallID || item.StallID || '')}</p>
            </div>
            <div class="menu-card-footer">
                <div class="menu-card-footer-row">
                    <span class="menu-card-price">$${item.price.toFixed(2)}</span>
                   <button
                class="heart-btn ${isLiked ? "liked" : ""}"
                onclick="toggleHeart(this, '${stallID}', '${itemCode}')">
                ${isLiked ? "❤️" : "🤍"}
                </button>
                </div>
                <div class="menu-card-footer-row menu-card-footer-actions">
                    <button onclick="openItemDetailsPage(${item.id})" class="menu-card-link">
                        View Details
                    </button>
                    <!-- Disable cart button if out of stock -->
                    <button onclick="addToCart(${item.id})" class="menu-card-button" ${!item.available ? 'disabled style="background:#ccc; cursor:not-allowed;"' : ''}>
                        ${item.available ? 'Add to Cart' : 'Sold Out'}
                    </button>
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

function getStoredAuthData() {
    try {
        const savedAuth = localStorage.getItem("hawkerhub-auth");
        return savedAuth ? JSON.parse(savedAuth) : null;
    } catch (error) {
        console.error("Invalid auth data:", error);
        return null;
    }
}

async function addToCart(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    const existingItem = cartItems.find(cartItem => cartItem.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({ ...item, quantity: 1 });
    }

    saveCart();

    const authData = getStoredAuthData();
    const token = authData?.token;
    const customerId = authData?.customer?.customerId || authData?.customer?.CustomerID || authData?.customer?.customerID;

    if (token && customerId) {
        try {
            const response = await fetch("/api/cart/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    StallID: item.stallID || item.StallID,
                    ItemCode: item.itemCode || item.ItemCode,
                    Quantity: 1,
                    UnitPrice: Number(item.price || item.UnitPrice || 0)
                })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || result.message || "Unable to sync item to cart.");
            }
        } catch (error) {
            console.error("Cart sync error:", error);
        }
    }

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

//function to get the multiplier based on loyalty tier
function getTierMultiplier(status) {
    const multipliers = {
        Bronze: 1,
        Silver: 2,
        Gold: 3,
        Platinum: 4
    };

    return multipliers[status] || 1;
}

async function checkoutCart() {
    if (cartItems.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const savedAuth = localStorage.getItem("hawkerhub-auth");

    if (!savedAuth) {
        alert("Please log in before checking out.");
        window.location.href = "Index.html";
        return;
    }

    let authData;

    try {
        authData = JSON.parse(savedAuth);
    } catch (error) {
        console.error("Invalid auth data:", error);
        alert("Your session is invalid. Please log in again.");
        return;
    }

    const token = authData.token;

    const customerId =
        authData.customer?.customerId ||
        authData.customer?.CustomerID ||
        authData.customer?.customerID;

    if (!token || !customerId) {
        alert("Your session is incomplete. Please log in again.");
        return;
    }

    const subtotal = cartItems.reduce(
        (sum, item) =>
            sum + Number(item.price) * Number(item.quantity),
        0
    );

    try {
        // Get current loyalty tier
        const loyaltyInfoResponse = await fetch("/api/loyalty/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const loyaltyInfo =
            await loyaltyInfoResponse.json().catch(() => ({}));

        if (!loyaltyInfoResponse.ok) {
            throw new Error(
                loyaltyInfo.message ||
                loyaltyInfo.error ||
                "Unable to retrieve loyalty tier."
            );
        }

        const memberStatus = loyaltyInfo.status || "Bronze";
        const multiplier = getTierMultiplier(memberStatus);

        const basePoints = Math.floor(subtotal);
        const pointsEarned = basePoints * multiplier;

        // Get database cart
        const cartResponse = await fetch("/api/cart", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const cartPayload =
            await cartResponse.json().catch(() => ({}));

        if (!cartResponse.ok) {
            throw new Error(
                cartPayload.error ||
                cartPayload.message ||
                "Unable to prepare cart for checkout."
            );
        }

        const cartId =
            cartPayload.cart?.CartID ||
            cartPayload.cart?.CartId;

        if (!cartId) {
            throw new Error(
                "No cart was created for this account."
            );
        }

        localStorage.setItem(
            "hawkerhub-cart-id",
            cartId
        );

        // Complete checkout
        const checkoutResponse = await fetch("/api/cart/checkout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                cartId,
                customerId,
                paymentType: "Cash"
            })
        });

        const checkoutPayload =
            await checkoutResponse.json().catch(() => ({}));

        if (!checkoutResponse.ok) {
            throw new Error(
                checkoutPayload.error ||
                checkoutPayload.message ||
                "Checkout failed."
            );
        }

        // Add loyalty points after checkout succeeds
        if (pointsEarned > 0) {
            const loyaltyResponse = await fetch("/api/loyalty/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    points: pointsEarned
                })
            });

            const loyaltyPayload =
                await loyaltyResponse.json().catch(() => ({}));

            if (!loyaltyResponse.ok) {
                throw new Error(
                    loyaltyPayload.message ||
                    loyaltyPayload.error ||
                    "Order succeeded, but loyalty points could not be added."
                );
            }

            console.log("Loyalty points added:", loyaltyPayload);
        }

        alert(
            `🎉 Order placed successfully!\n\n` +
            `Amount spent: $${subtotal.toFixed(2)}\n` +
            `Member tier: ${memberStatus}\n` +
            `Multiplier: ${multiplier}x\n` +
            `Points earned: ${pointsEarned}`
        );

        cartItems = [];
        saveCart();

        window.location.href = "order-placed.html";

    } catch (error) {
        console.error("Checkout error:", error);

        alert(
            error.message ||
            "Checkout failed. Please try again."
        );
    }


    cartItems = [];
    saveCart();
    window.location.href = "order-placed.html";
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
        <div class="cart-item-card">
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.name}</h3>
                <p class="cart-item-category">${item.category}</p>
            </div>
            <div class="cart-item-actions">
                <div class="cart-quantity-controls">
                    <button onclick="changeCartQuantity(${item.id}, -1)" aria-label="Decrease quantity">-</button>
                    <span class="cart-quantity-count">${item.quantity}</span>
                    <button onclick="changeCartQuantity(${item.id}, 1)" aria-label="Increase quantity">+</button>
                </div>
                <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                <button onclick="removeCartItem(${item.id})" class="cart-item-remove" aria-label="Remove item">×</button>
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