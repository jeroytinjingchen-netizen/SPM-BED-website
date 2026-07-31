document.addEventListener("DOMContentLoaded", loadFavourites);

async function loadFavourites() {
    const grid = document.getElementById("favourites-grid");
    const emptyState = document.getElementById("empty-favourites");
    const countElement = document.getElementById("favourite-count");

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
        alert("Please log in again.");
        window.location.href = "Index.html";
        return;
    }

    const token = authData.token;

    if (!token) {
        alert("Login token is missing.");
        window.location.href = "Index.html";
        return;
    }

    try {
       const customerID =
    authData.customer?.customerId ||
    authData.customer?.customerID;

if (!customerID) {
    throw new Error("Customer ID is missing.");
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

        const favourites = Array.isArray(result)
            ? result
            : result.likes || result.favourites || [];

        renderFavourites(favourites);

    } catch (error) {
        console.error("Load favourites error:", error);

        countElement.textContent = "Unable to load favourites";

        grid.innerHTML = `
            <div class="empty-state-box">
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderFavourites(favourites) {
    const grid = document.getElementById("favourites-grid");
    const emptyState = document.getElementById("empty-favourites");
    const countElement = document.getElementById("favourite-count");

    countElement.textContent =
        `${favourites.length} favourite${favourites.length === 1 ? "" : "s"}`;

    if (favourites.length === 0) {
        grid.innerHTML = "";
        grid.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
    }

    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    grid.innerHTML = favourites.map(item => {
        const stallID = item.StallID || item.stallID;
        const itemCode = item.ItemCode || item.itemCode;
        const name =
            item.ItemDesc ||
            item.name ||
            item.ItemName ||
            "Menu Item";

        const category =
            item.ItemCategory ||
            item.category ||
            "Favourite";

        const price = Number(
            item.ItemPrice ||
            item.price ||
            0
        );

        return `
            <div class="menu-card">
                <div class="menu-card-body">
                    <div class="menu-card-meta">
                        <span class="menu-card-category">
                            ${category}
                        </span>
                    </div>

                    <h3 class="menu-card-title">
                        ${name}
                    </h3>

                    <p class="menu-card-description">
                        ${item.ItemDescription || item.description || ""}
                    </p>
                </div>

                <div class="menu-card-footer">
                    <span class="menu-card-price">
                        $${price.toFixed(2)}
                    </span>

                    <div class="menu-card-actions">
                        <button
                            class="heart-btn liked"
                            onclick="removeFavourite(
                                this,
                                '${stallID}',
                                '${itemCode}'
                            )">
                            ❤️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

async function removeFavourite(button, stallID, itemCode) {
    const authData = JSON.parse(
        localStorage.getItem("hawkerhub-auth")
    );

    button.disabled = true;

    try {
        const response = await fetch("/api/likes/toggle", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authData.token}`
            },
            body: JSON.stringify({
                customerID: authData.customer.customerId,
                stallID,
                itemCode
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.error ||
                "Unable to remove favourite."
            );
        }

        await loadFavourites();

    } catch (error) {
        console.error("Remove favourite error:", error);
        alert(error.message);
        button.disabled = false;
    }
}