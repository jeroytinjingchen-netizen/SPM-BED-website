// Global Application State Trackers
let currentUser = null;
let authToken = null;
const API_BASE = '/api/customers'; // same-origin, since Express serves this file too

// View Router Controller Engine
function navigateTo(viewId) {
    const restrictedPages = ['dashboard-view'];
    if (restrictedPages.includes(viewId) && !currentUser) {
        const loginAlert = document.getElementById('login-alert');
        if (loginAlert) {
            loginAlert.className = "alert alert-danger";
            loginAlert.innerText = "Access Denied. Please log into an active profile first.";
            loginAlert.style.display = "block";
        }
        navigateTo('login-view');
        return;
    }

    if (viewId === 'dashboard-view') {
        window.location.href = 'dashboard.html';
        return;
    }

    if (viewId === 'landing-view' && !window.location.pathname.endsWith('/Index.html') && !window.location.pathname.endsWith('/')) {
        window.location.href = 'Index.html';
        return;
    }

    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
    }
    window.scrollTo(0, 0);
}

// Selecting "Hawker Stall Vendor" here doesn't register a vendor - this
// form only ever calls /api/customers/register. Redirect them to the real
// vendor registration flow instead of letting them submit and end up with
// an unwanted Customer row.
function handleAccountTypeChange(select) {
    const note = document.getElementById('vendor-redirect-note');
    const submitBtn = document.querySelector('#register-form button[type="submit"]');
    if (!note) return;

    const isVendor = select.value === 'Vendor';
    note.style.display = isVendor ? 'block' : 'none';
    if (submitBtn) submitBtn.disabled = isVendor;
}

// Account Registration Handler Engine (POST /api/customers/register)
async function handleRegistration(e) {
    e.preventDefault();
    const alertBox = document.getElementById('register-alert');
    if (alertBox) alertBox.style.display = "none";

    // Safety net in case the button ever gets re-enabled some other way -
    // this form must never silently create a Customer row for a Vendor pick.
    const accountType = document.getElementById('reg-role').value;
    if (accountType === 'Vendor') {
        window.location.href = 'vendor-login.html';
        return;
    }

    const custName = document.getElementById('reg-name').value.trim();
    const custEmail = document.getElementById('reg-email').value.trim().toLowerCase();
    const custNric = document.getElementById('reg-nric').value.trim().toUpperCase();
    const custContactNo = document.getElementById('reg-contact').value.trim();
    const custPassword = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm').value;

    if (custPassword.length < 8) {
        showAlert(alertBox, "danger", "Password must be at least 8 characters long.");
        return;
    }
    if (custPassword !== confirmPassword) {
        showAlert(alertBox, "danger", "Passwords do not match.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ custName, custNric, custContactNo, custEmail, custPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(alertBox, "danger", data.message || "Registration failed.");
            return;
        }

        document.getElementById('register-form').reset();

        // Store auth details if returned by register endpoint
        if (data.token) {
            authToken = data.token;
            currentUser = data.customer || { customerId: data.customerId, name: custName, email: custEmail };
            localStorage.setItem('hawkerhub-auth', JSON.stringify({
                token: authToken,
                customer: currentUser
            }));
        }

        // Redirect to the dashboard after a successful registration
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    }
}

// User Login Authentication Engine (POST /api/customers/login)
async function handleLogin(e) {
    e.preventDefault();
    const alertBox = document.getElementById('login-alert');
    if (alertBox) alertBox.style.display = "none";

    const custEmail = document.getElementById('login-email').value.trim().toLowerCase();
    const custPassword = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ custEmail, custPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(alertBox, "danger", data.message || "Invalid email or password.");
            return;
        }

        currentUser = data.customer;
        authToken = data.token; // save the JWT for use on protected requests
        localStorage.setItem('hawkerhub-auth', JSON.stringify({
            token: authToken,
            customer: currentUser
        }));

        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.innerText = currentUser.name || currentUser.CustName || "Customer";
        
        const roleEl = document.getElementById('user-display-role');
        if (roleEl) roleEl.innerText = "Customer";

        document.getElementById('login-form').reset();
        updateNavigationUI(true);

        // Redirect to the dashboard after a successful login
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    }
}

