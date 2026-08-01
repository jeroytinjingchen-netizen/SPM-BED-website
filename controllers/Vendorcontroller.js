// controllers/vendorController.js
// Handles the request/response cycle only. All SQL lives in the model.

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const vendorModel = require("../models/vendorModel");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "dev_only_fallback_secret";

// POST /api/vendors/register
async function registerVendor(req, res) {
    try {
        const { ownerName, ownerNric, ownerContactNo, ownerEmail, ownerPassword } = req.body;

        const existing = await vendorModel.findVendorByEmail(ownerEmail);
        if (existing) {
            return res.status(409).json({ message: "This email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(ownerPassword, SALT_ROUNDS);

        const newId = await vendorModel.createVendor({
            ownerName,
            ownerNric,
            ownerContactNo,
            ownerEmail,
            hashedPassword
        });

        res.status(201).json({ message: "Vendor registration successful.", ownerId: newId });
    } catch (error) {
        console.error("Vendor register error:", error);

        // NRIC has a UNIQUE constraint on StallOwner, same as Customer
        if (error.number === 2627 || error.number === 2601) {
            return res.status(409).json({ message: "This NRIC or email is already registered." });
        }

        res.status(500).json({ message: "Server error during vendor registration." });
    }
}

// POST /api/vendors/login
async function loginVendor(req, res) {
    try {
        const { ownerEmail, ownerPassword } = req.body;

        const vendor = await vendorModel.findVendorByEmail(ownerEmail);

        if (!vendor || !vendor.OwnerPassword) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const passwordMatches = await bcrypt.compare(ownerPassword, vendor.OwnerPassword);
        if (!passwordMatches) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // role: "vendor" lets verifyVendorToken reject a customer token
        // (and vice versa) even though both use the same JWT_SECRET.
        const token = jwt.sign(
            { ownerId: vendor.OwnerID, email: vendor.OwnerEmail, role: "vendor" },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        const stalls = await vendorModel.getStallsByOwnerId(vendor.OwnerID);

        res.status(200).json({
            message: "Login successful.",
            token,
            vendor: {
                ownerId: vendor.OwnerID,
                name: vendor.OwnerName,
                email: vendor.OwnerEmail
            },
            stalls // [{ StallID, StallName }, ...] - empty array if not yet assigned a stall
        });
    } catch (error) {
        console.error("Vendor login error:", error);
        res.status(500).json({ message: "Server error during vendor login." });
    }
}

// GET /api/vendors/:id
async function getVendorById(req, res) {
    try {
        const { id } = req.params;

        // req.vendor was set by verifyVendorToken - stops a valid token from
        // being used to view another vendor's profile via the URL.
        if (req.vendor.ownerId !== id) {
            return res.status(403).json({ message: "You are not authorized to view this vendor's data." });
        }

        const vendor = await vendorModel.findVendorById(id);

        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found." });
        }

        res.status(200).json(vendor);
    } catch (error) {
        console.error("Get vendor error:", error);
        res.status(500).json({ message: "Server error." });
    }
}

// PUT /api/vendors/:id
async function updateVendorProfile(req, res) {
    try {
        const { id } = req.params;

        if (req.vendor.ownerId !== id) {
            return res.status(403).json({ message: "You are not authorized to update this vendor's data." });
        }

        const { ownerName, ownerContactNo, ownerEmail } = req.body;

        if (!ownerName || !ownerContactNo || !ownerEmail) {
            return res.status(400).json({ message: "Name, contact number, and email are all required." });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(ownerEmail)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        // If they're changing their email, make sure it's not already taken by someone else
        const existing = await vendorModel.findVendorByEmail(ownerEmail);
        if (existing && existing.OwnerID !== id) {
            return res.status(409).json({ message: "This email is already in use by another account." });
        }

        const updated = await vendorModel.updateVendor(id, { ownerName, ownerContactNo, ownerEmail });

        if (!updated) {
            return res.status(404).json({ message: "Vendor not found." });
        }

        res.status(200).json({ message: "Profile updated successfully." });
    } catch (error) {
        console.error("Update vendor error:", error);
        res.status(500).json({ message: "Server error during update." });
    }
}

// DELETE /api/vendors/:id
async function deleteVendorProfile(req, res) {
    try {
        const { id } = req.params;

        if (req.vendor.ownerId !== id) {
            return res.status(403).json({ message: "You are not authorized to delete this vendor's account." });
        }

        const deleted = await vendorModel.deleteVendor(id);

        if (!deleted) {
            return res.status(404).json({ message: "Vendor not found." });
        }

        res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Delete vendor error:", error);

        // A vendor with an existing RentalAgreement/MenuItem referencing them
        // via foreign key will fail to delete - surface that clearly.
        if (error.number === 547) {
            return res.status(409).json({
                message: "Cannot delete this account because related records (e.g. rental agreements) still reference it."
            });
        }

        res.status(500).json({ message: "Server error during deletion." });
    }
}

module.exports = {
    registerVendor,
    loginVendor,
    getVendorById,
    updateVendorProfile,
    deleteVendorProfile
};