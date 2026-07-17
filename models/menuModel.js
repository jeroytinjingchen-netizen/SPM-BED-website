const { poolPromise, sql } = require('../dbConfig');

class MenuItem {
  // Model method to fetch item details from the DB
  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ItemId', sql.Int, id)
      .query('SELECT * FROM MenuItems WHERE id = @ItemId');
    return result.recordset[0];
  }

  // Model method to insert a new item into the DB
  static async create(itemData) {
    const pool = await poolPromise;
    await pool.request()
      .input('StallId', sql.Int, itemData.stall_id)
      .input('Name', sql.VarChar, itemData.name)
      .input('Desc', sql.Text, itemData.description)
      .input('Price', sql.Decimal(10, 2), itemData.price)
      .query(`INSERT INTO MenuItems (stall_id, name, description, price) 
              VALUES (@StallId, @Name, @Desc, @Price)`);
  }
}

module.exports = MenuItem;