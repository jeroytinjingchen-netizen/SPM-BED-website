const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Public Read Operations
router.get("/search", menuController.searchMenu);
router.get("/stall/:stall_id", menuController.getMenuByStall);
router.get("/item/:item_id", menuController.getItemDetails);
router.get("/convert", menuController.convertPrice); // 3rd-Party API Integration

// Protected Write Operations (Full CRUD)
router.post("/item", verifyToken, menuController.createMenuItem);
router.put("/item/:item_id", verifyToken, menuController.updateMenuItem);
router.delete("/item/:item_id", verifyToken, menuController.deleteMenuItem);

module.exports = router;