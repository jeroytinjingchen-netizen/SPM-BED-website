// ==========================================
// SESSION / AUTH GUARD
// Relies on vendor-auth.js being loaded first (restoreVendorSession,
// handleVendorLogout, VENDOR_AUTH_KEY, currentVendor, vendorToken).
// ==========================================
let stallId = null;   // resolved after login, no longer hardcoded
let vendorStalls = [];

document.addEventListener("DOMContentLoaded", () => {
    const auth = restoreVendorSession();

    if (!auth || !auth.token) {
        // Not logged in - bounce to the vendor login page instead of
        // showing the dashboard with no data.
        window.location.href = "vendor-login.html";
        return;
    }

    vendorStalls = auth.stalls || [];

    document.getElementById("vendor-auth-checking").classList.add("hidden");
    document.getElementById("vendor-dashboard-content").classList.remove("hidden");

    renderVendorIdentity(auth.vendor, vendorStalls);
    prefillProfileForm(auth.vendor);

    if (vendorStalls.length > 0) {
        stallId = vendorStalls[0].StallID;
        fetchVendorMenu();
    } else {
        document.getElementById("vendor-menu-grid").innerHTML =
            `<p class="text-gray-500 col-span-full text-center py-8">
                Your account isn't linked to a stall yet. Contact an admin
                to set up your rental agreement before you can add menu items.
            </p>`;
        document.getElementById("add-item-form").querySelectorAll("button, input, select").forEach(el => el.disabled = true);
    }

    document.getElementById("add-item-form").addEventListener("submit", handleAddItem);
    document.getElementById("edit-item-form").addEventListener("submit", handleEditSubmit);
    document.getElementById("vendor-update-form").addEventListener("submit", handleVendorUpdateProfile);
});

// Small helper so every fetch to a protected vendor route carries the JWT
function vendorAuthHeaders(extra = {}) {
    return {
        Authorization: `Bearer ${vendorToken}`,
        ...extra
    };
}

function renderVendorIdentity(vendor, stalls) {
    const badge = document.getElementById("vendor-stall-name");
    if (!badge) return;

    if (stalls.length > 0) {
        badge.textContent = `${vendor.name} · ${stalls[0].StallName}`;
    } else {
        badge.textContent = `${vendor.name} · No stall assigned`;
    }
}

function prefillProfileForm(vendor) {
    document.getElementById("vendor-update-name").value = vendor.name || "";
    document.getElementById("vendor-update-email").value = vendor.email || "";
    // Contact number isn't in the login response (login only returns name/email),
    // so pull the full profile from GET /api/vendors/:id.
    fetch(`/api/vendors/${vendor.ownerId}`, { headers: vendorAuthHeaders() })
        .then(res => res.json())
        .then(data => {
            if (data.OwnerContactNo) {
                document.getElementById("vendor-update-contact").value = data.OwnerContactNo.trim();
            }
        })
        .catch(err => console.error("Could not load full vendor profile:", err));
}

// ==========================================
// READ: Fetch all items for this stall (GET) - public route, no auth needed
// ==========================================
async function fetchVendorMenu() {
    try {
        const response = await fetch(`/stalls/${stallId}/menu`);
        if (!response.ok) throw new Error("Failed to fetch menu");
        
        const menuItems = await response.json();
        renderVendorMenu(menuItems);
    } catch (error) {
        console.error("Error fetching menu:", error);
        document.getElementById("vendor-menu-grid").innerHTML = 
            `<p class="text-red-500 p-4">Error loading menu items from database.</p>`;
    }
}

