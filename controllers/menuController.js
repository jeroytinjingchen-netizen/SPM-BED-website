const sql = require('mssql');
const dbConfig = require('../dbConfig'); 

// 1. GET: View Menu by Vendor/Stall ID
exports.getMenuByStall = async (req, res, next) => {
  const { stall_id } = req.params;

  try {
    const pool = await sql.connect(dbConfig); 
    const result = await pool.request()
      .input('VendorId', sql.Int, stall_id) // Mapping param to an Integer
      // Targets the exact column 'vendor_id' inside the 'MenuItems' table
      .query('SELECT * FROM MenuItems WHERE vendor_id = @VendorId'); 

    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
};

// 2. GET: Search Menu Items by Keyword
exports.searchMenu = async (req, res, next) => {
  const { q } = req.query;

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('SearchQuery', sql.VarChar, `%${q}%`)
      .query('SELECT * FROM MenuItems WHERE item_name LIKE @SearchQuery OR description LIKE @SearchQuery');

    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
};

// 3. GET: View Individual Menu Item Details
exports.getItemDetails = async (req, res, next) => {
  const { item_id } = req.params; 

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('ItemId', sql.Int, item_id)
      .query('SELECT * FROM MenuItems WHERE id = @ItemId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    res.status(200).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
};

// 4. PUT: Update Menu Item Details (Your Checkpoint Feature!)
exports.updateMenuItem = async (req, res, next) => {
  const { item_id } = req.params; 
  const { item_name, description, price, availability } = req.body;

  // Validation checking matching the correct keys
  if (!item_name || price === undefined || availability === undefined) {
    return res.status(400).json({ 
      message: "item_name, price, and availability are required fields." 
    });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('ItemId', sql.Int, item_id)
      .input('ItemName', sql.VarChar(100), item_name)
      .input('Desc', sql.Text, description || null)
      .input('Price', sql.Decimal(10, 2), price)
      .input('Available', sql.Bit, availability)
      .query(`
        UPDATE MenuItems 
        SET item_name = @ItemName, description = @Desc, price = @Price, availability = @Available 
        WHERE id = @ItemId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    res.status(200).json({ 
      message: "Menu item updated successfully!",
      updatedItem: { id: item_id, item_name, description, price, availability }
    });
  } catch (err) {
    next(err);
  }
};