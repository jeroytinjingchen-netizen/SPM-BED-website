// controllers/customerController.js
// Handles the request/response cycle only. All SQL lives in the model.

const bcrypt = require("bcrypt");
const customerModel = require("../models/customerModel");

const SALT_ROUNDS = 10;

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

        res.status(200).json({
            message: "Login successful.",
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

module.exports = { registerCustomer, loginCustomer, getCustomerById };
