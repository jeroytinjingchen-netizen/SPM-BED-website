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
    } catch (err) {
        console.error(err);
        output.innerText = "Could not reach the server.";
    }
}

// Logout Session Termination Engine
function handleLogout() {
    currentUser = null;
    authToken = null;
    updateNavigationUI(false);
    navigateTo('landing-view');
}

// Context Utility Alert Box Presenter Script
function showAlert(element, type, message) {
    element.className = `alert alert-${type}`;
    element.innerText = message;
    element.style.display = "block";
}

