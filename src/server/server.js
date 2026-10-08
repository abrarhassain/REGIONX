
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "myproject_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "REGIONX backend is running!",
  });
});

// Test database connection
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database connected successfully!",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// Get latency test results from PostgreSQL
app.get("/api/latency", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        region,
        latency_ms AS latency,
        status,
        tested_at
      FROM latency_tests
      ORDER BY tested_at DESC
      LIMIT 20
    `);

    res.json({
      results: result.rows,
    });
  } catch (error) {
    console.error("Could not fetch latency results:", error.message);
    res.status(500).json({
      message: "Could not fetch latency results",
    });
  }
});

// Save a latency test result
app.post("/api/latency", async (req, res) => {
  try {
    const { region, latency, status } = req.body;

    if (
      typeof region !== "string" ||
      !region.trim() ||
      typeof latency !== "number" ||
      !Number.isFinite(latency) ||
      latency < 0 ||
      typeof status !== "string"
    ) {
      return res.status(400).json({
        message: "Provide a region, non-negative numeric latency, and status.",
      });
    }

    const result = await pool.query(
      `INSERT INTO latency_tests (region, latency_ms, status)
       VALUES ($1, $2, $3)
       RETURNING id, region, latency_ms AS latency, status, tested_at`,
      [region.trim(), latency, status]
    );

    res.status(201).json({
      message: "Latency result saved successfully!",
      result: result.rows[0],
    });
  } catch (error) {
    console.error("Could not save latency result:", error.message);
    res.status(500).json({
      message: "Could not save latency result",
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`REGIONX backend running on http://localhost:${PORT}`);
});

// Close database connections cleanly
process.on("SIGINT", async () => {
  await pool.end();
  server.close(() => process.exit(0));
});