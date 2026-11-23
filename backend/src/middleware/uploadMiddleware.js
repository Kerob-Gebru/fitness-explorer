// Configure Multer, the middleware that parses multipart form requests and
// writes uploaded images to disk before an upload controller is called.
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

export const uploadDirectory = path.resolve(
  currentDirectory,
  "../../uploads"
);

// Ensure the upload directory exists before Multer writes files to it.
fs.mkdirSync(uploadDirectory, { recursive: true });

// Require both a recognized extension and its matching MIME type.
const allowedTypes = {
  ".jpg": ["image/jpeg", "image/jpg", "image/pjpeg"],
  ".jpeg": ["image/jpeg", "image/jpg", "image/pjpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
};

export function resolveSafeUploadPath(filename) {
  if (typeof filename !== "string" || !filename.trim()) return null;
  const cleanName = path.basename(filename.trim());
  const resolved = path.resolve(uploadDirectory, cleanName);
  if (!resolved.startsWith(uploadDirectory + path.sep)) return null;
  return resolved;
}

export async function removeUploadedFile(filePath) {
  if (!filePath) return;
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(uploadDirectory + path.sep)) return;

  try {
    await fsPromises.unlink(resolved);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not remove uploaded image:", error.message);
    }
  }
}

// Verify file header magic bytes so renamed non-image files cannot bypass MIME checks.
export async function hasValidImageSignature(filePath, extension) {
  let handle;
  try {
    handle = await fsPromises.open(filePath, "r");
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    if (bytesRead < 4) return false;

    if (extension === ".jpg" || extension === ".jpeg") {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (extension === ".png") {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }
    if (extension === ".gif") {
      const header = buffer.subarray(0, 6).toString("ascii");
      return header === "GIF87a" || header === "GIF89a";
    }
    if (extension === ".webp") {
      return (
        bytesRead >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    }
    return false;
  } catch {
    return false;
  } finally {
    await handle?.close();
  }
}

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
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
    files: 1,
  },
});

export default upload;
