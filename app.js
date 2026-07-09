// app.js
const express = require("express");
const sql = require("mssql"); 
const dbConfig = require("./dbConfig");

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
        // Connect to database
        const pool = await sql.connect(dbConfig);
        
        // Run a simple query to get all users
        const result = await pool.request().query('SELECT id, name, email, role FROM Users');
        
        // Send the result back to the browser
        res.status(200).json({
            status: "SUCCESS!",
            message: "Successfully connected to Hawker_db!",
            total_users: result.recordset.length,
            users: result.recordset
        });
    } catch (error) {
        console.error("Query Error:", error);
        res.status(500).json({ status: "FAILED", error: error.message });
    }
});

// ==========================================
// START SERVER AND TEST CONNECTION
// ==========================================
app.listen(port, async () => {
  try {
    // Try connecting when the server starts
    await sql.connect(dbConfig);
    console.log("=========================================");
    console.log("✅ Database connection established successfully!");
    console.log("=========================================");
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
  }

  console.log(`🚀 Server listening on http://localhost:${port}`);
});

// Graceful shutdown from your lab
process.on("SIGINT", async () => {
  console.log("\nServer is gracefully shutting down...");
  await sql.close();
  console.log("Database connection closed.");
  process.exit(0); 
});