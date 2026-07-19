require("dotenv").config();
const express = require("express");
const sql = require("mssql"); 
const dbConfig = require("./dbConfig");
const menuItemController = require("./controllers/menuItemController");
const feedbackController = require("./controllers/feedbackController");
const likeController = require("./controllers/likeController");

const { validateRegistration, validateLogin } = require("./middlewares/validateCustomer");
const { verifyToken } = require("./middlewares/authMiddleware");
const { registerCustomer, loginCustomer, getCustomerById } = require("./controllers/customerController");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serves your front-end (Index.html, script.js, style.css) from /public
// e.g. visiting http://localhost:3000 loads Index.html automatically
app.use(express.static("public"));

// ==========================================
// CART CONTROLLER
// ==========================================
// CART ROUTES
app.get('/api/cart', cartController.getCart);
app.post('/api/cart/add', cartController.validateCart, cartController.addToCart);
app.post('/api/cart/update', cartController.updateCartItem);
app.post('/api/cart/remove', cartController.removeCartItem);
app.post('/api/cart/clear', cartController.clearCart);

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
        res.status(500).json({ status: "FAILED", error: error.message });
    }
});
// ==========================================
// surraj - vendor menu nodes
// ==========================================
app.get("/stalls/:stallId/menu", menuItemController.getMenu);
app.post("/stalls/:stallId/menu", menuItemController.addMenu);

// ==========================================
// CUSTOMER ROUTES
// Each request flows: middleware (validation) -> controller -> model
// ==========================================
app.post("/api/customers/register", validateRegistration, registerCustomer);
app.post("/api/customers/login", validateLogin, loginCustomer);
app.get("/api/customers/:id", verifyToken, getCustomerById);


// ==========================================
// youliang FEEDBACK ROUTES - youliang
// ==========================================

// Get all feedback
app.get("/api/feedback", feedbackController.getAllFeedback);

// Create feedback
app.post("/api/feedback", feedbackController.createFeedback);


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

// Menu Feature Endpoints
app.get("/api/menu/search", menuController.searchMenu);
app.get("/api/menu/stall/:stall_id", menuController.getMenuByStall);
app.get("/api/menu/item/:item_id", menuController.getItemDetails);
app.put("/api/menu/item/:item_id", menuController.updateMenuItem);