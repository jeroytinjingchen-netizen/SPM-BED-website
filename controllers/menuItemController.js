const MenuItem = require("../models/MenuItem");

const getMenu = async (req, res) => {
    try {
        const stallId = req.params.stallId;
        const menu = await MenuItem.getMenuByStall(stallId);
        res.status(200).json(menu);
    } catch (error) {
        console.error("Error retrieving menu:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const addMenu = async (req, res) => {
    try {
        const stallId = req.params.stallId;
        const { ItemCode, ItemDesc, ItemPrice, ItemCategory, IsSpecial } = req.body;

        // Basic Validation
        if (!ItemCode || !ItemDesc || !ItemPrice || !ItemCategory) {
            return res.status(400).json({ error: "All fields are required." });
        }

        await MenuItem.addMenuItem(stallId, ItemCode, ItemDesc, ItemPrice, ItemCategory, IsSpecial ? 1 : 0);
        res.status(201).json({ message: "Menu item successfully added." });
    } catch (error) {
        console.error("Error adding menu item:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const deleteMenu = async (req, res) => {
    try {
        const stallId = req.params.stallId;
        const itemCode = req.params.itemCode;

        if (!stallId || !itemCode) {
            return res.status(400).json({ error: "Both Stall ID and Item Code are required." });
        }

        const isDeleted = await MenuItem.deleteMenuItem(stallId, itemCode);

        if (isDeleted) {
            res.status(200).json({ message: "Menu item successfully deleted." });
        } else {
            res.status(404).json({ error: "Menu item not found or already deleted." });
        }
    } catch (error) {
        console.error("Error deleting menu item:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const updateMenu = async (req, res) => {
    try {
        const stallId = req.params.stallId;
        const itemCode = req.params.itemCode;
        const { ItemDesc, ItemPrice, ItemCategory, IsSpecial } = req.body;

        if (!ItemDesc || !ItemPrice || !ItemCategory) {
            return res.status(400).json({ error: "Description, Price, and Category are required." });
        }

        const isUpdated = await MenuItem.updateMenuItem(stallId, itemCode, ItemDesc, ItemPrice, ItemCategory, IsSpecial ? 1 : 0);

        if (isUpdated) {
            res.status(200).json({ message: "Menu item successfully updated." });
        } else {
            res.status(404).json({ error: "Menu item not found." });
        }
    } catch (error) {
        console.error("Error updating menu item:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const toggleMenu = async (req, res) => {
    try {
        const stallId = req.params.stallId;
        const itemCode = req.params.itemCode;

        const isToggled = await MenuItem.toggleMenuItem(stallId, itemCode);

        if (isToggled) {
            res.status(200).json({ message: "Stock status successfully toggled." });
        } else {
            res.status(404).json({ error: "Menu item not found." });
        }
    } catch (error) {
        console.error("Error toggling menu item:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { getMenu, addMenu, deleteMenu, updateMenu, toggleMenu };