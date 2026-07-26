// controllers/customerController.js
// Handles the request/response cycle only. All SQL lives in the model.

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const customerModel = require("../models/customerModel");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "dev_only_fallback_secret";

// POST /api/customers/register
async function registerCustomer(req, res) {
    try {
        const { custName, custNric, custContactNo, custEmail, custPassword } = req.body;

        const existing = await customerModel.findCustomerByEmail(custEmail);
        if (existing) {
            return res.status(409).json({ message: "This email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(custPassword, SALT_ROUNDS);

        const newId = await customerModel.createCustomer({
            custName,
            custNric,
            custContactNo,
            custEmail,
            hashedPassword
        });

        res.status(201).json({ message: "Registration successful.", customerId: newId });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error during registration." });
    }
}

// POST /api/customers/login
async function loginCustomer(req, res) {
    try {
        const { custEmail, custPassword } = req.body;

        const customer = await customerModel.findCustomerByEmail(custEmail);

        if (!customer || !customer.CustPassword) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const passwordMatches = await bcrypt.compare(custPassword, customer.CustPassword);
        if (!passwordMatches) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Payload kept minimal on purpose - never put the password/hash in a token
        const token = jwt.sign(
            { customerId: customer.CustomerID, email: customer.CustEmail },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful.",
            token,
            customer: {
                customerId: customer.CustomerID,
                name: customer.CustName,
                email: customer.CustEmail
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error during login." });
    }
}

// GET /api/customers/:id
async function getCustomerById(req, res) {
    try {
        const { id } = req.params;

        // req.customer was set by verifyToken - it's the logged-in customer's own info.
        // This stops a valid token from being used to view someone else's profile
        // just by changing the ID in the URL.
        if (req.customer.customerId !== id) {
            return res.status(403).json({ message: "You are not authorized to view this customer's data." });
        }

        const customer = await customerModel.findCustomerById(id);

        if (!customer) {
            return res.status(404).json({ message: "Customer not found." });
        }

        res.status(200).json(customer);
    } catch (error) {
        console.error("Get customer error:", error);
        res.status(500).json({ message: "Server error." });
    }
}

// PUT /api/customers/:id
async function updateCustomerProfile(req, res) {
    try {
        const { id } = req.params;

        // Same ownership check as GET - you can only update your own profile
        if (req.customer.customerId !== id) {
            return res.status(403).json({ message: "You are not authorized to update this customer's data." });
        }

        const { custName, custContactNo, custEmail } = req.body;

        if (!custName || !custContactNo || !custEmail) {
            return res.status(400).json({ message: "Name, contact number, and email are all required." });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(custEmail)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        // If they're changing their email, make sure it's not already taken by someone else
        const existing = await customerModel.findCustomerByEmail(custEmail);
        if (existing && existing.CustomerID !== id) {
            return res.status(409).json({ message: "This email is already in use by another account." });
        }

        const updated = await customerModel.updateCustomer(id, { custName, custContactNo, custEmail });

        if (!updated) {
            return res.status(404).json({ message: "Customer not found." });
        }

        res.status(200).json({ message: "Profile updated successfully." });
    } catch (error) {
        console.error("Update customer error:", error);
        res.status(500).json({ message: "Server error during update." });
    }
}

// DELETE /api/customers/:id
async function deleteCustomerProfile(req, res) {
    try {
        const { id } = req.params;

        // Same ownership check - you can only delete your own account
        if (req.customer.customerId !== id) {
            return res.status(403).json({ message: "You are not authorized to delete this customer's account." });
        }

        const deleted = await customerModel.deleteCustomer(id);

        if (!deleted) {
            return res.status(404).json({ message: "Customer not found." });
        }

        res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Delete customer error:", error);

        // A customer with existing orders/feedback/etc referencing them via
        // foreign key will fail to delete - surface that clearly instead of
        // a generic 500.
        if (error.number === 547) {
            return res.status(409).json({
                message: "Cannot delete this account because related records (e.g. orders, feedback) still reference it."
            });
        }

        res.status(500).json({ message: "Server error during deletion." });
    }
}

module.exports = {
    registerCustomer,
    loginCustomer,
    getCustomerById,
    updateCustomerProfile,
    deleteCustomerProfile
};