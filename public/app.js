// app.js
const express = require("express");
const sql = require("mssql");
const path = require("path");

const dbConfig = require("./dbconfig");
const likeRoutes = require("./routes/likeRoutes");

// Import Feedback Controller
const feedbackController = require("./controllers/feedbackController");

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// ROUTES
// ==========================================

// Like Routes
app.use("/api/likes", likeRoutes);

// Feedback Route
app.post("/api/feedback", feedbackController.createFeedback);

// ==========================================
// HOME ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.send("HawkerHub backend is running.");
});

// ==========================================
// TEST DATABASE CONNECTION
// ==========================================

app.get("/api/test-db", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request().query(`
      SELECT TOP 10
        CustomerID,
        CustName,
        CustContactNo,
        CustEmail
      FROM Customer
    `);

    return res.status(200).json({
      status: "SUCCESS",
      message: "Successfully connected to Group3Database!",
      totalCustomers: result.recordset.length,
      customers: result.recordset
    });

  } catch (error) {
    console.error("Database test error:", error);

    return res.status(500).json({
      status: "FAILED",
      message: "Unable to connect to the database",
      error: error.message
    });
  }
});

// ==========================================
// 404 ROUTE
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ==========================================
// GENERAL ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  return res.status(500).json({
    message: "Internal server error"
  });
});

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    await sql.connect(dbConfig);

    console.log("=========================================");
    console.log("✅ Database connection established!");
    console.log("=========================================");

    app.listen(port, () => {
      console.log(`🚀 Server listening on http://localhost:${port}`);
      console.log(`🧪 Test database at http://localhost:${port}/api/test-db`);
      console.log(`💬 Create feedback using POST http://localhost:${port}/api/feedback`);
    });

  } catch (error) {
    console.error("❌ Failed to connect to database:");
    console.error(error.message);

    process.exit(1);
  }
}

startServer();

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

process.on("SIGINT", async () => {
  console.log("\nServer is gracefully shutting down...");

  try {
    await sql.close();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Error closing database:", error.message);
  }

  process.exit(0);
});