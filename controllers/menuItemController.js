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
        const { ItemCode, ItemDesc, ItemPrice, ItemCategory } = req.body;

        // Basic Validation
        if (!ItemCode || !ItemDesc || !ItemPrice || !ItemCategory) {
            return res.status(400).json({ error: "All fields are required." });
        }

        await MenuItem.addMenuItem(stallId, ItemCode, ItemDesc, ItemPrice, ItemCategory);
        res.status(201).json({ message: "Menu item successfully added." });
    } catch (error) {
        console.error("Error adding menu item:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { getMenu, addMenu };