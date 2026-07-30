const assert = require('assert');
const path = require('path');

const { buildOrderHistory } = require('../controllers/orderHistoryController');

function createSampleOrder() {
  return {
    OrderID: 'ORD000001',
    OrderDate: '2024-02-01',
    PmtType: 'Cash',
    items: [
      { ItemCode: 'ITM01', Quantity: 1, UnitPrice: 4.5, ItemDesc: 'Nasi Lemak' },
      { ItemCode: 'ITM02', Quantity: 2, UnitPrice: 4, ItemDesc: 'Chicken Rice' }
    ]
  };
}

try {
  const result = buildOrderHistory(createSampleOrder());
  assert.strictEqual(result.orderId, 'ORD000001');
  assert.strictEqual(result.itemCount, 2);
  assert.strictEqual(result.totalCost, 12.5);
  assert.strictEqual(result.items[0].name, 'Nasi Lemak');
  console.log('orderHistory test passed');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
