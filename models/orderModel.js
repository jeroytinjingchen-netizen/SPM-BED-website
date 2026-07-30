const sql = require('mssql');
const dbConfig = require('../dbConfig');

async function generateNextOrderId() {
  const pool = await sql.connect(dbConfig);
  const result = await pool.request().query("SELECT MAX(OrderID) AS maxId FROM dbo.CustOrder");
  const maxId = result.recordset[0].maxId;
  let nextNumber = 1;
  if (maxId) nextNumber = parseInt(maxId.substring(3), 10) + 1;
  return 'ORD' + String(nextNumber).padStart(6, '0');
}

async function createOrderFromCart(cartId, customerId, paymentType = 'Cash') {
  const pool = await sql.connect(dbConfig);
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();
    const request = tx.request();

    const itemsRes = await tx.request()
      .input('cartId', sql.Char(9), cartId)
      .query('SELECT CartItemNo, StallID, ItemCode, Quantity, UnitPrice FROM dbo.CartItem WHERE CARTID=@cartId ORDER BY CartItemNo');

    const items = itemsRes.recordset || [];
    if (items.length === 0) {
      throw new Error('Cannot create order from empty cart.');
    }

    const orderId = await generateNextOrderId();

    // Insert header
    request.input('orderId', sql.Char(9), orderId);
    request.input('orderDate', sql.Date, new Date());
    request.input('pmtType', sql.VarChar(20), paymentType);
    request.input('customerId', sql.Char(9), customerId);
    await request.query(`INSERT INTO dbo.CustOrder (OrderID, OrderDate, PmtType, CustomerID) VALUES (@orderId, @orderDate, @pmtType, @customerId)`);

    // Copy items from CartItem into OrderItem
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const req = tx.request();
      req.input('orderId', sql.Char(9), orderId);
      req.input('no', sql.Int, it.CartItemNo);
      req.input('stallId', sql.Char(10), it.StallID);
      req.input('itemCode', sql.VarChar(20), it.ItemCode);
      req.input('qty', sql.Int, it.Quantity);
      req.input('unitPrice', sql.Decimal(6,2), it.UnitPrice);
      await req.query('INSERT INTO dbo.OrderItem (OrderID, OrderItemNo, StallID, ItemCode, Quantity, UnitPrice) VALUES (@orderId, @no, @stallId, @itemCode, @qty, @unitPrice)');
    }

    // Mark cart as Completed and remove cart items
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

async function createOrderFromPayload(cartId, customerId, paymentType = 'Cash', items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cannot create order from empty payload items.');
  }

  const pool = await sql.connect(dbConfig);
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();
    const request = tx.request();
    const orderId = await generateNextOrderId();

    request.input('orderId', sql.Char(9), orderId);
    request.input('orderDate', sql.Date, new Date());
    request.input('pmtType', sql.VarChar(20), paymentType);
    request.input('customerId', sql.Char(9), customerId);
    await request.query(`INSERT INTO dbo.CustOrder (OrderID, OrderDate, PmtType, CustomerID) VALUES (@orderId, @orderDate, @pmtType, @customerId)`);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const req = tx.request();
      const stallId = (it.StallID || it.stallId || it.stallID || 'STL0000000').toString().substring(0, 10);
      const itemCode = (it.ItemCode || it.itemCode || it.name || `ITEM${i + 1}`).toString().substring(0, 20);
      const quantity = Number(it.Quantity || it.quantity || 1);
      const unitPrice = Number(it.UnitPrice || it.unitPrice || it.price || 0);

      req.input('orderId', sql.Char(9), orderId);
      req.input('no', sql.Int, i + 1);
      req.input('stallId', sql.Char(10), stallId);
      req.input('itemCode', sql.VarChar(20), itemCode);
      req.input('qty', sql.Int, quantity);
      req.input('unitPrice', sql.Decimal(6,2), unitPrice);
      await req.query('INSERT INTO dbo.OrderItem (OrderID, OrderItemNo, StallID, ItemCode, Quantity, UnitPrice) VALUES (@orderId, @no, @stallId, @itemCode, @qty, @unitPrice)');
    }

    await tx.request().input('cartId', sql.Char(9), cartId).query("DELETE FROM dbo.CartItem WHERE CARTID=@cartId");
    await tx.request().input('cartId', sql.Char(9), cartId).input('now', sql.DateTime, new Date()).query("UPDATE dbo.Cart SET CartStatus='Completed', UpdatedAt=@now WHERE CartID=@cartId");

    await tx.commit();
    return { orderId, itemsCount: items.length };
  } catch (err) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    console.error('createOrderFromPayload error:', err);
    throw err;
  }
}

module.exports = {
  createOrderFromCart,
  createOrderFromPayload
};
