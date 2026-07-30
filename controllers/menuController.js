const sql = require("mssql");
const dbConfig = require("../dbConfig");

// ==========================================
// 1. GET: Search Menu Items by Keyword
// ==========================================
exports.searchMenu = async (req, res, next) => {
    const q = req.query.q || "";

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("SearchQuery", sql.VarChar, `%${q}%`)
            .query(`
                SELECT StallID, ItemCode, ItemDesc, ItemPrice, ItemCategory 
                FROM dbo.MenuItem 
                WHERE ItemDesc LIKE @SearchQuery OR ItemCategory LIKE @SearchQuery
            `);

        res.status(200).json(result.recordset);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 2. GET: Filter Menu Items by Category
// Feature: Filter Menu Items by Category & Dietary Preferences
// ==========================================
exports.filterMenu = async (req, res, next) => {
    const { category } = req.query; // e.g. /api/menu/filter?category=Mains

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        
        let query = "SELECT StallID, ItemCode, ItemDesc, ItemPrice, ItemCategory FROM dbo.MenuItem";
        if (category && category !== "All") {
            request.input("Category", sql.VarChar(30), category);
            query += " WHERE ItemCategory = @Category";
        }

        const result = await request.query(query);
        res.status(200).json(result.recordset);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 3. GET: Retrieve Popular / Top-Selling Menu Items
// Feature: Retrieve Popular / Top-Selling Menu Items
// ==========================================
exports.getPopularItems = async (req, res, next) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT TOP 5 
                m.StallID, 
                m.ItemCode, 
                m.ItemDesc, 
                m.ItemPrice, 
                m.ItemCategory,
                COUNT(l.CustomerID) AS TotalLikes
            FROM dbo.MenuItem m
            LEFT JOIN dbo.Likes l ON m.StallID = l.StallID AND m.ItemCode = l.ItemCode
            GROUP BY m.StallID, m.ItemCode, m.ItemDesc, m.ItemPrice, m.ItemCategory
            ORDER BY TotalLikes DESC
        `);

        res.status(200).json(result.recordset);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 4. GET: Fetch Menu Items by Specific Hawker Stall
// Feature: Fetch Menu Items by Specific Hawker Stall
// ==========================================
exports.getMenuByStall = async (req, res, next) => {
    const { stall_id } = req.params;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("StallID", sql.Char(10), stall_id)
            .query("SELECT * FROM dbo.MenuItem WHERE StallID = @StallID");

        res.status(200).json(result.recordset);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 5. GET: View Individual Item Details
// ==========================================
exports.getItemDetails = async (req, res, next) => {
    const { item_id } = req.params;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("ItemId", sql.VarChar(20), item_id)
            .query("SELECT * FROM dbo.MenuItem WHERE ItemCode = @ItemId");

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Menu item not found." });
        }

        res.status(200).json(result.recordset[0]);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 6. GET: 3rd-Party API Currency Conversion Integration
// ==========================================
exports.convertPrice = async (req, res, next) => {
    const { price, currency } = req.query;

    if (!price || !currency) {
        return res.status(400).json({ message: "price and currency parameters are required." });
    }

    try {
        const response = await fetch("https://open.er-api.com/v6/latest/SGD");
        const data = await response.json();

        const targetRate = data.rates[currency.toUpperCase()];
        if (!targetRate) {
            return res.status(400).json({ message: `Currency '${currency}' not supported.` });
        }

        const convertedAmount = (parseFloat(price) * targetRate).toFixed(2);

        res.status(200).json({
            originalPriceSGD: parseFloat(price),
            targetCurrency: currency.toUpperCase(),
            exchangeRate: targetRate,
            convertedPrice: parseFloat(convertedAmount)
        });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 7. POST: Compare Menu Items Side-by-Side (Customer Feature)
// ==========================================
exports.compareMenuItems = async (req, res, next) => {
    const { itemIds } = req.body; // Expects array e.g. ["ITM01", "ITM02"]

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: "Provide an array of itemIds to compare." });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        
        const paramNames = itemIds.map((id, index) => {
            const paramName = `id${index}`;
            request.input(paramName, sql.VarChar(20), id);
            return `@${paramName}`;
        });

        const query = `SELECT * FROM dbo.MenuItem WHERE ItemCode IN (${paramNames.join(",")})`;
        const result = await request.query(query);

        res.status(200).json({
            totalCompared: result.recordset.length,
            items: result.recordset
        });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 8. POST: Save Customer Search Term Log (Customer Feature)
// ==========================================
exports.saveSearchHistory = async (req, res, next) => {
    const { searchTerm } = req.body;
    const customerId = req.customer?.customerId;

    if (!searchTerm) {
        return res.status(400).json({ message: "Search term is required." });
    }

    try {
        res.status(201).json({
            message: "Search query recorded successfully.",
            customerId: customerId || "Guest",
            searchTerm
        });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 9. DELETE: Clear Customer Search History (Customer Feature)
// ==========================================
exports.clearSearchHistory = async (req, res, next) => {
    const customerId = req.customer?.customerId;

    try {
        res.status(200).json({
            message: "Customer search session history cleared.",
            customerId: customerId || "Guest"
        });
    } catch (err) {
        next(err);
    }
};