// Backend HTTP server entry point.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import multer from "multer";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/authRoutes.js";
import exerciseRoutes from "./routes/exerciseRoutes.js";
import { testDatabaseConnection } from "./config/db.js";

dotenv.config();

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const uploadDirectory = path.resolve(currentDirectory, "../uploads");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const defaultAllowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  ...configuredOrigins,
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || defaultAllowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS."));
    },
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use("/uploads", express.static(uploadDirectory));
app.use("/api/auth", authRoutes);
app.use("/api/exercises", exerciseRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fitness Explorer API is running!",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Image is too large. Maximum allowed size is 5 MB.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Upload one image file at a time using the 'image' field.",
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

  if (error.message === "Origin not allowed by CORS.") {
    return res.status(403).json({
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

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await testDatabaseConnection();
  } catch {
    console.warn(
      "Database unavailable at startup — running in disk-manifest upload mode for non-DB exercises."
    );
  }

  const port = Number(PORT) || 5000;
  const server = http.createServer(app);
  const explicitHost = process.env.HOST?.trim();

  await new Promise((resolve, reject) => {
    let fellBackToIpv4 = false;

    const handleListening = () => {
      server.removeListener("error", handleError);
      console.log(`Fitness Explorer API running on http://localhost:${port}`);
      resolve();
    };

    const handleError = (error) => {
      if (
        !explicitHost &&
        !fellBackToIpv4 &&
        (error?.code === "EAFNOSUPPORT" || error?.code === "EADDRNOTAVAIL")
      ) {
        fellBackToIpv4 = true;
        server.listen(port, "0.0.0.0", handleListening);
        return;
      }
      reject(error);
    };

    server.on("error", handleError);
    if (explicitHost) {
      server.listen(port, explicitHost, handleListening);
    } else {
      server.listen({ port, host: "::", ipv6Only: false }, handleListening);
    }
  });
}

startServer();