const test = require('node:test');
const assert = require('node:assert/strict');
const { syncCartItemQuantity, syncCartItemRemoval } = require('../public/Menu.js');
const { normalizeCheckoutItems } = require('../models/orderModel');

test('syncCartItemQuantity posts the new quantity to the server cart', async () => {
  const requests = [];
  const fakeFetch = async (url, options = {}) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({ success: true })
    };
  };

  await syncCartItemQuantity(
    {
      id: 25,
      name: 'Nasi Lemak',
      stallID: 'ST001',
      itemCode: 'ITEM001',
      cartItemNo: 7
    },
    3,
    {
      token: 'abc123',
      customerId: 'CUS000001',
      cartId: 'CART123',
      fetchImpl: fakeFetch
    }
  );

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/cart/update');
  assert.deepEqual(requests[0].options.body, JSON.stringify({
    cartId: 'CART123',
    cartItemNo: 7,
    quantity: 3
  }));
});

test('syncCartItemRemoval posts the cart item number to the server cart', async () => {
  const requests = [];
  const fakeFetch = async (url, options = {}) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({ success: true })
    };
  };

  await syncCartItemRemoval(
    {
      id: 25,
      name: 'Nasi Lemak',
      cartItemNo: 7
    },
    {
      token: 'abc123',
      cartId: 'CART123',
      fetchImpl: fakeFetch
    }
  );

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/cart/remove');
  assert.deepEqual(requests[0].options.body, JSON.stringify({
    cartId: 'CART123',
    cartItemNo: 7
  }));
});

test('normalizeCheckoutItems converts the client cart payload into order rows', () => {
  const normalized = normalizeCheckoutItems([
    { stallID: 'ST001', itemCode: 'ITEM001', quantity: 2, price: 4.5 },
    { StallID: 'ST002', ItemCode: 'ITEM002', Quantity: 1, UnitPrice: 6 }
  ]);

  assert.deepEqual(normalized, [
    {
      CartItemNo: 1,
      StallID: 'ST001',
      ItemCode: 'ITEM001',
      Quantity: 2,
      UnitPrice: 4.5
    },
    {
      CartItemNo: 2,
      StallID: 'ST002',
      ItemCode: 'ITEM002',
      Quantity: 1,
      UnitPrice: 6
    }
  ]);
});
