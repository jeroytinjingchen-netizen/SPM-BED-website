const http = require('http');

const base = 'http://localhost:3000';
const unique = Date.now();
const email = `verify${unique}@example.com`;
const password = 'Password123';

function request(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const headers = opts.headers || {};
    const req = http.request(base + path, { method: opts.method || 'GET', headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let body = data;
        try { body = JSON.parse(data); } catch (err) {}
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    if (opts.body !== undefined) {
      req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    }
    req.end();
  });
}

(async () => {
  const reg = await request('/api/customers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      custName: 'Verifier',
      custNric: `S${unique.toString().slice(-8)}`,
      custContactNo: '99999999',
      custEmail: email,
      custPassword: password
    }
  });
  console.log('register', reg.status, JSON.stringify(reg.body));
  if (reg.status !== 201) throw new Error('registration failed');

  const login = await request('/api/customers/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { custEmail: email, custPassword: password }
  });
  console.log('login', login.status, JSON.stringify(login.body));
  if (!login.body.token) throw new Error('login missing token');

  const token = login.body.token;
  const customerId = login.body.customer.customerId;

  const add = await request('/api/cart/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: { StallID: 'STL0000001', ItemCode: 'ITM01', Quantity: 1, UnitPrice: 5.5 }
  });
  console.log('add', add.status, JSON.stringify(add.body));
  if (add.status !== 200) throw new Error('add cart failed');

  const cart = await request('/api/cart', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('cart', cart.status, JSON.stringify(cart.body));
  if (cart.status !== 200) throw new Error('get cart failed');

  const checkout = await request('/api/cart/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: {
      cartId: cart.body.cart.CartID || cart.body.cart.CartId,
      customerId,
      paymentType: 'Cash'
    }
  });
  console.log('checkout', checkout.status, JSON.stringify(checkout.body));
  if (checkout.status !== 200) throw new Error('checkout failed');

  const history = await request(`/api/customers/${customerId}/orders`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('history', history.status, JSON.stringify(history.body));
  if (history.status !== 200) throw new Error('history failed');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
