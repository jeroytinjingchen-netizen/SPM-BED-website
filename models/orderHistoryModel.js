const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function getCustomerOrderHistory(customerId) {
  const pool = await sql.connect(dbConfig);
  const result = await pool.request()
    .input('customerId', sql.Char(9), customerId)
    .query(`
      SELECT
        o.OrderID,
        o.OrderDate,
        o.PmtType,
        o.CustomerID,
        oi.OrderItemNo,
        oi.StallID,
        oi.ItemCode,
        oi.Quantity,
        oi.UnitPrice,
        mi.ItemDesc
      FROM dbo.CustOrder o
      LEFT JOIN dbo.OrderItem oi ON oi.OrderID = o.OrderID
      LEFT JOIN dbo.MenuItem mi ON mi.StallID = oi.StallID AND mi.ItemCode = oi.ItemCode
      WHERE o.CustomerID = @customerId
      ORDER BY o.OrderDate DESC, o.OrderID DESC, oi.OrderItemNo
    `);

  return result.recordset;
}

module.exports = {
  getCustomerOrderHistory
};
