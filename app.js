require("dotenv").config();
const express = require("express");
const sql = require("mssql"); 
const dbConfig = require("./dbConfig");
const menuItemController = require("./controllers/menuItemController");
const cartController = require("./controllers/cartController");
const menuController = require("./controllers/menuController");
const menuRoutes = require("./routes/menuRoutes");
const feedbackController = require("./controllers/feedbackController");
const likeController = require("./controllers/likeController");
const orderHistoryController = require("./controllers/orderHistoryController");
const { validateRegistration, validateLogin } = require("./middlewares/validateCustomer");
const { verifyToken } = require("./middlewares/authMiddleware");
const { registerCustomer, loginCustomer, getCustomerById, updateCustomerProfile, deleteCustomerProfile } = require("./controllers/customerController");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serves your front-end (Index.html, script.js, style.css) from /public
// e.g. visiting http://localhost:3000 loads Index.html automatically
app.use(express.static("public"));

// Debug request logging
app.use((req, res, next) => {
  console.log('REQ', req.method, req.originalUrl);
  next();
});

// ==========================================
// CART CONTROLLER
// ==========================================
// CART ROUTES
app.get('/api/cart', verifyToken, cartController.getCart);
app.post('/api/cart/add', verifyToken, cartController.validateCart, cartController.addToCart);
app.post('/api/cart/update', verifyToken, cartController.updateCartItem);
app.post('/api/cart/remove', verifyToken, cartController.removeCartItem);
app.post('/api/cart/clear', verifyToken, cartController.clearCart);
app.post('/api/cart/checkout', verifyToken, cartController.checkout);

// ==========================================
// TEST ROUTE TO PROVE DATABASE CONNECTION
// ==========================================
app.get("/api/test-db", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query("SELECT CustomerID, CustName, CustEmail FROM dbo.Customer");

        res.status(200).json({
            status: "SUCCESS!",
            message: "Successfully connected to Group3Database!",
            total_customers: result.recordset.length,
            customers: result.recordset
        });
    } catch (error) {
        console.error("Query Error:", error);
        res.status( 500).json({ status: "FAILED", error: error.message });
    }
});

// ==========================================
// surraj - vendor menu nodes
// ==========================================
// Route to fetch Owner details for Vendor Dashboard Identity
app.get('/owners/:id', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ownerId', sql.Char(10), req.params.id)
            .query('SELECT OwnerName FROM StallOwner WHERE OwnerID = @ownerId'); 
            
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ message: "Owner not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error while loading profile");
    }
});

app.get("/stalls/:stallId/menu", menuItemController.getMenu);
app.post("/stalls/:stallId/menu", menuItemController.addMenu);
app.delete("/stalls/:stallId/menu/:itemCode", menuItemController.deleteMenu);
app.put("/stalls/:stallId/menu/:itemCode", menuItemController.updateMenu);
app.put("/stalls/:stallId/menu/:itemCode/toggle", menuItemController.toggleMenu);

app.get('/api/menu/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register menu routes for the public menu API
app.use('/api/menu', menuRoutes);
console.log('Mounted /api/menu routes:', menuRoutes.stack.filter(layer => layer.route).map(layer => Object.keys(layer.route.methods).join(',').toUpperCase() + ' ' + layer.route.path));

// ==========================================
// CUSTOMER ROUTES
// Each request flows: middleware (validation) -> controller -> model
// ==========================================
app.post("/api/customers/register", validateRegistration, registerCustomer);
app.post("/api/customers/login", validateLogin, loginCustomer);
app.get("/api/customers/:id", verifyToken, getCustomerById);
app.put("/api/customers/:id", verifyToken, updateCustomerProfile);
app.delete("/api/customers/:id", verifyToken, deleteCustomerProfile);
app.get("/api/customers/:id/orders", verifyToken, orderHistoryController.getCustomerOrderHistory);

// ==========================================
// youliang FEEDBACK ROUTES - youliang
// ==========================================

// Get all feedback
app.get("/api/feedback", feedbackController.getAllFeedback);

// Create feedback
app.post("/api/feedback", feedbackController.createFeedback);

// update feedback
 app.put("/api/feedback/:fbkID", feedbackController.updateFeedback);

// delete feedback
 app.delete("/api/feedback/:fbkID", feedbackController.deleteFeedback);

// ==========================================
// LIKE / FAVOURITE ROUTES
// ==========================================
// Like route
app.post("/api/likes", likeController.createLike);
app.get("/api/likes/:customerID", likeController.getCustomerLikes);




// ==========================================
// START SERVER AND TEST CONNECTION
// ==========================================
app.listen(port, async () => {
  try {
    await sql.connect(dbConfig);
    console.log("=========================================");
    console.log("✅ Database connection established successfully!");
    console.log("=========================================");
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }

  console.log(`🚀 Server listening on http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nServer is gracefully shutting down...");
  await sql.close();
  console.log("Database connection closed.");
  process.exit(0);
});

