// middlewares/validateCustomer.js
// Runs before the controller. If validation fails, responds immediately
// and never calls next(), so the controller (and database) is never reached.

function validateRegistration(req, res, next) {
    const { custName, custNric, custContactNo, custEmail, custPassword } = req.body;

    if (!custName || !custNric || !custContactNo || !custEmail || !custPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    if (custPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(custEmail)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
    }

    next();
}

function validateLogin(req, res, next) {
    const { custEmail, custPassword } = req.body;

    if (!custEmail || !custPassword) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    next();
}

module.exports = { validateRegistration, validateLogin };
