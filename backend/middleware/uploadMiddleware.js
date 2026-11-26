import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { appConfig } from "../config/app.js";
import {
  cleanupPreviousLocalUpload,
  hasValidImageSignature,
  removeUploadedFile,
  resolveSafeUploadPath,
  uploadDirectory,
} from "../utils/fileHelpers.js";

const allowedTypes = {
  ".jpg": ["image/jpeg", "image/jpg", "image/pjpeg"],
  ".jpeg": ["image/jpeg", "image/jpg", "image/pjpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${extension}`;
    callback(null, uniqueName);
  },
});

function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const acceptedMimeTypes = allowedTypes[extension];
  const mimetype = String(file.mimetype || "").toLowerCase();

  if (!acceptedMimeTypes || !acceptedMimeTypes.includes(mimetype)) {
    return callback(
      new Error("Only JPG, JPEG, PNG, GIF, and WEBP images are allowed.")
    );
  }

  callback(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: appConfig.maxUploadSizeBytes,
    files: 1,
  },
});

export {
  cleanupPreviousLocalUpload,
  hasValidImageSignature,
  removeUploadedFile,
  resolveSafeUploadPath,
  uploadDirectory,
};

export default upload;
