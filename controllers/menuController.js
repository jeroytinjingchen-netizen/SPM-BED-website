const sql = require("mssql");
const dbConfig = require("../dbConfig");

// ==========================================
// 1. GET: Fetch Menu Items by Stall ID
// ==========================================
exports.getMenuByStall = async (req, res, next) => {
    const { stall_id } = req.params;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("VendorId", sql.Int, stall_id)
            .query("SELECT * FROM MenuItem WHERE vendor_id = @VendorId");

        res.status(200).json(result.recordset);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 2. GET: Search Menu Items by Keyword
// ==========================================
exports.searchMenu = async (req, res, next) => {
    const q = req.query.q || "";

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("SearchQuery", sql.VarChar, `%${q}%`)
            .query("SELECT * FROM MenuItem WHERE item_name LIKE @SearchQuery OR description LIKE @SearchQuery");

        res.status(200).json(result.recordset);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 3. GET: View Individual Item Details
// ==========================================
exports.getItemDetails = async (req, res, next) => {
    const { item_id } = req.params;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("ItemId", sql.Int, item_id)
            .query("SELECT * FROM MenuItem WHERE ItemID = @ItemId");

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Menu item not found." });
        }

        res.status(200).json(result.recordset[0]);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 4. POST: Create New Menu Item (Full CRUD)
// ==========================================
exports.createMenuItem = async (req, res, next) => {
    const { vendor_id, item_name, description, price, availability } = req.body;

    if (!vendor_id || !item_name || price === undefined) {
        return res.status(400).json({ 
            message: "vendor_id, item_name, and price are required fields." 
        });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("VendorId", sql.Int, vendor_id)
            .input("ItemName", sql.VarChar(100), item_name)
            .input("Desc", sql.Text, description || null)
            .input("Price", sql.Decimal(10, 2), price)
            .input("Available", sql.Bit, availability ?? 1)
            .query(`
                INSERT INTO dbo.MenuItem (vendor_id, item_name, description, price, availability)
                VALUES (@VendorId, @ItemName, @Desc, @Price, @Available);
                SELECT SCOPE_IDENTITY() AS new_id;
            `);

        res.status(201).json({
            message: "Menu item created successfully!",
            newItemId: result.recordset[0].new_id
        });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 5. PUT: Update Existing Menu Item Details
// ==========================================
exports.updateMenuItem = async (req, res, next) => {
    const { item_id } = req.params;
    const { item_name, description, price, availability } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("ItemId", sql.Int, item_id)
            .input("ItemName", sql.VarChar(100), item_name)
            .input("Desc", sql.Text, description)
            .input("Price", sql.Decimal(10, 2), price)
            .input("Available", sql.Bit, availability)
            .query(`
                UPDATE dbo.MenuItem 
                SET item_name = @ItemName, 
                    description = @Desc, 
                    price = @Price, 
                    availability = @Available
                WHERE ItemID = @ItemId
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "Menu item not found." });
        }

        res.status(200).json({ message: "Menu item updated successfully." });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 6. DELETE: Delete a Menu Item (Full CRUD)
// ==========================================
exports.deleteMenuItem = async (req, res, next) => {
    const { item_id } = req.params;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("ItemId", sql.Int, item_id)
            .query("DELETE FROM dbo.MenuItem WHERE ItemID = @ItemId");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "Menu item not found." });
        }

        res.status(200).json({ message: "Menu item deleted successfully." });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 7. GET: 3rd-Party API Currency Conversion
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