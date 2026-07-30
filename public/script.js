// Global Application State Trackers
let currentUser = null;
let authToken = null;
const API_BASE = '/api/customers'; // same-origin, since Express serves this file too

// View Router Controller Engine
function navigateTo(viewId) {
    const restrictedPages = ['dashboard-view'];
    if (restrictedPages.includes(viewId) && !currentUser) {
        const loginAlert = document.getElementById('login-alert');
        loginAlert.className = "alert alert-danger";
        loginAlert.innerText = "Access Denied. Please log into an active profile first.";
        loginAlert.style.display = "block";
        navigateTo('login-view');
        return;
    }

    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    document.getElementById(viewId).classList.add('active');
    window.scrollTo(0, 0);
}

// Account Registration Handler Engine (POST /api/customers/register)
async function handleRegistration(e) {
    e.preventDefault();
    const alertBox = document.getElementById('register-alert');
    alertBox.style.display = "none";

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

        const loginAlert = document.getElementById('login-alert');
        showAlert(loginAlert, "success", `Registration successful! Your Customer ID is ${data.customerId}. You may now sign in.`);
        navigateTo('login-view');
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    }
}

// User Login Authentication Engine (POST /api/customers/login)
async function handleLogin(e) {
    e.preventDefault();
    const alertBox = document.getElementById('login-alert');
    alertBox.style.display = "none";

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

        document.getElementById('user-display-name').innerText = currentUser.name;
        document.getElementById('user-display-role').innerText = "Customer";

        document.getElementById('login-form').reset();
        updateNavigationUI(true);
        navigateTo('dashboard-view');

        // Prove the whole chain works: front-end -> API -> database, using the token
        fetchLiveCustomerData(currentUser.customerId);
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    }
}

// GET /api/customers/:id, using the stored JWT - this is what shows up
// as a matching request in Postman/your server terminal logs.
async function fetchLiveCustomerData(customerId) {
    const output = document.getElementById('live-customer-data');
    output.innerText = "Loading...";

    try {
        const response = await fetch(`${API_BASE}/${customerId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            output.innerText = `Error: ${data.message}`;
            return;
        }

        output.innerText = JSON.stringify(data, null, 2);

        // Pre-fill the "Update Your Profile" form with the values currently in the database
        document.getElementById('update-name').value = data.CustName || "";
        document.getElementById('update-contact').value = data.CustContactNo || "";
        document.getElementById('update-email').value = data.CustEmail || "";
    } catch (err) {
        console.error(err);
        output.innerText = "Could not reach the server.";
    }
}

// Profile Update Handler Engine (PUT /api/customers/:id)
async function handleUpdateProfile(e) {
    e.preventDefault();
    const alertBox = document.getElementById('update-alert');
    alertBox.style.display = "none";

    if (!currentUser || !authToken) {
        showAlert(alertBox, "danger", "Your session has expired. Please log in again.");
        return;
    }

    const custName = document.getElementById('update-name').value.trim();
    const custContactNo = document.getElementById('update-contact').value.trim();
    const custEmail = document.getElementById('update-email').value.trim().toLowerCase();

    const submitBtn = document.getElementById('update-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

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

        // Keep the in-memory user, displayed name, and localStorage in sync with what was just saved
        currentUser.name = custName;
        currentUser.email = custEmail;
        document.getElementById('user-display-name').innerText = currentUser.name;
        localStorage.setItem('hawkerhub-auth', JSON.stringify({
            token: authToken,
            customer: currentUser
        }));

        showAlert(alertBox, "success", data.message || "Profile updated successfully.");

        // Refresh the "Live data from the database" panel so it reflects the change
        fetchLiveCustomerData(currentUser.customerId);
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Save Changes";
    }
}

// Account Deletion Handler Engine (DELETE /api/customers/:id)
async function handleDeleteAccount() {
    const alertBox = document.getElementById('delete-alert');
    alertBox.style.display = "none";

    if (!currentUser || !authToken) {
        showAlert(alertBox, "danger", "Your session has expired. Please log in again.");
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to permanently delete your account? This cannot be undone."
    );
    if (!confirmed) return;

    const deleteBtn = document.getElementById('delete-account-btn');
    deleteBtn.disabled = true;
    deleteBtn.innerText = "Deleting...";

    try {
        const response = await fetch(`${API_BASE}/${currentUser.customerId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            // e.g. 409 when the account still has related orders/feedback referencing it
            showAlert(alertBox, "danger", data.message || "Could not delete account.");
            deleteBtn.disabled = false;
            deleteBtn.innerText = "Delete My Account";
            return;
        }

        alert(data.message || "Your account has been deleted.");
        handleLogout();
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
        deleteBtn.disabled = false;
        deleteBtn.innerText = "Delete My Account";
    }
}

// Logout Session Termination Engine
function handleLogout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('hawkerhub-auth');
    updateNavigationUI(false);
    navigateTo('landing-view');
}

// Context Utility Alert Box Presenter Script
function showAlert(element, type, message) {
    element.className = `alert alert-${type}`;
    element.innerText = message;
    element.style.display = "block";
}

// Dynamic Nav Items Display Synchronization Renderer Layout Engine
function updateNavigationUI(isLoggedIn) {
    const menu = document.getElementById('nav-menu');
    if (isLoggedIn) {
        menu.innerHTML = `
            <li><a onclick="navigateTo('dashboard-view')">Dashboard</a></li>
            <li><a href="Menu.html">Menu</a></li>
            <li><a onclick="handleLogout()" class="btn-primary">Log Out</a></li>
        `;
    } else {
        menu.innerHTML = `
            <li><a onclick="navigateTo('landing-view')">Home</a></li>
            <li><a onclick="navigateTo('feedback-view')">Create Feedback</a></li>
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
        document.getElementById('user-display-name').innerText = currentUser.name;
        document.getElementById('user-display-role').innerText = 'Customer';
        updateNavigationUI(true);
        // show dashboard and load live customer data immediately after restore
        navigateTo('dashboard-view');
        const liveEl = document.getElementById('live-customer-data');
        if (liveEl) liveEl.innerText = 'Loading...';
        try {
            fetchLiveCustomerData(currentUser.customerId);
        } catch (err) {
            console.error('Failed to fetch live customer data on restore:', err);
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