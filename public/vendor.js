// Hardcoded stall ID for testing until a login system passes the correct ID
const stallId = "STL0000001"; 

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch and show the menu as soon as the page loads
    fetchVendorMenu();
    
    // 2. Attach submit events to our HTML forms
    document.getElementById("add-item-form").addEventListener("submit", handleAddItem);
    document.getElementById("edit-item-form").addEventListener("submit", handleEditSubmit);
});

// ==========================================
// READ: Fetch all items for this stall (GET)
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
// CREATE: Add a new item (POST)
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Success! Menu item added.");
            document.getElementById("add-item-form").reset(); // Clear the form
            fetchVendorMenu(); // Refresh the grid to show the new item
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
// DELETE: Remove an item (DELETE)
// ==========================================
async function handleDelete(itemCode) {
    // Add a safety check so vendors don't accidentally delete items
    const isConfirmed = confirm(`Are you sure you want to permanently delete item ${itemCode}?`);
    if (!isConfirmed) return;

    try {
        const response = await fetch(`/stalls/${stallId}/menu/${itemCode}`, {
            method: "DELETE"
        });

        if (response.ok) {
            alert("Item deleted successfully!");
            fetchVendorMenu(); // Refresh the grid to remove the item
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
// UPDATE: Edit existing item logic (PUT)
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Success! Menu item updated.");
            closeEditModal(); // Hide the pop-up
            fetchVendorMenu(); // Refresh the grid to show updates
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
// TOGGLE STOCK: Update availability (PUT)
// ==========================================
async function toggleStock(itemCode) {
    try {
        const response = await fetch(`/stalls/${stallId}/menu/${itemCode}/toggle`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            fetchVendorMenu(); // Refresh the grid to show new status
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
// IDENTITY: Fetch vendor details for navbar
// ==========================================
async function loadVendorIdentity() {
    try {
        // TEMPORARY: Hardcode an owner ID that exists in your database to test
        const mockOwnerId = "OWN000001"; // Update this to a real ID from your DB!
        
        const response = await fetch(`/owners/${mockOwnerId}`);
        if (!response.ok) throw new Error("Failed to fetch owner profile");
        
        const data = await response.json();
        
        // Target the header and update the text with the OwnerName
        const headerElement = document.getElementById("vendor-stall-name");
        if (headerElement) {
            headerElement.textContent = `Welcome, ${data.OwnerName}`;
        }
    } catch (error) {
        console.error("Error loading vendor identity:", error);
    }
}

loadVendorIdentity();