
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

// Store uploaded files inside backend/uploads
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const uploadDirectory = path.resolve(
  currentDirectory,
  "../../uploads"
);

// Allowed file extensions and MIME types
const allowedTypes = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
};

// Configure where and how files are stored
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${extension}`;

    callback(null, uniqueName);
  },
});

// Validate uploaded files
function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = allowedTypes[extension];

  if (!acceptedMimeTypes || !acceptedMimeTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only JPG, JPEG, PNG, GIF, and WEBP images are allowed.")
    );
  }

  callback(null, true);
}

// Configure Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
    files: 1,
  },
});

export default upload;
