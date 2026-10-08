const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Render provides PORT automatically
const PORT = process.env.PORT || 10000;

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Required for Render PostgreSQL SSL
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool
  .connect()
  .then((client) => {
    console.log("PostgreSQL connected successfully");

    client.release();
  })
  .catch((error) => {
    console.error("PostgreSQL connection failed:");
    console.error(error.message);
  });

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "REGIONX backend is running",
    database: "PostgreSQL",
  });
});

// Database test route
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    res.json({
      success: true,
      message: "Database connection is working",
      time: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database test failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Example API route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`REGIONX backend running on port ${PORT}`);
});