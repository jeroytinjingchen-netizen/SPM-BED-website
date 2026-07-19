const likeModel = require("../models/likeModel");

/*
    GET /api/likes/:customerID
*/
async function getCustomerLikes(req, res) {
    try {
        const { customerID } = req.params;

        if (!customerID) {
            return res.status(400).json({
                message: "customerID is required."
            });
        }

        const likes = await likeModel.getLikesByCustomer(customerID);

        return res.status(200).json({
            message: "Liked menu items retrieved successfully.",
            totalLikes: likes.length,
            likes
        });

    } catch (error) {
        console.error("Get customer likes error:", error);

        return res.status(500).json({
            message: "Unable to retrieve liked menu items.",
            error: error.message
        });
    }
}

/*
    POST /api/likes
*/
async function createLike(req, res) {
    try {
        const {
            customerID,
            stallID,
            itemCode
        } = req.body;

        if (!customerID || !stallID || !itemCode) {
            return res.status(400).json({
                message:
                    "customerID, stallID and itemCode are required."
            });
        }

        const existingLike = await likeModel.getLike(
            customerID,
            stallID,
            itemCode
        );

        if (existingLike) {
            return res.status(409).json({
                message: "This menu item is already liked."
            });
        }

        const newLike = await likeModel.createLike(
            customerID,
            stallID,
            itemCode
        );

        return res.status(201).json({
            message: "Menu item liked successfully.",
            like: newLike
        });

    } catch (error) {
        console.error("Create like error:", error);

        return res.status(500).json({
            message: "Unable to like menu item.",
            error: error.message
        });
    }
}

/*
    DELETE /api/likes/:customerID/:stallID/:itemCode
*/
async function deleteLike(req, res) {
    try {
        const {
            customerID,
            stallID,
            itemCode
        } = req.params;

        const deleted = await likeModel.deleteLike(
            customerID,
            stallID,
            itemCode
        );

        if (!deleted) {
            return res.status(404).json({
                message: "Liked menu item was not found."
            });
        }

        return res.status(200).json({
            message: "Menu item removed from favourites successfully."
        });

    } catch (error) {
        console.error("Delete like error:", error);

        return res.status(500).json({
            message: "Unable to remove liked menu item.",
            error: error.message
        });
    }
}

/*
    POST /api/likes/toggle
    Adds the like if it does not exist.
    Removes it if it already exists.
*/
async function toggleLike(req, res) {
    try {
        const {
            customerID,
            stallID,
            itemCode
        } = req.body;

        if (!customerID || !stallID || !itemCode) {
            return res.status(400).json({
                message:
                    "customerID, stallID and itemCode are required."
            });
        }

        const existingLike = await likeModel.getLike(
            customerID,
            stallID,
            itemCode
        );

        if (existingLike) {
            await likeModel.deleteLike(
                customerID,
                stallID,
                itemCode
            );

            return res.status(200).json({
                message: "Menu item removed from favourites.",
                liked: false
            });
        }

        const newLike = await likeModel.createLike(
            customerID,
            stallID,
            itemCode
        );

        return res.status(201).json({
            message: "Menu item added to favourites.",
            liked: true,
            like: newLike
        });

    } catch (error) {
        console.error("Toggle like error:", error);

        return res.status(500).json({
            message: "Unable to update favourite.",
            error: error.message
        });
    }
}

module.exports = {
    getCustomerLikes,
    createLike,
    deleteLike,
    toggleLike
};