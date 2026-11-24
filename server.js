import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import { createAuthHandlers } from "./backend/src/auth/authHandlers.js";
import { fileAuthStore } from "./backend/src/auth/fileAuthStore.js";
import upload, {
  hasValidImageSignature,
  removeUploadedFile,
  resolveSafeUploadPath,
  uploadDirectory,
} from "./backend/src/middleware/uploadMiddleware.js";

const currentFile = fileURLToPath(import.meta.url);
const rootDirectory = path.dirname(currentFile);
const distDirectory = path.resolve(rootDirectory, "dist");
const manifestPath = path.resolve(uploadDirectory, "exercise-images.json");
const VALID_SOURCES = new Set(["backend", "mock", "api"]);
const authHandlers = createAuthHandlers(fileAuthStore);

function normalizeExerciseId(rawId) {
  if (typeof rawId !== "string") return "";
  const trimmed = rawId.trim();
  if (!trimmed || trimmed.length > 100) return "";
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return "";
  return trimmed;
}

function normalizeSource(rawSource, exerciseId) {
  const value = typeof rawSource === "string" ? rawSource.trim().toLowerCase() : "";
  if (VALID_SOURCES.has(value)) return value;
  if (exerciseId.startsWith("demo-")) return "mock";
  if (/^\d+$/.test(exerciseId)) return "backend";
  return "api";
}

function buildStorageKey(exerciseId, source) {
  return `${source}:${exerciseId}`;
}

async function readManifest() {
  try {
    const raw = await fsPromises.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to read image manifest:", error.message);
    }
    return {};
  }
}

async function writeManifest(manifest) {
  const tempPath = `${manifestPath}.${process.pid}.tmp`;
  await fsPromises.writeFile(tempPath, JSON.stringify(manifest, null, 2), "utf8");
  await fsPromises.rename(tempPath, manifestPath);
}

async function cleanupPreviousLocalUpload(previousUrl, newFilename) {
  if (typeof previousUrl !== "string" || !previousUrl.startsWith("/uploads/")) return;
  const previousFilename = path.basename(previousUrl);
  if (!previousFilename || previousFilename === newFilename) return;
  const previousPath = resolveSafeUploadPath(previousFilename);
  if (previousPath) {
    await removeUploadedFile(previousPath);
  }
}

async function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );

  const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowedOrigins = new Set([
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
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        const host = origin.replace(/^https?:\/\//, "").split("/")[0];
        if (host.endsWith(".run.app") || host.endsWith(".googleusercontent.com")) {
          return callback(null, true);
        }
        return callback(new Error("Origin not allowed by CORS."));
      },
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "100kb" }));
  app.use("/uploads", express.static(uploadDirectory));

  app.post("/api/auth/register", authHandlers.register);
  app.post("/api/auth/login", authHandlers.login);
  app.post("/api/auth/refresh", authHandlers.refresh);
  app.post("/api/auth/logout", authHandlers.logout);
  app.get("/api/auth/sessions", authHandlers.requireAuth, authHandlers.listSessions);
  app.delete("/api/auth/sessions/:id", authHandlers.requireAuth, authHandlers.revokeSession);
  app.post("/api/auth/logout-all", authHandlers.requireAuth, authHandlers.revokeAllSessions);

  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Fitness Explorer API is running!",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/exercises/uploads/manifest", async (req, res) => {
    try {
      const manifest = await readManifest();
      return res.status(200).json({
        success: true,
        data: manifest,
      });
    } catch (error) {
      console.error("Read image manifest error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load uploaded exercise images.",
      });
    }
  });

  app.post("/api/exercises/:id/upload", upload.single("image"), async (req, res) => {
    const uploadedFilePath = req.file?.path;

    try {
      const exerciseId = normalizeExerciseId(req.params.id);
      if (!exerciseId) {
        await removeUploadedFile(uploadedFilePath);
        return res.status(400).json({
          success: false,
          message: "Invalid exercise ID.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select an image to upload.",
        });
      }

      if (req.file.size === 0) {
        await removeUploadedFile(uploadedFilePath);
        return res.status(400).json({
          success: false,
          message: "The selected image is empty. Choose another file.",
        });
      }

      const extension = path.extname(req.file.filename).toLowerCase();
      const validSignature = await hasValidImageSignature(uploadedFilePath, extension);
      if (!validSignature) {
        await removeUploadedFile(uploadedFilePath);
        return res.status(400).json({
          success: false,
          message: "The uploaded file is not a valid JPG, PNG, GIF, or WEBP image.",
        });
      }

      const source = normalizeSource(req.body?.source ?? req.query?.source, exerciseId);
      const storageKey = buildStorageKey(exerciseId, source);
      const imageUrl = `/uploads/${req.file.filename}`;

      const manifest = await readManifest();
      const previousUrl = manifest[storageKey]?.imageUrl;
      manifest[storageKey] = {
        exerciseId,
        source,
        imageUrl,
        filename: req.file.filename,
        updatedAt: new Date().toISOString(),
      };
      await writeManifest(manifest);
      await cleanupPreviousLocalUpload(previousUrl, req.file.filename);

      return res.status(200).json({
        success: true,
        message: "Exercise image uploaded successfully!",
        data: {
          exerciseId,
          source,
          storageKey,
          imageUrl,
          filename: req.file.filename,
        },
      });
    } catch (error) {
      await removeUploadedFile(uploadedFilePath);
      console.error("Image upload failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Image upload failed.",
      });
    }
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

    if (req.path.startsWith("/api/")) {
      console.error("API error:", error);
      return res.status(500).json({
        success: false,
        message: "An unexpected server error occurred.",
      });
    }

    return next(error);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDirectory));
    app.get("/{*splat}", (req, res) => {
      res.sendFile(path.resolve(distDirectory, "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fitness Explorer running on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
