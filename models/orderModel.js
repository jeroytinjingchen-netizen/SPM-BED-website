const sql = require('mssql');
const dbConfig = require('../dbConfig');

function normalizeCheckoutItems(items = []) {
  return (items || []).map((it, index) => ({
    CartItemNo: index + 1,
    StallID: it.StallID || it.stallID || it.stallId || null,
    ItemCode: it.ItemCode || it.itemCode || it.itemcode || null,
    Quantity: Number(it.Quantity || it.quantity || 0),
    UnitPrice: Number(it.UnitPrice || it.unitPrice || it.price || 0)
  }));
}

async function generateNextOrderId() {
  const pool = await sql.connect(dbConfig);
  const result = await pool.request().query("SELECT MAX(OrderID) AS maxId FROM dbo.CustOrder");
  const maxId = result.recordset[0].maxId;
  let nextNumber = 1;
  if (maxId) nextNumber = parseInt(maxId.substring(3), 10) + 1;
  return 'ORD' + String(nextNumber).padStart(6, '0');
}

async function createOrderFromCart(cartId, customerId, paymentType = 'Cash', checkoutItems = []) {
  const pool = await sql.connect(dbConfig);
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();

    const orderId = await generateNextOrderId();

    const headerReq = tx.request();
    headerReq.input('orderId', sql.Char(9), orderId);
    headerReq.input('orderDate', sql.Date, new Date());
    headerReq.input('pmtType', sql.VarChar(20), paymentType || 'Cash');
    headerReq.input('customerId', sql.Char(9), customerId);
    await headerReq.query(`INSERT INTO dbo.CustOrder (OrderID, OrderDate, PmtType, CustomerID) VALUES (@orderId, @orderDate, @pmtType, @customerId)`);

    const normalizedItems = normalizeCheckoutItems(checkoutItems);
    const items = normalizedItems.length > 0 ? normalizedItems : (await tx.request()
      .input('cartId', sql.Char(9), cartId)
      .query('SELECT CartItemNo, StallID, ItemCode, Quantity, UnitPrice FROM dbo.CartItem WHERE CARTID=@cartId ORDER BY CartItemNo')).recordset || [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemReq = tx.request();
      itemReq.input('orderId', sql.Char(9), orderId);
      itemReq.input('no', sql.Int, it.CartItemNo || i + 1);
      itemReq.input('stallId', sql.Char(10), it.StallID || null);
      itemReq.input('itemCode', sql.VarChar(20), it.ItemCode || null);
      itemReq.input('qty', sql.Int, Number(it.Quantity || 0));
      itemReq.input('unitPrice', sql.Decimal(6, 2), Number(it.UnitPrice || 0));
      await itemReq.query('INSERT INTO dbo.OrderItem (OrderID, OrderItemNo, StallID, ItemCode, Quantity, UnitPrice) VALUES (@orderId, @no, @stallId, @itemCode, @qty, @unitPrice)');
    }

    await tx.request().input('cartId', sql.Char(9), cartId).query("DELETE FROM dbo.CartItem WHERE CARTID=@cartId");
    await tx.request().input('cartId', sql.Char(9), cartId).input('now', sql.DateTime, new Date()).query("UPDATE dbo.Cart SET CartStatus='Completed', UpdatedAt=@now WHERE CartID=@cartId");

    await tx.commit();
    return { orderId, itemsCount: items.length };
  } catch (err) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    console.error('createOrderFromCart error:', err);
    throw err;
  }
}

module.exports = {
  createOrderFromCart,
  normalizeCheckoutItems
};
