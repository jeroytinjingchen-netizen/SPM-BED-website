const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ==========================================
// 1. PUBLIC READ OPERATIONS (Customer Browsing)
// ==========================================
router.get("/search", menuController.searchMenu);
router.get("/filter", menuController.filterMenu);
router.get("/popular", menuController.getPopularItems);
router.get("/stall/:stall_id", menuController.getMenuByStall);
router.get("/item/:item_id", menuController.getItemDetails);
router.get("/convert", menuController.convertPrice);

// ==========================================
// 2. CUSTOMER WRITE/DELETE OPERATIONS
// ==========================================

// POST: Save a recent search term for the customer
router.post("/search-history", verifyToken, menuController.saveSearchHistory);

// POST: Compare multiple menu items side-by-side
router.post("/compare", menuController.compareMenuItems);

// DELETE: Clear a customer's saved menu search history
router.delete("/search-history", verifyToken, menuController.clearSearchHistory);

module.exports = router;