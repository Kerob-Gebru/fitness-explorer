// This file is the backend's entry point: it configures Express, connects the
// API routes and static uploads, handles errors, and starts the HTTP server.
// The imports below provide the web server, security/CORS middleware, runtime
// settings, file-upload error types, and paths that work in ES modules.
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

// ES modules do not provide __dirname, so derive this file's directory from
// import.meta.url. The resulting absolute path serves files saved by Multer.
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const uploadDirectory = path.resolve(currentDirectory, "../uploads");

// All routes and middleware are registered on this shared Express app.
const app = express();

// Middleware runs in registration order. Helmet sets protective HTTP headers;
// this cross-origin resource policy lets the frontend display API-hosted images.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Allow browser requests from the configured frontend, falling back to Vite's
// usual local development address when CLIENT_ORIGIN is not set.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

// Parse JSON request bodies so controllers can read submitted values from
// req.body. This does not parse multipart image uploads; Multer handles those.
app.use(express.json());

// Serve the stored image files directly at /uploads/<filename>; no controller
// is needed because Express maps this URL prefix to the uploads directory.
app.use("/uploads", express.static(uploadDirectory));

// Send exercise API requests to the router, which maps each method/path to
// the appropriate middleware and controller.
app.use("/api/exercises", exerciseRoutes);

// A lightweight status endpoint for checking that the HTTP server responds.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fitness Explorer API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Express recognizes this four-argument signature as error middleware. It
// translates upload validation/size errors into client responses and reports
// unexpected failures as a generic 500 response without exposing internals.
app.use((error, req, res, next) => {
  // Multer has its own error type, including a specific code for oversized files.
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

  // The upload filter raises this message when a file extension or MIME type
  // is not one of the supported image formats.
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

// PORT can be changed through the environment; 5000 is the local default.
const PORT = process.env.PORT || 5000;

// Do not accept API traffic until the database is reachable. If authentication
// fails, log the startup problem and exit instead of running a broken server.
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

// Start-up is intentionally asynchronous because the database check must finish
// before Express begins listening for requests.
startServer();