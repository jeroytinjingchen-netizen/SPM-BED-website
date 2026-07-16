const likeModel = require("../models/likeModel");

// POST /api/likes/toggle
async function toggleLike(req, res) {
  try {
    const { customerId, stallId, itemCode } = req.body;

    if (!customerId || !stallId || !itemCode) {
      return res.status(400).json({
        message: "customerId, stallId and itemCode are required"
      });
    }

    const customer = await likeModel.getCustomer(customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    const menuItem = await likeModel.getMenuItem(stallId, itemCode);

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found"
      });
    }

    const result = await likeModel.toggleLike(
      customerId,
      stallId,
      itemCode
    );

    return res.status(200).json({
      message: result.liked
        ? "Menu item liked successfully"
        : "Menu item unliked successfully",
      customerId,
      stallId,
      itemCode,
      liked: result.liked,
      likeCount: result.likeCount
    });
  } catch (error) {
    console.error("Controller toggleLike error:", error);

    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({
        message: "Customer has already liked this item"
      });
    }

    if (error.number === 547) {
      return res.status(400).json({
        message: "Invalid customer or menu item"
      });
    }

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

// GET /api/likes/status/:customerId/:stallId/:itemCode
async function getLikeStatus(req, res) {
  try {
    const { customerId, stallId, itemCode } = req.params;

    const existingLike = await likeModel.getLike(
      customerId,
      stallId,
      itemCode
    );

    const likeCount = await likeModel.getLikeCount(
      stallId,
      itemCode
    );

    return res.status(200).json({
      customerId,
      stallId,
      itemCode,
      liked: Boolean(existingLike),
      likeCount
    });
  } catch (error) {
    console.error("Controller getLikeStatus error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

// GET /api/likes/count/:stallId/:itemCode
async function getLikeCount(req, res) {
  try {
    const { stallId, itemCode } = req.params;

    const menuItem = await likeModel.getMenuItem(
      stallId,
      itemCode
    );

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found"
      });
    }

    const likeCount = await likeModel.getLikeCount(
      stallId,
      itemCode
    );

    return res.status(200).json({
      stallId,
      itemCode,
      likeCount
    });
  } catch (error) {
    console.error("Controller getLikeCount error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

// GET /api/customers/:customerId/likes
async function getCustomerLikes(req, res) {
  try {
    const { customerId } = req.params;

    const customer = await likeModel.getCustomer(customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    const likes = await likeModel.getCustomerLikes(customerId);

    return res.status(200).json(likes);
  } catch (error) {
    console.error("Controller getCustomerLikes error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

module.exports = {
  toggleLike,
  getLikeStatus,
  getLikeCount,
  getCustomerLikes
};