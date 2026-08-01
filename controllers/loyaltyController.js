const loyaltyModel = require("../models/loyaltyModel");

function getMemberStatus(lifetimePointsEarned) {
    if (lifetimePointsEarned >= 600) return "Platinum";
    if (lifetimePointsEarned >= 300) return "Gold";
    if (lifetimePointsEarned >= 100) return "Silver";
    return "Bronze";
}

// GET /api/loyalty/me
async function getMyLoyalty(req, res) {
    try {
        const customerID =
            req.customer?.customerId ||
            req.customer?.customerID;

        if (!customerID) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        let loyalty = await loyaltyModel.getPoints(customerID);

        if (!loyalty) {
            loyalty = await loyaltyModel.createLoyaltyAccount(customerID);
        }

        const points = Number(loyalty.Points || 0);

        const lifetimePointsEarned = Number(
            loyalty.LifetimePointsEarned || 0
        );

        return res.status(200).json({
            customerID,
            points,
            lifetimePointsEarned,
            status: getMemberStatus(lifetimePointsEarned)
        });

    } catch (error) {
        console.error("Get loyalty error:", error);

        return res.status(500).json({
            message: "Unable to retrieve loyalty information.",
            error: error.message
        });
    }
}

// POST /api/loyalty/add
async function addPoints(req, res) {
    try {
        const customerID =
            req.customer?.customerId ||
            req.customer?.customerID;

        const pointsToAdd = Number(req.body.points);

        if (!customerID) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        if (
            !Number.isInteger(pointsToAdd) ||
            pointsToAdd <= 0
        ) {
            return res.status(400).json({
                message: "Points must be a positive whole number."
            });
        }

        const updated = await loyaltyModel.addPoints(
            customerID,
            pointsToAdd
        );

        const totalPoints = Number(updated.Points || 0);

        const lifetimePointsEarned = Number(
            updated.LifetimePointsEarned || 0
        );

        return res.status(200).json({
            message: "Loyalty points added successfully.",
            pointsAdded: pointsToAdd,
            totalPoints,
            lifetimePointsEarned,
            status: getMemberStatus(lifetimePointsEarned)
        });

    } catch (error) {
        console.error("Add points error:", error);

        return res.status(500).json({
            message: "Unable to add loyalty points.",
            error: error.message
        });
    }
}

// PUT /api/loyalty/redeem
async function redeemPoints(req, res) {
    try {
        const customerID =
            req.customer?.customerId ||
            req.customer?.customerID;

        const pointsToRedeem = Number(
            req.body.pointsToRedeem
        );

        if (!customerID) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        if (
            !Number.isInteger(pointsToRedeem) ||
            pointsToRedeem <= 0
        ) {
            return res.status(400).json({
                message:
                    "pointsToRedeem must be a positive whole number."
            });
        }

        if (pointsToRedeem % 10 !== 0) {
            return res.status(400).json({
                message:
                    "Points must be redeemed in multiples of 10."
            });
        }

        const updated = await loyaltyModel.redeemPoints(
            customerID,
            pointsToRedeem
        );

        if (!updated) {
            return res.status(400).json({
                message:
                    "You do not have enough loyalty points."
            });
        }

        const remainingPoints = Number(
            updated.Points || 0
        );

        const lifetimePointsEarned = Number(
            updated.LifetimePointsEarned || 0
        );

        return res.status(200).json({
            message: "Points redeemed successfully.",
            pointsRedeemed: pointsToRedeem,
            discountValue: pointsToRedeem / 10,
            remainingPoints,
            lifetimePointsEarned,
            status: getMemberStatus(lifetimePointsEarned)
        });

    } catch (error) {
        console.error("Redeem points error:", error);

        return res.status(500).json({
            message: "Unable to redeem loyalty points.",
            error: error.message
        });
    }
}

module.exports = {
    getMyLoyalty,
    addPoints,
    redeemPoints
};