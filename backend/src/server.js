import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

import exerciseRoutes from "./routes/exerciseRoutes.js";
import { testDatabaseConnection } from "./config/db.js";

dotenv.config();

// Get the absolute path of the backend/uploads folder
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const uploadDirectory = path.resolve(currentDirectory, "../uploads");

const app = express();

// Middleware
// Security headers are applied before routes. CORP allows the frontend origin
// to display uploaded images served from this API.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

app.use(express.json());

// Expose files written by Multer; this is a static path, not an API controller.
app.use("/uploads", express.static(uploadDirectory));

// Exercise API routes
app.use("/api/exercises", exerciseRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fitness Explorer API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Handle file upload and server errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Image is too large. Maximum allowed size is 5 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error.message ===
    "Only JPG, JPEG, PNG, GIF, and WEBP images are allowed."
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Server error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

// Start server after checking database connection
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // authenticate() verifies DB access only; no model synchronization is run.
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`Fitness Explorer API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(
      "Server startup failed because the database is unavailable."
    );
    process.exit(1);
  }
}

startServer();