// Mock Database Object Datastore Array
const menuItems = [
    { id: 1, name: "Signature Chicken Rice", category: "Mains", price: 5.50, description: "Tender poached chicken served with fragrant seasoned rice, chili sauce, and minced ginger.", available: true },
    { id: 2, name: "Char Kway Teow", category: "Mains", price: 6.00, description: "Stir-fried flat rice noodles with cockles, Chinese sausage, bean sprouts, and chives in sweet dark soy sauce.", available: true },
    { id: 3, name: "Crispy Spring Rolls", category: "Sides", price: 3.50, description: "Deep-fried golden pastry skins stuffed with seasoned shredded vegetables and mushrooms. Serves 3 pieces.", available: true },
    { id: 4, name: "Iced Kopi Melaka", category: "Beverages", price: 2.80, description: "Traditional Nanyang dark roasted coffee sweetened with rich, aromatic palm sugar syrup and fresh milk.", available: true },
    { id: 5, name: "Laksa Lemak", category: "Mains", price: 6.50, description: "Thick rice noodles served in a rich, spicy coconut milk curry broth topped with prawns, fish cakes, and hard-boiled egg.", available: true },
    { id: 6, name: "Handmade Satay Sticks", category: "Sides", price: 4.80, description: "Grilled marinated chicken skewers charred over charcoal, accompanied by a robust spicy peanut dipping sauce.", available: false },
    { id: 7, name: "Teh Tarik (Frothy Milk Tea)", category: "Beverages", price: 2.20, description: "Black tea combined with condensed milk, poured back and forth repeatedly to create a smooth, frothy head.", available: true }
];

// App State Management Variables
let currentCategory = "All";
let searchQuery = "";

// Initialize App DOM Event Hooks
document.addEventListener("DOMContentLoaded", () => {
    renderMenu();
    
    // Wire Search Input Field Text Events
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderMenu();
        });
    }
});

// Category State Action Engine
function filterCategory(category) {
    currentCategory = category;
    
    // Dynamic Active Styling Toggle Routine
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

// Core Array Filtering & Grid Injection Logic (Backlog: View & Search Items)
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

    // Write counts context string
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

    // Map Template Objects Dynamically onto View Container
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
            <div class="bg-gray-50 px-5 py-3.5 border-t border-gray-100 flex justify-between items-center mt-auto">
                <span class="text-lg font-bold text-gray-900">$${item.price.toFixed(2)}</span>
                <button onclick="openModal(${item.id})" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 focus:outline-hidden">
                    View Details 
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Modal Toggle Overlay Lifecycle Actions (Backlog: View Item Details)
function openModal(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    // Inject target dataset states directly onto UI fields
    document.getElementById("modal-title").textContent = item.name;
    document.getElementById("modal-badge").textContent = item.category;
    document.getElementById("modal-description").textContent = item.description;
    document.getElementById("modal-price").textContent = `$${item.price.toFixed(2)}`;
    
    const statusEl = document.getElementById("modal-status");
    if(item.available) {
        statusEl.textContent = "Available";
        statusEl.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800";
    } else {
        statusEl.textContent = "Out of Stock";
        statusEl.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800";
    }

    // Modal active class transitions
    const modal = document.getElementById("details-modal");
    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.add("opacity-100");
        modal.querySelector('div').classList.remove("scale-95");
        modal.querySelector('div').classList.add("scale-100");
    }, 10);
}

function closeModal() {
    const modal = document.getElementById("details-modal");
    if (!modal) return;
    
    modal.classList.remove("opacity-100");
    modal.querySelector('div').classList.remove("scale-100");
    modal.querySelector('div').classList.add("scale-95");
    setTimeout(() => {
        modal.classList.add("hidden");
    }, 200);
}