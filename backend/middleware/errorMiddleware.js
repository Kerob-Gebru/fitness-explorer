import multer from "multer";
import { logger } from "../utils/logger.js";

export function notFoundApiHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function createErrorHandler({ apiOnly = false } = {}) {
  return function errorMiddleware(error, req, res, next) {
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

    if (error.message === "Only JPG, JPEG, PNG, GIF, and WEBP images are allowed.") {
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

    if (apiOnly || req.path.startsWith("/api/")) {
      logger.error("API error:", error?.stack || error?.message || String(error));
      return res.status(500).json({
        success: false,
        message: "An unexpected server error occurred.",
      });
    }

    return next(error);
  };
}
