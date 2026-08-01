// Global Vendor Session State
let currentVendor = null;
let vendorToken = null;
const VENDOR_API_BASE = '/api/vendors'; // same-origin
const VENDOR_AUTH_KEY = 'hawkerhub-vendor-auth'; // deliberately separate from 'hawkerhub-auth' (customers)

// View Router (vendor pages only have these three views)
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
    }
    window.scrollTo(0, 0);
}

// Vendor Registration Handler (POST /api/vendors/register)
async function handleVendorRegistration(e) {
    e.preventDefault();
    const alertBox = document.getElementById('vendor-register-alert');
    if (alertBox) alertBox.style.display = "none";

    const ownerName = document.getElementById('vreg-name').value.trim();
    const ownerEmail = document.getElementById('vreg-email').value.trim().toLowerCase();
    const ownerNric = document.getElementById('vreg-nric').value.trim().toUpperCase();
    const ownerContactNo = document.getElementById('vreg-contact').value.trim();
    const ownerPassword = document.getElementById('vreg-password').value;
    const confirmPassword = document.getElementById('vreg-confirm').value;

    if (ownerPassword.length < 8) {
        showAlert(alertBox, "danger", "Password must be at least 8 characters long.");
        return;
    }
    if (ownerPassword !== confirmPassword) {
        showAlert(alertBox, "danger", "Passwords do not match.");
        return;
    }

    try {
        const response = await fetch(`${VENDOR_API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerName, ownerNric, ownerContactNo, ownerEmail, ownerPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(alertBox, "danger", data.message || "Registration failed.");
            return;
        }

        document.getElementById('vendor-register-form').reset();
        showAlert(alertBox, "success", "Registration successful! Please log in.");

        setTimeout(() => navigateTo('vendor-login-view'), 1200);
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    }
}

// Vendor Login Handler (POST /api/vendors/login)
async function handleVendorLogin(e) {
    e.preventDefault();
    const alertBox = document.getElementById('vendor-login-alert');
    if (alertBox) alertBox.style.display = "none";

    const ownerEmail = document.getElementById('vlogin-email').value.trim().toLowerCase();
    const ownerPassword = document.getElementById('vlogin-password').value;

    try {
        const response = await fetch(`${VENDOR_API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerEmail, ownerPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(alertBox, "danger", data.message || "Invalid email or password.");
            return;
        }

        currentVendor = data.vendor;
        vendorToken = data.token;

        localStorage.setItem(VENDOR_AUTH_KEY, JSON.stringify({
            token: vendorToken,
            vendor: currentVendor,
            stalls: data.stalls || []
        }));

        document.getElementById('vendor-login-form').reset();

        // Redirect to the vendor menu dashboard after a successful login
        window.location.href = 'vendor-menu.html';
    } catch (err) {
        console.error(err);
        showAlert(alertBox, "danger", "Could not reach the server. Please check the server is running.");
    }
}

// Vendor Logout
function handleVendorLogout() {
    currentVendor = null;
    vendorToken = null;
    localStorage.removeItem(VENDOR_AUTH_KEY);
    window.location.href = 'vendor-login.html';
}

// Utility Alert Box Presenter
function showAlert(element, type, message) {
    if (!element) return;
    element.className = `alert alert-${type}`;
    element.innerText = message;
    element.style.display = "block";
}

// Restore a vendor session from localStorage. Returns the parsed auth
// object if valid, or null (and does NOT redirect - callers decide that).
function restoreVendorSession() {
    try {
        const savedAuth = localStorage.getItem(VENDOR_AUTH_KEY);
        if (!savedAuth) return null;

        const parsed = JSON.parse(savedAuth);
        if (!parsed?.token || !parsed?.vendor) return null;

        currentVendor = parsed.vendor;
        vendorToken = parsed.token;
        return parsed;
    } catch (error) {
        console.error('Vendor session restore failed:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // If a vendor is already logged in and lands back on the login page,
    // send them straight to their dashboard instead of showing the form again.
    const restored = restoreVendorSession();
    if (restored && document.getElementById('vendor-landing-view')) {
        window.location.href = 'vendor-menu.html';
        return;
    }
    navigateTo('vendor-landing-view');
});