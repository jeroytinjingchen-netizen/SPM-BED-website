const AUTH_STORAGE_KEY = 'hawkerhub-auth';

function getStoredAuth() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function renderHistory(orders) {
  const list = document.getElementById('history-list');
  const loading = document.getElementById('history-loading');
  const empty = document.getElementById('history-empty');

  if (!list) return;

  loading.classList.add('hidden');

  if (!orders || orders.length === 0) {
    empty.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');

  list.innerHTML = orders.map((order) => `
    <article class="menu-card" style="min-height:100%;">
      <div class="menu-card-body">
        <div class="menu-card-meta">
          <span class="menu-card-category">${order.orderId}</span>
          <span class="menu-card-status available">${new Date(order.date).toLocaleDateString('en-SG')}</span>
        </div>
        <h3 class="menu-card-title">${order.paymentMethod || 'Payment method unavailable'}</h3>
        <ul style="padding-left:1rem; color:#6c757d; line-height:1.7; margin:0;">
          ${order.items.map((item) => `
            <li>${item.quantity} × ${item.name} — ${formatCurrency(item.lineTotal)}</li>
          `).join('')}
        </ul>
      </div>
      <div class="menu-card-footer" style="flex-direction:column; align-items:flex-start;">
        <span class="menu-card-price">Total ${formatCurrency(order.totalCost)}</span>
        <span class="catalog-count">${order.itemCount} item${order.itemCount === 1 ? '' : 's'}</span>
      </div>
    </article>
  `).join('');
}

async function loadOrderHistory() {
  const auth = getStoredAuth();
  const loading = document.getElementById('history-loading');
  const empty = document.getElementById('history-empty');

  if (!auth?.token || !auth?.customer?.customerId) {
    if (loading) loading.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch(`/api/customers/${auth.customer.customerId}/orders`, {
      headers: {
        Authorization: `Bearer ${auth.token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load order history.');
    }

    renderHistory(data.orders || []);
  } catch (error) {
    console.error(error);
    if (loading) loading.classList.add('hidden');
    if (empty) {
      empty.classList.remove('hidden');
      empty.querySelector('h3').textContent = 'Could not load your orders';
      empty.querySelector('p').textContent = error.message;
    }
  }
}

document.addEventListener('DOMContentLoaded', loadOrderHistory);
