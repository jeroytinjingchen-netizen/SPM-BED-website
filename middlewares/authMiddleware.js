// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev_only_fallback_secret";

// Expects header: Authorization: Bearer <token>
function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.customer = decoded; // { customerId, email } now available in the controller
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
}

// Expects header: Authorization: Bearer <token>
// Same secret as verifyToken, but rejects a customer's token even if
// someone tries to reuse it on a vendor route, and vice versa.
function verifyVendorToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== "vendor") {
            return res.status(403).json({ message: "This action requires a vendor account." });
        }

        req.vendor = decoded; // { ownerId, email, role } now available in the controller
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
}

module.exports = { verifyToken, verifyVendorToken };