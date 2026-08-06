const test = require('node:test');
const assert = require('node:assert/strict');
const menuPage = require('../public/Menu.js');

function createElement() {
  return {
    classList: {
      add() {},
      remove() {},
      contains() { return false; }
    },
    style: {},
    textContent: '',
    innerHTML: '',
    children: [],
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    appendChild(child) {
      this.children.push(child);
      this.innerHTML += child.innerHTML || '';
    }
  };
}

test('initializeMenuPage loads menu data before rendering cards', async () => {
  const grid = createElement();
  const emptyState = createElement();
  const itemCount = createElement();
  const cartCount = createElement();
  const clearCartButton = createElement();
  const checkoutButton = createElement();
  const searchInput = createElement();
  const favoriteCount = createElement();
  const allBtn = createElement();

  const elements = {
    'menu-grid': grid,
    'empty-state': emptyState,
    'item-count': itemCount,
    'cart-count': cartCount,
    'clear-cart': clearCartButton,
    'checkout-button': checkoutButton,
    'search-input': searchInput,
    'favorite-count': favoriteCount,
    'all-items': allBtn
  };

  global.document = {
    addEventListener() {},
    createElement() {
      return createElement();
    },
    querySelector(selector) {
      return selector === '[data-category="All"]' ? allBtn : null;
    },
    querySelectorAll() {
      return [allBtn];
    },
    getElementById(id) {
      return elements[id] || null;
    }
  };

  global.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      items: [
        {
          id: 101,
          stallID: 'ST001',
          stallName: 'Ali Stall',
          itemCode: 'ITEM001',
          name: 'Nasi Lemak',
          category: 'Mains',
          price: 5.5,
          description: 'A classic local favourite',
          available: true,
          IsSpecial: false
        }
      ]
    })
  });

  await menuPage.initializeMenuPage();

  assert.equal(typeof menuPage.initializeMenuPage, 'function');
  assert.ok(grid.innerHTML.includes('Nasi Lemak'));
  assert.equal(itemCount.textContent, 'Showing 1 item');
});
