
// Configure Multer, the middleware that parses multipart form requests and
// writes uploaded images to disk before an upload controller is called.
// The imports provide Multer, path utilities, ES-module file paths, and unique
// random filenames so uploaded files do not overwrite one another.
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

// ES modules do not expose __dirname; derive this file's location and resolve
// the backend/uploads directory relative to it.
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const uploadDirectory = path.resolve(
  currentDirectory,
  "../../uploads"
);

// Require both a recognized extension and its matching MIME type. Checking
// both helps reject files whose name and declared content type disagree.
const allowedTypes = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
};

// diskStorage writes uploads to disk. Multer calls destination for the folder
// and filename for the saved name after a request arrives.
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    // `null` signals no storage error; the second argument is the target folder.
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    // Preserve the lowercase extension for serving, but replace the user's
    // original basename with a UUID to avoid collisions and unsafe names.
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${extension}`;

    callback(null, uniqueName);
  },
});

// Multer calls this filter before accepting each file. Invalid formats are
// passed to Express error handling; valid formats continue through storage.
function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = allowedTypes[extension];

  if (!acceptedMimeTypes || !acceptedMimeTypes.includes(file.mimetype)) {
    // Reject unknown extensions and mismatches between extension and MIME type.
    return callback(
      new Error("Only JPG, JPEG, PNG, GIF, and WEBP images are allowed.")
    );
  }

  callback(null, true);
}

// Export one configured middleware instance for the route to use. The limits
// keep each request to a single image no larger than 5 MiB.
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
    files: 1,
  },
});

export default upload;