// GET /api/customers/:id using stored JWT
async function fetchLiveCustomerData(customerId) {
    try {
        const response = await fetch(`${API_BASE}/${customerId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`Error fetching customer data: ${data.message}`);
            return;
        }

        // Pre-fill the "Update Your Profile" form
        const updateName = document.getElementById('update-name');
        const updateContact = document.getElementById('update-contact');
        const updateEmail = document.getElementById('update-email');

        if (updateName) updateName.value = data.CustName || "";
        if (updateContact) updateContact.value = data.CustContactNo || "";
        if (updateEmail) updateEmail.value = data.CustEmail || "";
    } catch (err) {
        console.error('Could not reach the server.', err);
    }
}

// Profile Update Handler Engine (PUT /api/customers/:id)
async function handleUpdateProfile(e) {
    e.preventDefault();
    const alertBox = document.getElementById('update-alert');
    if (alertBox) alertBox.style.display = "none";

    if (!currentUser || !authToken) {
        showAlert(alertBox, "danger", "Your session has expired. Please log in again.");
        return;
    }

    const custName = document.getElementById('update-name').value.trim();
    const custContactNo = document.getElementById('update-contact').value.trim();
    const custEmail = document.getElementById('update-email').value.trim().toLowerCase();

    const submitBtn = document.getElementById('update-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Saving...";
    }

    try {
        const response = await fetch(`${API_BASE}/${currentUser.customerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ custName, custContactNo, custEmail })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(alertBox, "danger", data.message || "Update failed.");
            return;
        }

        currentUser.name = custName;
        currentUser.email = custEmail;
        
        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.innerText = currentUser.name;

        localStorage.setItem('hawkerhub-auth', JSON.stringify({
            token: authToken,
            customer: currentUser
        }));

        showAlert(alertBox, "success", data.message || "Profile updated successfully.");
        fetchLiveCustomerData(currentUser.customerId);
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Save Changes";
        }
    }
}

// Account Deletion Handler Engine (DELETE /api/customers/:id)
async function handleDeleteAccount() {
    const alertBox = document.getElementById('delete-alert');
    if (alertBox) alertBox.style.display = "none";

    if (!currentUser || !authToken) {
        showAlert(alertBox, "danger", "Your session has expired. Please log in again.");
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to permanently delete your account? This cannot be undone."
    );
    if (!confirmed) return;

    const deleteBtn = document.getElementById('delete-account-btn');
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerText = "Deleting...";
    }

    try {
        const response = await fetch(`${API_BASE}/${currentUser.customerId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(alertBox, "danger", data.message || "Could not delete account.");
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerText = "Delete My Account";
            }
            return;
        }

        alert(data.message || "Your account has been deleted.");
        handleLogout();
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerText = "Delete My Account";
        }
    }
}

// Logout Session Termination Engine
function handleLogout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('hawkerhub-auth');
    updateNavigationUI(false);
    window.location.href = 'Index.html';
}

// Context Utility Alert Box Presenter Script
function showAlert(element, type, message) {
    if (!element) return;
    element.className = `alert alert-${type}`;
    element.innerText = message;
    element.style.display = "block";
}

// Dynamic Nav Items Display Synchronization Renderer Layout Engine
function updateNavigationUI(isLoggedIn) {
    const menu = document.getElementById('nav-menu');
    if (!menu) return;

    if (isLoggedIn) {
        menu.innerHTML = `
            <li><a href="Index.html">Home</a></li>
            <li><a href="Menu.html">Menu</a></li>
            <li><a href="dashboard.html">Dashboard</a></li>
            <li><a onclick="handleLogout()">Log Out</a></li>
        `;
    } else {
        menu.innerHTML = `
            <li><a onclick="navigateTo('login-view')">Log In</a></li>
            <li><a onclick="navigateTo('register-view')" class="btn-primary">Register</a></li>
        `;
    }
}

function restoreSession() {
    try {
        const savedAuth = localStorage.getItem('hawkerhub-auth');
        if (!savedAuth) return false;

        const parsed = JSON.parse(savedAuth);
        if (!parsed?.token || !parsed?.customer) return false;

        currentUser = parsed.customer;
        authToken = parsed.token;

        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.innerText = currentUser.name || currentUser.CustName || 'Customer';

        const roleEl = document.getElementById('user-display-role');
        if (roleEl) roleEl.innerText = 'Customer';

        updateNavigationUI(true);
        if (window.location.pathname.endsWith('/dashboard.html') || window.location.pathname.endsWith('/dashboard')) {
            try {
                fetchLiveCustomerData(currentUser.customerId);
            } catch (err) {
                console.error('Failed to fetch live customer data on restore:', err);
            }
        }
        return true;
    } catch (error) {
        console.error('Session restore failed:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const restored = restoreSession();
    if (!restored) {
        updateNavigationUI(false);
        navigateTo('landing-view');
    }
});