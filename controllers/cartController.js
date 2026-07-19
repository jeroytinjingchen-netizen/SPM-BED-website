const Joi = require('joi');
const Cart = require('../models/cartmodel');

// Validation schema for single cart item
const cartItemSchema = Joi.object({
  StallID: Joi.string().max(10).required(),
  ItemCode: Joi.string().max(20).required(),
  Quantity: Joi.number().integer().min(1).required(),
  UnitPrice: Joi.number().precision(2).min(0).required(),
});

const cartBodySchema = Joi.object({
  customerId: Joi.string().max(20),
  customerid: Joi.string().max(20),
  CustomerID: Joi.string().max(20),
  StallID: Joi.string().max(10),
  ItemCode: Joi.string().max(20),
  Quantity: Joi.number().integer().min(1),
  UnitPrice: Joi.number().precision(2).min(0),
  items: Joi.array().items(cartItemSchema),
})
  .or('customerId', 'customerid', 'CustomerID')
  .or('StallID', 'items')
  .unknown(true);

// Middleware to validate a single item or items array
function validateCart(req, res, next) {
  const payload = req.body || {};
  const { error } = cartBodySchema.validate(payload, { abortEarly: false });
  if (error) {
    const msg = error.details.map(d => d.message).join(', ');
    return res.status(400).json({ error: msg });
  }

  next();
}

// Get cart for a customer (query param: customerId)
async function getCart(req, res) {
  try {
    const customerId = req.query.customerId || req.query.customerid;
    if (!customerId) return res.status(400).json({ error: 'customerId is required' });

    let cart = await Cart.getOpenCartByCustomer(customerId);
    if (!cart) {
      cart = await Cart.createCart(customerId);
    }

    const items = await Cart.getCartItems(cart.CartID || cart.CartId || cart.CartId);
    res.json({ cart, items });
  } catch (error) {
    console.error('Controller getCart error:', error);
    if (error && error.message && error.message.includes('FOREIGN KEY')) {
      return res.status(400).json({ error: 'Customer ID does not exist in the database. Use an existing CustomerID such as CUS000001.' });
    }
    res.status(500).json({ error: 'Error fetching cart' });
  }
}

// Add item(s) to cart
async function addToCart(req, res) {
  try {
    const body = req.body;
    const customerId = body.customerId || body.CustomerID || body.customerid;
    if (!customerId) return res.status(400).json({ error: 'customerId is required' });

    let cart = await Cart.getOpenCartByCustomer(customerId);
    if (!cart) cart = await Cart.createCart(customerId);
    const cartId = cart.CartID || cart.CartId;

    const items = Array.isArray(body.items) ? body.items : [body];
    const results = [];
    for (const it of items) {
      const added = await Cart.addOrIncrementItem(cartId, it);
      results.push(added);
    }

    const updatedItems = await Cart.getCartItems(cartId);
    res.status(200).json({ cartId, added: results, items: updatedItems });
  } catch (error) {
    console.error('Controller addToCart error:', error);
    if (error && error.message) {
      if (error.message.includes('FK_Cart_Customer')) {
        return res.status(400).json({ error: 'Customer ID does not exist in the database. Use an existing CustomerID such as CUS000001.' });
      }
      if (error.message.includes('FK_CartItem_MenuItem')) {
        return res.status(400).json({ error: 'Invalid StallID or ItemCode. The selected menu item must exist in MenuItem.' });
      }
    }
    res.status(500).json({ error: 'Error adding to cart' });
  }
}

// Update quantity for an item
async function updateCartItem(req, res) {
  try {
    const { cartId, cartItemNo, quantity } = req.body;
    if (!cartId || typeof cartItemNo === 'undefined' || typeof quantity === 'undefined') {
      return res.status(400).json({ error: 'cartId, cartItemNo and quantity are required' });
    }

    const ok = await Cart.updateItemQuantity(cartId, cartItemNo, quantity);
    if (!ok) return res.status(404).json({ error: 'Cart item not found' });
    const items = await Cart.getCartItems(cartId);
    res.json({ items });
  } catch (error) {
    console.error('Controller updateCartItem error:', error);
    res.status(500).json({ error: 'Error updating cart item' });
  }
}

// Remove an item
async function removeCartItem(req, res) {
  try {
    const { cartId, cartItemNo } = req.body;
    if (!cartId || typeof cartItemNo === 'undefined') return res.status(400).json({ error: 'cartId and cartItemNo are required' });
    const ok = await Cart.removeItem(cartId, cartItemNo);
    if (!ok) return res.status(404).json({ error: 'Cart item not found' });
    const items = await Cart.getCartItems(cartId);
    res.json({ items });
  } catch (error) {
    console.error('Controller removeCartItem error:', error);
    res.status(500).json({ error: 'Error removing cart item' });
  }
}

// Clear cart
async function clearCart(req, res) {
  try {
    const { cartId } = req.body;
    if (!cartId) return res.status(400).json({ error: 'cartId is required' });
    await Cart.clearCart(cartId);
    res.json({ success: true });
  } catch (error) {
    console.error('Controller clearCart error:', error);
    res.status(500).json({ error: 'Error clearing cart' });
  }
}

module.exports = {
  validateCart,
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
