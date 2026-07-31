const orderHistoryModel = require('../models/orderHistoryModel');

function buildOrderHistory(orderRow) {
  const items = (orderRow.items || []).map((item) => ({
    code: item.ItemCode || item.code || item.itemCode,
    name: item.ItemDesc || item.name || item.itemName || item.ItemCode || item.code || item.itemCode,
    quantity: Number(item.Quantity || item.quantity || 0),
    unitPrice: Number(item.UnitPrice || item.unitPrice || 0),
    lineTotal: Number(item.Quantity || item.quantity || 0) * Number(item.UnitPrice || item.unitPrice || 0)
  }));

  const totalCost = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    orderId: orderRow.OrderID || orderRow.orderId,
    date: orderRow.OrderDate || orderRow.date,
    paymentMethod: orderRow.PmtType || orderRow.paymentMethod,
    itemCount: items.length,
    totalCost: Number(totalCost.toFixed(2)),
    items
  };
}

function normalizeOrderRows(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    if (!row.OrderID && !row.orderId) return;

    const orderId = row.OrderID || row.orderId;

    if (!grouped.has(orderId)) {
      grouped.set(orderId, {
        OrderID: orderId,
        OrderDate: row.OrderDate || row.orderDate,
        PmtType: row.PmtType || row.paymentMethod || row.pmtType,
        items: []
      });
    }

    const bucket = grouped.get(orderId);
    const itemCode = row.ItemCode || row.itemCode || row.code;
    if (itemCode) {
      bucket.items.push({
        ItemCode: itemCode,
        Quantity: row.Quantity || row.quantity || 0,
        UnitPrice: row.UnitPrice || row.unitPrice || 0,
        ItemDesc: row.ItemDesc || row.itemName || row.name || itemCode
      });
    }
  });

  return Array.from(grouped.values()).map(buildOrderHistory);
}

async function getCustomerOrderHistory(req, res) {
  try {
    const customerId = req.customer?.customerId || req.params.customerId;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required.' });
    }

    if (req.customer && req.customer.customerId !== customerId) {
      return res.status(403).json({ message: 'You are not authorized to view this customer order history.' });
    }

    const rows = await orderHistoryModel.getCustomerOrderHistory(customerId);
    const orders = normalizeOrderRows(rows);

    res.status(200).json({ orders });
  } catch (error) {
    console.error('Order history error:', error);
    res.status(500).json({ message: 'Server error while loading order history.' });
  }
}

module.exports = {
  buildOrderHistory,
  normalizeOrderRows,
  getCustomerOrderHistory
};
