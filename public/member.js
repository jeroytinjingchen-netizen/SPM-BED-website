console.log("member.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    const redeemForm = document.getElementById("redeem-form");
    const redeemInput = document.getElementById("points-to-redeem");

    loadMemberLoyalty();

    if (redeemInput) {
        redeemInput.addEventListener("input", updateRedeemPreview);
    }

    if (redeemForm) {
        redeemForm.addEventListener("submit", redeemPoints);
    }
});

function getAuthData() {
    const savedAuth = localStorage.getItem("hawkerhub-auth");

    if (!savedAuth) {
        return null;
    }

    try {
        return JSON.parse(savedAuth);
    } catch (error) {
        console.error("Invalid login data:", error);
        return null;
    }
}

async function loadMemberLoyalty() {
    const authData = getAuthData();

    if (!authData?.token) {
        alert("Please log in first.");
        window.location.href = "Index.html";
        return;
    }

    try {
        const response = await fetch("/api/loyalty/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${authData.token}`
            }
        });

        const data = await response.json();

        console.log("Loyalty API response:", data);

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "Unable to load loyalty information."
            );
        }

        updateMemberPage(data, authData);

    } catch (error) {
        console.error("Load loyalty error:", error);
        showMessage(error.message, "error");
    }
}

function updateMemberPage(data, authData) {
    const points = Number(data.points ?? 0);

    const lifetimePointsEarned = Number(
        data.lifetimePointsEarned ?? 0
    );

    const status = data.status || "Bronze";

    const memberName =
        authData.customer?.name ||
        authData.customer?.custName ||
        authData.customer?.CustName ||
        "Member";

    setText("member-name", memberName);
    setText("member-points", points);
    setText("member-lifetime-points", lifetimePointsEarned);
    setText("member-tier", status);
    setText(
        "member-discount-value",
        `$${(points / 10).toFixed(2)}`
    );

    const nextTierInfo =
        getNextTierInformation(lifetimePointsEarned);

    setText("next-tier", nextTierInfo.nextTier);
    setText("next-tier-progress", nextTierInfo.message);

    updateProgressBar(lifetimePointsEarned, status);
    updateTierIcon(status);

    document
        .querySelectorAll(".member-tier-row")
        .forEach((row) => {
            row.classList.toggle(
                "active",
                row.dataset.tier === status
            );
        });

    const redeemInput =
        document.getElementById("points-to-redeem");

    if (redeemInput) {
        redeemInput.max = points;

        if (points < 10) {
            redeemInput.disabled = true;
            redeemInput.placeholder = "Not enough points to redeem";
        } else {
            redeemInput.disabled = false;
            redeemInput.placeholder = "Enter 10, 20, 30...";
        }
    }

    const redeemButton =
        document.getElementById("redeem-button");

    if (redeemButton) {
        redeemButton.disabled = points < 10;
    }
}

function setText(elementID, value) {
    const element = document.getElementById(elementID);

    if (element) {
        element.textContent = value;
    }
}

function getNextTierInformation(lifetimePointsEarned) {
    if (lifetimePointsEarned < 100) {
        return {
            nextTier: "Silver",
            message:
                `${100 - lifetimePointsEarned} more points needed`
        };
    }

    if (lifetimePointsEarned < 300) {
        return {
            nextTier: "Gold",
            message:
                `${300 - lifetimePointsEarned} more points needed`
        };
    }

    if (lifetimePointsEarned < 600) {
        return {
            nextTier: "Platinum",
            message:
                `${600 - lifetimePointsEarned} more points needed`
        };
    }

    return {
        nextTier: "Highest Tier",
        message: "You have reached Platinum"
    };
}

function updateProgressBar(lifetimePointsEarned, status) {
    const progressBar =
        document.getElementById("member-progress-bar");

    const progressText =
        document.getElementById("member-progress-text");

    const progressDescription =
        document.getElementById("member-progress-description");

    if (!progressBar || !progressText || !progressDescription) {
        return;
    }

    let tierStart = 0;
    let nextTarget = 100;
    let nextTier = "Silver";

    if (status === "Silver") {
        tierStart = 100;
        nextTarget = 300;
        nextTier = "Gold";
    } else if (status === "Gold") {
        tierStart = 300;
        nextTarget = 600;
        nextTier = "Platinum";
    } else if (status === "Platinum") {
        progressBar.style.width = "100%";
        progressText.textContent =
            `${lifetimePointsEarned} lifetime points`;

        progressDescription.textContent =
            "You have reached the highest membership tier.";

        return;
    }

    const progressPercentage =
        ((lifetimePointsEarned - tierStart) /
            (nextTarget - tierStart)) *
        100;

    const safeProgress = Math.max(
        0,
        Math.min(100, progressPercentage)
    );

    progressBar.style.width = `${safeProgress}%`;

    progressText.textContent =
        `${lifetimePointsEarned} / ${nextTarget}`;

    progressDescription.textContent =
        `Keep earning points to reach ${nextTier}.`;
}

function updateTierIcon(status) {
    const tierIcon =
        document.getElementById("member-tier-icon");

    if (!tierIcon) {
        return;
    }

    const tierIcons = {
        Bronze: "🥉",
        Silver: "🥈",
        Gold: "🥇",
        Platinum: "💎"
    };

    tierIcon.textContent =
        tierIcons[status] || "🥉";
}

function updateRedeemPreview() {
    const redeemInput =
        document.getElementById("points-to-redeem");

    const preview =
        document.getElementById("redeem-preview");

    if (!redeemInput || !preview) {
        return;
    }

    const points = Number(redeemInput.value || 0);

    preview.textContent =
        `$${(points / 10).toFixed(2)}`;
}

async function redeemPoints(event) {
    event.preventDefault();

    const authData = getAuthData();

    if (!authData?.token) {
        alert("Please log in first.");
        window.location.href = "Index.html";
        return;
    }

    const redeemInput =
        document.getElementById("points-to-redeem");

    const redeemButton =
        document.getElementById("redeem-button");

    const pointsToRedeem = Number(
        redeemInput?.value || 0
    );

    if (
        !Number.isInteger(pointsToRedeem) ||
        pointsToRedeem <= 0
    ) {
        showMessage(
            "Please enter a valid number of points.",
            "error"
        );
        return;
    }

    if (pointsToRedeem % 10 !== 0) {
        showMessage(
            "Points must be redeemed in multiples of 10.",
            "error"
        );
        return;
    }

    if (redeemButton) {
        redeemButton.disabled = true;
        redeemButton.textContent = "Redeeming...";
    }

    try {
        const response = await fetch("/api/loyalty/redeem", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authData.token}`
            },
            body: JSON.stringify({
                pointsToRedeem
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "Unable to redeem points."
            );
        }

        showMessage(
            `${data.pointsRedeemed} points redeemed. ` +
            `Discount value: $${Number(
                data.discountValue
            ).toFixed(2)}.`,
            "success"
        );

        if (redeemInput) {
            redeemInput.value = "";
        }

        updateRedeemPreview();
        await loadMemberLoyalty();

    } catch (error) {
        console.error("Redeem points error:", error);
        showMessage(error.message, "error");

    } finally {
        if (redeemButton) {
            redeemButton.disabled = false;
            redeemButton.textContent = "Redeem Points";
        }
    }
}

function showMessage(message, type) {
    const messageElement =
        document.getElementById("member-message");

    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;
    messageElement.className =
        `member-message ${type}`;
}