document.addEventListener("DOMContentLoaded", async () => {
    const refreshButton =
        document.getElementById("refresh-rewards");

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadRewardsPage
        );
    }

    await loadRewardsPage();
});

function getRewardsAuth() {
    const savedAuth =
        localStorage.getItem("hawkerhub-auth");

    if (!savedAuth) {
        return null;
    }

    try {
        return JSON.parse(savedAuth);
    } catch (error) {
        console.error("Invalid auth data:", error);
        return null;
    }
}

async function loadRewardsPage() {
    const authData = getRewardsAuth();

    if (!authData?.token) {
        alert("Please log in first.");
        window.location.href = "Index.html";
        return;
    }

    try {
        await Promise.all([
            loadAvailablePoints(authData.token),
            loadRewards(authData.token),
            loadRedemptionHistory(authData.token)
        ]);

    } catch (error) {
        console.error("Load rewards page error:", error);
        showRewardMessage(error.message, "error");
    }
}

async function loadAvailablePoints(token) {
    const response = await fetch("/api/loyalty/me", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Unable to load loyalty points."
        );
    }

    const availablePoints = Number(data.points || 0);

    document.getElementById(
        "available-points"
    ).textContent = availablePoints;
}

async function loadRewards(token) {
    const response = await fetch("/api/rewards", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Unable to load rewards."
        );
    }

    renderRewards(data.rewards || []);
}

function renderRewards(rewards) {
    const grid =
        document.getElementById("rewards-grid");

    const emptyState =
        document.getElementById("empty-rewards");

    const rewardCount =
        document.getElementById("reward-count");

    rewardCount.textContent =
        `${rewards.length} reward${rewards.length === 1 ? "" : "s"} available`;

    if (rewards.length === 0) {
        grid.innerHTML = "";
        grid.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
    }

    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    grid.innerHTML = rewards.map((reward) => {
        const rewardID = Number(reward.RewardID);
        const pointsRequired =
            Number(reward.PointsRequired || 0);

        const stock =
            Number(reward.StockQuantity || 0);

        const isOutOfStock = stock <= 0;

        const imageSource =
            reward.RewardImage ||
            "images/reward-placeholder.png";

        return `
            <article class="reward-card">
                <div class="reward-image-wrapper">
                    <img
                        src="${imageSource}"
                        alt="${escapeHtml(reward.RewardName)}"
                        class="reward-image"
                        onerror="this.style.display='none'; this.parentElement.classList.add('reward-image-fallback');"
                    >

                    <span class="reward-stock-badge">
                        ${isOutOfStock ? "Out of stock" : `${stock} left`}
                    </span>
                </div>

                <div class="reward-card-body">
                    <h3>
                        ${escapeHtml(reward.RewardName)}
                    </h3>

                    <p>
                        ${escapeHtml(
                            reward.RewardDescription ||
                            "Member redemption reward."
                        )}
                    </p>

                    <div class="reward-card-footer">
                        <span class="reward-points">
                            ⭐ ${pointsRequired} points
                        </span>

                        <button
                            type="button"
                            class="reward-redeem-button"
                            onclick="redeemReward(
                                ${rewardID},
                                '${escapeForAttribute(reward.RewardName)}',
                                ${pointsRequired}
                            )"
                            ${isOutOfStock ? "disabled" : ""}
                        >
                            ${isOutOfStock ? "Unavailable" : "Redeem"}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

async function redeemReward(
    rewardID,
    rewardName,
    pointsRequired
) {
    const authData = getRewardsAuth();

    if (!authData?.token) {
        alert("Please log in first.");
        window.location.href = "Index.html";
        return;
    }

    const confirmed = confirm(
        `Redeem ${rewardName}?\n\n` +
        `Points required: ${pointsRequired}\n\n` +
        `The points will be deducted immediately.`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `/api/rewards/${rewardID}/redeem`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${authData.token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "Unable to redeem reward."
            );
        }

        alert(
            `🎉 Reward redeemed successfully!\n\n` +
            `Reward: ${data.rewardName}\n` +
            `Redemption ID: ${data.redemptionID}\n` +
            `Points used: ${data.pointsUsed}\n` +
            `Remaining points: ${data.remainingPoints}\n` +
            `Status: ${data.status}\n\n` +
            `${data.collectionMessage}\n\n` +
            `Please show your Redemption ID at the counter.`
        );

        showRewardMessage(
            `${data.rewardName} redeemed successfully.`,
            "success"
        );

        await loadRewardsPage();

    } catch (error) {
        console.error("Redeem reward error:", error);
        showRewardMessage(error.message, "error");
        alert(error.message);
    }
}

async function loadRedemptionHistory(token) {
    const response = await fetch(
        "/api/rewards/my-redemptions",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "Unable to load redemption history."
        );
    }

    renderRedemptionHistory(
        data.redemptions || []
    );
}

function renderRedemptionHistory(redemptions) {
    const container =
        document.getElementById("redemption-history");

    if (redemptions.length === 0) {
        container.innerHTML = `
            <div class="rewards-empty">
                <h3>No reward redemptions yet</h3>
                <p>Your redeemed rewards will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = redemptions
        .map((redemption) => {
            const redemptionDate =
                new Date(
                    redemption.RedemptionDate
                ).toLocaleString();

            const status =
                redemption.Status ||
                "Pending Collection";

            return `
                <article class="redemption-card">
                    <div>
                        <span class="redemption-id">
                            Redemption #${redemption.RedemptionID}
                        </span>

                        <h3>
                            ${escapeHtml(redemption.RewardName)}
                        </h3>

                        <p>
                            ${escapeHtml(
                                redemption.RewardDescription ||
                                ""
                            )}
                        </p>

                        <small>
                            Redeemed on ${redemptionDate}
                        </small>
                    </div>

                    <div class="redemption-card-right">
                        <span class="redemption-points">
                            ${redemption.PointsUsed} points
                        </span>

                        <span class="redemption-status ${status === "Collected"
                            ? "collected"
                            : "pending"}">
                            ${escapeHtml(status)}
                        </span>
                    </div>
                </article>
            `;
        })
        .join("");
}

function showRewardMessage(message, type) {
    const element =
        document.getElementById("reward-message");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className =
        `reward-toast ${type}`;

    setTimeout(() => {
        element.classList.add("hidden");
    }, 3500);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeForAttribute(value) {
    return String(value ?? "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
}