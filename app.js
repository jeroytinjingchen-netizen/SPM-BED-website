// app.js
require("dotenv").config();
const express = require("express");
const sql = require("mssql");
const dbConfig = require("./dbConfig");

const { validateRegistration, validateLogin } = require("./middlewares/validateCustomer");
const { verifyToken } = require("./middlewares/authMiddleware");
const { registerCustomer, loginCustomer, getCustomerById } = require("./controllers/customerController");

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
// CUSTOMER ROUTES
// Each request flows: middleware (validation) -> controller -> model
// ==========================================
app.post("/api/customers/register", validateRegistration, registerCustomer);
app.post("/api/customers/login", validateLogin, loginCustomer);
app.get("/api/customers/:id", verifyToken, getCustomerById);

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