// Generate the visual HTML cards based on database results
function renderVendorMenu(items) {
    const grid = document.getElementById("vendor-menu-grid");
    grid.innerHTML = ""; // Clear existing grid

    if (items.length === 0) {
        grid.innerHTML = `<p class="text-gray-500 col-span-full text-center py-8">Your menu is currently empty. Add a dish above!</p>`;
        return;
    }

    items.forEach(item => {
        // Check availability (default to true if column isnt there yet)
        const isAvailable = item.IsAvailable === undefined ? true : item.IsAvailable;
        const opacityClass = isAvailable ? 'opacity-100' : 'opacity-60 grayscale-[30%]';

        // Feature 3: Check Daily Special
        const isSpecial = item.IsSpecial ? true : false;
        const specialBadge = isSpecial ? `<span class="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">⭐ DAILY SPECIAL</span>` : '';

        const card = document.createElement("div");
        card.className = `menu-card flex flex-col justify-between ${opacityClass} transition-all duration-300`; 
        
        // Match the exact spelling from your MS SQL Database mapping
        card.innerHTML = `
            <div class="menu-card-body">
                <div class="menu-card-meta flex justify-between">
                    <div>
                        <span class="menu-card-category">${item.ItemCategory}</span>
                        ${specialBadge}
                    </div>
                    <span class="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                        ${item.ItemCode}
                    </span>
                </div>
                <h3 class="menu-card-title mt-3 ${!isAvailable ? 'line-through text-gray-500' : ''}">${item.ItemDesc}</h3>
            </div>
            <div class="menu-card-footer bg-gray-50 border-t border-gray-100 p-4">
                <div class="flex justify-between items-center mb-3">
                    <span class="menu-card-price text-xl font-bold text-indigo-600">
                        $${Number(item.ItemPrice).toFixed(2)}
                    </span>
                    <button onclick="toggleStock('${item.ItemCode}')" class="px-2 py-1 text-xs font-bold uppercase rounded ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} transition-colors">
                        ${isAvailable ? 'In Stock' : 'Out of Stock'}
                    </button>
                </div>
                <div class="menu-card-actions flex gap-2">
                    <button onclick="openEditModal('${item.ItemCode}', '${item.ItemDesc}', ${item.ItemPrice}, '${item.ItemCategory}', ${isSpecial})" 
                            class="flex-1 py-2 text-sm font-bold text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-colors">
                        Edit
                    </button>
                    <button onclick="handleDelete('${item.ItemCode}')" 
                            class="flex-1 py-2 text-sm font-bold text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// CREATE: Add a new item (POST) - protected, needs vendor JWT
// ==========================================
async function handleAddItem(event) {
    event.preventDefault(); // Stop page from refreshing
    
    // Gather data from the form
    const payload = {
        ItemCode: document.getElementById("add-code").value,
        ItemDesc: document.getElementById("add-desc").value,
        ItemPrice: parseFloat(document.getElementById("add-price").value),
        ItemCategory: document.getElementById("add-category").value,
        IsSpecial: document.getElementById("add-special").checked
    };

    try {
        const response = await fetch(`/stalls/${stallId}/menu`, {
            method: "POST",
            headers: vendorAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Success! Menu item added.");
            document.getElementById("add-item-form").reset(); // Clear the form
            fetchVendorMenu(); // Refresh the grid to show the new item
        } else if (response.status === 401 || response.status === 403) {
            alert("Your session has expired. Please log in again.");
            handleVendorLogout();
        } else {
            const errorData = await response.json();
            alert("Error: " + errorData.error);
        }
    } catch (error) {
        console.error("Error adding item:", error);
        alert("Failed to connect to the server.");
    }
}

// ==========================================
// DELETE: Remove an item (DELETE) - protected, needs vendor JWT
// ==========================================
async function handleDelete(itemCode) {
    // Add a safety check so vendors don't accidentally delete items
    const isConfirmed = confirm(`Are you sure you want to permanently delete item ${itemCode}?`);
    if (!isConfirmed) return;

    try {
        const response = await fetch(`/stalls/${stallId}/menu/${itemCode}`, {
            method: "DELETE",
            headers: vendorAuthHeaders()
        });

        if (response.ok) {
            alert("Item deleted successfully!");
            fetchVendorMenu(); // Refresh the grid to remove the item
        } else if (response.status === 401 || response.status === 403) {
            alert("Your session has expired. Please log in again.");
            handleVendorLogout();
        } else {
            const errorData = await response.json();
            alert("Error: " + errorData.error);
        }
    } catch (error) {
        console.error("Error deleting item:", error);
        alert("Failed to connect to the server.");
    }
}

// ==========================================
// UPDATE: Edit existing item logic (PUT) - protected, needs vendor JWT
// ==========================================

// 1. Open the modal and pre-fill it with the current data
function openEditModal(code, desc, price, category, isSpecial) {
    document.getElementById("edit-code").value = code;
    document.getElementById("edit-desc").value = desc;
    document.getElementById("edit-price").value = price;
    document.getElementById("edit-category").value = category;
    document.getElementById("edit-special").checked = isSpecial;
    
    document.getElementById("edit-modal").classList.remove("hidden");
}

// 2. Hide the modal if they click cancel
function closeEditModal() {
    document.getElementById("edit-modal").classList.add("hidden");
}

// 3. Submit the updated data
async function handleEditSubmit(event) {
    event.preventDefault(); // Stop page from refreshing
    
    const itemCode = document.getElementById("edit-code").value;
    
    // Gather updated data from the form
    const payload = {
        ItemDesc: document.getElementById("edit-desc").value,
        ItemPrice: parseFloat(document.getElementById("edit-price").value),
        ItemCategory: document.getElementById("edit-category").value,
        IsSpecial: document.getElementById("edit-special").checked
    };

    try {
        const response = await fetch(`/stalls/${stallId}/menu/${itemCode}`, {
            method: "PUT",
            headers: vendorAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Success! Menu item updated.");
            closeEditModal(); // Hide the pop-up
            fetchVendorMenu(); // Refresh the grid to show updates
        } else if (response.status === 401 || response.status === 403) {
            alert("Your session has expired. Please log in again.");
            handleVendorLogout();
        } else {
            const errorData = await response.json();
            alert("Error: " + errorData.error);
        }
    } catch (error) {
        console.error("Error updating item:", error);
        alert("Failed to connect to the server.");
    }
}

// ==========================================
// TOGGLE STOCK: Update availability (PUT) - protected, needs vendor JWT
// ==========================================
async function toggleStock(itemCode) {
    try {
        const response = await fetch(`/stalls/${stallId}/menu/${itemCode}/toggle`, {
            method: 'PUT',
            headers: vendorAuthHeaders()
        });
        
        if (response.ok) {
            fetchVendorMenu(); // Refresh the grid to show new status
        } else if (response.status === 401 || response.status === 403) {
            alert("Your session has expired. Please log in again.");
            handleVendorLogout();
        } else {
            const errorData = await response.json();
            alert("Error: " + errorData.error);
        }
    } catch (error) {
        console.error("Error toggling stock:", error);
        alert("Failed to connect to the server.");
    }
}

// ==========================================
// PROFILE: Update vendor profile (PUT /api/vendors/:id)
// ==========================================
async function handleVendorUpdateProfile(event) {
    event.preventDefault();
    const alertBox = document.getElementById("vendor-update-alert");
    alertBox.style.display = "none";

    const ownerName = document.getElementById("vendor-update-name").value.trim();
    const ownerContactNo = document.getElementById("vendor-update-contact").value.trim();
    const ownerEmail = document.getElementById("vendor-update-email").value.trim().toLowerCase();

    const submitBtn = document.getElementById("vendor-update-submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try {
        const response = await fetch(`/api/vendors/${currentVendor.ownerId}`, {
            method: "PUT",
            headers: vendorAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ ownerName, ownerContactNo, ownerEmail })
        });

        const data = await response.json();

        if (!response.ok) {
            showVendorAlert(alertBox, "danger", data.message || "Update failed.");
            return;
        }

        currentVendor.name = ownerName;
        currentVendor.email = ownerEmail;

        // Keep localStorage in sync so a refresh doesn't show stale data
        const saved = JSON.parse(localStorage.getItem(VENDOR_AUTH_KEY));
        saved.vendor = currentVendor;
        localStorage.setItem(VENDOR_AUTH_KEY, JSON.stringify(saved));

        renderVendorIdentity(currentVendor, vendorStalls);
        showVendorAlert(alertBox, "success", data.message || "Profile updated successfully.");
    } catch (err) {
        console.error(err);
        showVendorAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Save Changes";
    }
}

// ==========================================
// PROFILE: Delete vendor account (DELETE /api/vendors/:id)
// ==========================================
async function handleVendorDeleteAccount() {
    const alertBox = document.getElementById("vendor-delete-alert");
    alertBox.style.display = "none";

    const confirmed = window.confirm(
        "Are you sure you want to permanently delete your vendor account? This cannot be undone."
    );
    if (!confirmed) return;

    const deleteBtn = document.getElementById("vendor-delete-account-btn");
    deleteBtn.disabled = true;
    deleteBtn.innerText = "Deleting...";

    try {
        const response = await fetch(`/api/vendors/${currentVendor.ownerId}`, {
            method: "DELETE",
            headers: vendorAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            showVendorAlert(alertBox, "danger", data.message || "Could not delete account.");
            deleteBtn.disabled = false;
            deleteBtn.innerText = "Delete My Vendor Account";
            return;
        }

        alert(data.message || "Your vendor account has been deleted.");
        handleVendorLogout();
    } catch (err) {
        console.error(err);
        showVendorAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
        deleteBtn.disabled = false;
        deleteBtn.innerText = "Delete My Vendor Account";
    }
}

function showVendorAlert(element, type, message) {
    if (!element) return;
    element.className = `alert alert-${type}`;
    element.innerText = message;
    element.style.display = "block";
}