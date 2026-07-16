const sql = require('mssql');
const dbConfig = require('../dbConfig');
const crypto = require('crypto');

function generateCartId() {
  return crypto.randomBytes(6).toString('hex').slice(0,9).toUpperCase();
}

async function _close(connection) {
  if (connection) {
    try { await connection.close(); } catch (e) { console.error('Error closing connection:', e); }
  }
}

async function createCart(customerId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const cartId = generateCartId();
    const now = new Date();
    const query = `INSERT INTO Cart (CartID, CustomerID, CreatedAt, UpdatedAt, CartStatus) VALUES (@cartId, @customerId, @createdAt, @updatedAt, @status)`;
    const request = connection.request();
    request.input('cartId', cartId);
    request.input('customerId', customerId);
    request.input('createdAt', now);
    request.input('updatedAt', now);
    request.input('status', 'Open');
    await request.query(query);
    return { CartID: cartId, CustomerID: customerId, CreatedAt: now, UpdatedAt: now, CartStatus: 'Open' };
  } catch (error) {
    console.error('DB error createCart:', error);
    throw error;
  } finally {
    await _close(connection);
  }
}

async function getOpenCartByCustomer(customerId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const query = `SELECT * FROM Cart WHERE CustomerID = @customerId AND CartStatus = 'Open'`;
    const request = connection.request();
    request.input('customerId', customerId);
    const result = await request.query(query);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('DB error getOpenCartByCustomer:', error);
    throw error;
  } finally {
    await _close(connection);
  }
}

async function getCartItems(cartId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const query = `SELECT * FROM CartItem WHERE CartID = @cartId ORDER BY CartItemNo`;
    const request = connection.request();
    request.input('cartId', cartId);
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('DB error getCartItems:', error);
    throw error;
  } finally {
    await _close(connection);
  }
}

async function addOrIncrementItem(cartId, item) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);

    // See if same stall/item exists in cart
    const checkQ = `SELECT CartItemNo, Quantity FROM CartItem WHERE CartID=@cartId AND StallID=@stallId AND ItemCode=@itemCode`;
    const checkReq = connection.request();
    checkReq.input('cartId', cartId);
    checkReq.input('stallId', item.StallID || item.stallId || item.stallID);
    checkReq.input('itemCode', item.ItemCode || item.itemCode || item.itemCode);
    const checkRes = await checkReq.query(checkQ);

    if (checkRes.recordset.length > 0) {
      const row = checkRes.recordset[0];
      const newQty = row.Quantity + (item.Quantity || item.quantity || 1);
      const updQ = `UPDATE CartItem SET Quantity=@qty WHERE CartID=@cartId AND CartItemNo=@no`;
      const updReq = connection.request();
      updReq.input('qty', newQty);
      updReq.input('cartId', cartId);
      updReq.input('no', row.CartItemNo);
      await updReq.query(updQ);
      await updateCartTimestamp(connection, cartId);
      return { CartItemNo: row.CartItemNo, Quantity: newQty };
    }

    // Determine next CartItemNo
    const nextQ = `SELECT ISNULL(MAX(CartItemNo),0)+1 AS nextNo FROM CartItem WHERE CartID=@cartId`;
    const nextReq = connection.request();
    nextReq.input('cartId', cartId);
    const nextRes = await nextReq.query(nextQ);
    const nextNo = nextRes.recordset[0].nextNo;

    const insQ = `INSERT INTO CartItem (CartID, CartItemNo, StallID, ItemCode, Quantity, UnitPrice) VALUES (@cartId, @no, @stallId, @itemCode, @quantity, @unitPrice)`;
    const insReq = connection.request();
    insReq.input('cartId', cartId);
    insReq.input('no', nextNo);
    insReq.input('stallId', item.StallID || item.stallId || item.stallID);
    insReq.input('itemCode', item.ItemCode || item.itemCode || item.itemCode);
    insReq.input('quantity', item.Quantity || item.quantity || 1);
    insReq.input('unitPrice', item.UnitPrice || item.unitPrice || 0);
    await insReq.query(insQ);
    await updateCartTimestamp(connection, cartId);
    return { CartItemNo: nextNo, Quantity: item.Quantity || item.quantity || 1 };
  } catch (error) {
    console.error('DB error addOrIncrementItem:', error);
    throw error;
  } finally {
    await _close(connection);
  }
}

async function updateCartTimestamp(connectionOrConn, cartId) {
  // Accept either open connection or create one
  let ownConn = false;
  let conn = connectionOrConn;
  try {
    if (!conn || !conn.request) {
      ownConn = true;
      conn = await sql.connect(dbConfig);
    }
    const q = `UPDATE Cart SET UpdatedAt = @now WHERE CartID = @cartId`;
    const req = conn.request();
    req.input('now', new Date());
    req.input('cartId', cartId);
    await req.query(q);
  } catch (e) {
    console.error('Error updating cart timestamp:', e);
    throw e;
  } finally {
    if (ownConn && conn) {
      try { await conn.close(); } catch (e) { console.error(e); }
    }
  }
}

async function updateItemQuantity(cartId, cartItemNo, quantity) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const q = `UPDATE CartItem SET Quantity = @qty WHERE CartID = @cartId AND CartItemNo = @no`;
    const req = connection.request();
    req.input('qty', quantity);
    req.input('cartId', cartId);
    req.input('no', cartItemNo);
    const res = await req.query(q);
    await updateCartTimestamp(connection, cartId);
    return res.rowsAffected[0] > 0;
  } catch (error) {
    console.error('DB error updateItemQuantity:', error);
    throw error;
  } finally {
    await _close(connection);
  }
}

async function removeItem(cartId, cartItemNo) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const q = `DELETE FROM CartItem WHERE CartID=@cartId AND CartItemNo=@no`;
    const req = connection.request();
    req.input('cartId', cartId);
    req.input('no', cartItemNo);
    const res = await req.query(q);
    await updateCartTimestamp(connection, cartId);
    return res.rowsAffected[0] > 0;
  } catch (error) {
    console.error('DB error removeItem:', error);
    throw error;
  } finally {
    await _close(connection);
  }
}

async function clearCart(cartId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const q = `DELETE FROM CartItem WHERE CARTID=@cartId`;
    const req = connection.request();
    req.input('cartId', cartId);
    await req.query(q);
    const upd = connection.request();
    upd.input('cartId', cartId);
    upd.input('now', new Date());
    await upd.query(`UPDATE Cart SET CartStatus='Abandoned', UpdatedAt=@now WHERE CartID=@cartId`);
    return true;
  } catch (error) {
    console.error('DB error clearCart:', error);
    throw error;
  } finally {
    await _close(connection);
  }
}

module.exports = {
  createCart,
  getOpenCartByCustomer,
  getCartItems,
  addOrIncrementItem,
  updateItemQuantity,
  removeItem,
  clearCart,
};
