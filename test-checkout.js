const http = require('http');
const jwt = require('jsonwebtoken');

const token = jwt.sign({customerId:'CUS000003',email:'chloe@gmail.com'}, 'customer', {expiresIn:'1h'});
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({status: res.statusCode, data: JSON.parse(data)});
        } catch {
          resolve({status: res.statusCode, data});
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    console.log('=== Test: Cart Sync Checkout Flow ===\n');
    
    console.log('1. Get cart');
    const cart1 = await request('GET', '/api/cart');
    const cartId = cart1.data.cart.CartID;
    console.log(`   CartID: ${cartId}`);

    console.log('\n2. Add first item (2x ITM03)');
    const add1 = await request('POST', '/api/cart/add', {
      StallID: 'STL0000003',
      ItemCode: 'ITM03',
      Quantity: 2,
      UnitPrice: 6.5
    });
    console.log(`   Added: ${add1.data.added[0].Quantity} items`);

    console.log('\n3. Add second item (1x ITM06)');
    const add2 = await request('POST', '/api/cart/add', {
      StallID: 'STL0000006',
      ItemCode: 'ITM06',
      Quantity: 1,
      UnitPrice: 3.5
    });
    console.log(`   Added: ${add2.data.added[0].Quantity} items`);

    console.log('\n4. Checkout');
    const checkout = await request('POST', '/api/cart/checkout', {
      cartId,
      pmtType: 'Cash'
    });
    const orderId = checkout.data.orderId;
    console.log(`   OrderID: ${orderId}, Items: ${checkout.data.items}`);

    console.log('\n5. Fetch order history');
    const history = await request('GET', `/api/customers/CUS000003/orders`);
    const order = history.data.orders.find(o => o.orderId === orderId);
    console.log(`   Order ${orderId}:`);
    console.log(`   - Items: ${order.itemCount}`);
    console.log(`   - Total: $${order.totalCost}`);
    console.log(`   - Details: ${order.items.map(i => `${i.quantity}x ${i.name} ($${i.lineTotal})`).join(', ')}`);

    console.log('\n✅ Test passed: Order created with items!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
})();
