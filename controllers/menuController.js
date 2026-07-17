const { poolPromise, sql } = require('../dbConfig');

// FEATURE 1: View Menu
exports.getMenuByStall = async (req, res, next) => {
  const { stall_id } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('StallId', sql.Int, stall_id)
      .query('SELECT * FROM MenuItems WHERE stall_id = @StallId');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
};

// FEATURE 2: Search Menu
exports.searchMenu = async (req, res, next) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: 'Search query parameter "q" is required.' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('SearchTerm', sql.VarChar, `%${q}%`)
      .query('SELECT * FROM MenuItems WHERE name LIKE @SearchTerm OR description LIKE @SearchTerm');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
};

// FEATURE 3: View Menu Item Details
exports.getItemDetails = async (req, res, next) => {
  const { item_id } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ItemId', sql.Int, item_id)
      .query('SELECT * FROM MenuItems WHERE id = @ItemId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }
    res.status(200).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
};

// MANDATORY CHECKPOINT ADDITION: Create Menu Item (POST requirement)
exports.createMenuItem = async (req, res, next) => {
  const { stall_id, name, description, price, availability } = req.body;
  if (!stall_id || !name || !price) {
    return res.status(400).json({ message: 'Stall ID, item name, and price are required.' });
  }
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('StallId', sql.Int, stall_id)
      .input('Name', sql.VarChar, name)
      .input('Desc', sql.Text, description)
      .input('Price', sql.Decimal(10, 2), price)
      .input('Available', sql.Bit, availability ?? 1)
      .query(`INSERT INTO MenuItems (stall_id, name, description, price, availability) 
              VALUES (@StallId, @Name, @Desc, @Price, @Available)`);
    res.status(201).json({ message: 'Menu item added successfully!' });
  } catch (err) {
    next(err);
  }
};