const rewardModel = require("../models/rewardModel");

// Get all active rewards available for redemption
async function getRewards(req, res) {
    try {
        const rewards = await rewardModel.getAllRewards();

        return res.status(200).json({
            message: "Rewards retrieved successfully.",
            rewards
        });

    } catch (error) {
        console.error("Get rewards error:", error);

        return res.status(500).json({
            message: "Unable to retrieve rewards.",
            error: error.message
        });
    }
}

// Redeem a reward for the logged-in customer and return the redemption details
async function redeemReward(req, res) {
    try {
        const customerID =
            req.customer?.customerId ||
            req.customer?.customerID;

        const rewardID = Number(req.params.rewardId);

        if (!customerID) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        if (!Number.isInteger(rewardID) || rewardID <= 0) {
            return res.status(400).json({
                message: "A valid rewardId is required."
            });
        }

        const result = await rewardModel.redeemReward(
            customerID,
            rewardID
        );

        return res.status(200).json({
            message: "Reward redeemed successfully.",
            redemptionID: result.redemption.RedemptionID,
            rewardName: result.reward.RewardName,
            pointsUsed: Number(result.redemption.PointsUsed),
            remainingPoints: Number(result.loyalty.Points),
            lifetimePointsEarned:
                Number(result.loyalty.LifetimePointsEarned),
            status: result.redemption.Status,
            collectionMessage:
                "Please collect your reward at the SG Hawker Management customer service counter."
        });

    } catch (error) {
        console.error("Redeem reward error:", error);

        const knownMessages = [
            "Reward is unavailable.",
            "Reward is out of stock.",
            "Loyalty account not found.",
            "You do not have enough loyalty points."
        ];

        const statusCode =
            knownMessages.includes(error.message) ? 400 : 500;

        return res.status(statusCode).json({
            message:
                statusCode === 400
                    ? error.message
                    : "Unable to redeem reward.",
            error: error.message
        });
    }
}

// Get all redemptions for the logged-in customer
async function getMyRedemptions(req, res) {
    try {
        const customerID =
            req.customer?.customerId ||
            req.customer?.customerID;

        if (!customerID) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        const redemptions =
            await rewardModel.getRedemptionsByCustomer(customerID);

        return res.status(200).json({
            message: "Reward redemptions retrieved successfully.",
            redemptions
        });

    } catch (error) {
        console.error("Get reward redemptions error:", error);

        return res.status(500).json({
            message: "Unable to retrieve reward redemptions.",
            error: error.message
        });
    }
}


async function updateRewardStatus(req, res) {
    try {
        const redemptionID = Number(
            req.params.redemptionId
        );

        const status = req.body.status;

        if (
            !Number.isInteger(redemptionID) ||
            redemptionID <= 0
        ) {
            return res.status(400).json({
                message: "A valid redemptionId is required."
            });
        }

        const allowedStatuses = [
            "Pending Collection",
            "Collected"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message:
                    "Status must be 'Pending Collection' or 'Collected'."
            });
        }

        const updated =
            await rewardModel.updateRewardStatus(
                redemptionID,
                status
            );

        if (!updated) {
            return res.status(404).json({
                message: "Reward redemption not found."
            });
        }

        return res.status(200).json({
            message:
                "Reward collection status updated successfully.",
            redemption: updated
        });

    } catch (error) {
        console.error(
            "Update reward status error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to update reward collection status.",
            error: error.message
        });
    }
}

module.exports = {
    getRewards,
    redeemReward,
    getMyRedemptions,
    updateRewardStatus
};