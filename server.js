import "./backend/src/config/loadEnv.js";
import fsPromises from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import { createAuthHandlers } from "./backend/src/auth/authHandlers.js";
import { fileAuthStore } from "./backend/src/auth/fileAuthStore.js";
import { createUserStateHandlers } from "./backend/src/auth/userStateHandlers.js";
import { mockExercises } from "./src/services/mockExercises.js";
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
const userStateHandlers = createUserStateHandlers(fileAuthStore);

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
    "http://[::1]:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
    "http://localhost:4173",
    ...configuredOrigins,
  ]);

  function isAllowedOrigin(origin) {
    if (!origin || allowedOrigins.has(origin)) return true;
    try {
      const url = new URL(origin);
      const isHttp = url.protocol === "http:" || url.protocol === "https:";
      if (!isHttp) return false;
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]" ||
        url.hostname === "::1"
      ) {
        return true;
      }
      if (
        url.hostname.endsWith(".run.app") ||
        url.hostname.endsWith(".googleusercontent.com")
      ) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Origin not allowed by CORS."));
      },
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use("/uploads", express.static(uploadDirectory));

  app.post("/api/auth/register", authHandlers.register);
  app.post("/api/auth/login", authHandlers.login);
  app.post("/api/auth/refresh", authHandlers.refresh);
  app.post("/api/auth/restore", authHandlers.restore);
  app.post("/api/auth/logout", authHandlers.logout);
  app.patch("/api/auth/profile", authHandlers.requireAuth, authHandlers.updateProfile);
  app.post("/api/auth/change-password", authHandlers.requireAuth, authHandlers.changePassword);
  app.post("/api/auth/avatar", authHandlers.requireAuth, upload.single("image"), async (req, res) => {
    const uploadedFilePath = req.file?.path;
    try {
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

      const avatarUrl = `/uploads/${req.file.filename}`;
      const previousAvatarUrl = req.auth.user?.avatar_url;
      const updatedUser = await fileAuthStore.updateUserProfile(req.auth.userId, { avatarUrl });
      const prevState = await fileAuthStore.getUserState(req.auth.userId);
      const baseState = prevState || { favorites: [], recentExercises: [], workout: {} };
      await fileAuthStore.saveUserState(req.auth.userId, {
        ...baseState,
        profile: { ...(baseState.profile || {}), avatarUrl },
      });
      await cleanupPreviousLocalUpload(previousAvatarUrl, req.file.filename);

      return res.status(200).json({
        success: true,
        message: "Profile photo updated.",
        data: {
          avatarUrl,
          user: {
            id: Number(updatedUser.id),
            email: updatedUser.email,
            displayName: updatedUser.display_name,
            avatarUrl: updatedUser.avatar_url || null,
            weeklyWorkoutGoal: Number(updatedUser.weekly_workout_goal ?? 3),
            monthlyWorkoutGoal: Number(updatedUser.monthly_workout_goal ?? 12),
            isActive: Boolean(updatedUser.is_active),
            createdAt: updatedUser.created_at,
          },
        },
      });
    } catch (error) {
      await removeUploadedFile(uploadedFilePath);
      console.error("Avatar upload failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to upload profile photo.",
      });
    }
  });
  app.delete("/api/auth/avatar", authHandlers.requireAuth, async (req, res) => {
    try {
      const previousAvatarUrl = req.auth.user?.avatar_url;
      const updatedUser = await fileAuthStore.updateUserProfile(req.auth.userId, { avatarUrl: "" });
      const prevState = await fileAuthStore.getUserState(req.auth.userId);
      if (prevState) {
        await fileAuthStore.saveUserState(req.auth.userId, {
          ...prevState,
          profile: { ...(prevState.profile || {}), avatarUrl: "" },
        });
      }
      await cleanupPreviousLocalUpload(previousAvatarUrl, "");

      return res.status(200).json({
        success: true,
        message: "Profile photo removed.",
        data: {
          avatarUrl: null,
          user: {
            id: Number(updatedUser.id),
            email: updatedUser.email,
            displayName: updatedUser.display_name,
            avatarUrl: null,
            weeklyWorkoutGoal: Number(updatedUser.weekly_workout_goal ?? 3),
            monthlyWorkoutGoal: Number(updatedUser.monthly_workout_goal ?? 12),
            isActive: Boolean(updatedUser.is_active),
            createdAt: updatedUser.created_at,
          },
        },
      });
    } catch (error) {
      console.error("Remove avatar failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to remove profile photo.",
      });
    }
  });
  app.get("/api/auth/sessions", authHandlers.requireAuth, authHandlers.listSessions);
  app.delete("/api/auth/sessions/:id", authHandlers.requireAuth, authHandlers.revokeSession);
  app.post("/api/auth/logout-all", authHandlers.requireAuth, authHandlers.revokeAllSessions);

  app.get("/api/user-state", authHandlers.requireAuth, userStateHandlers.getState);
  app.put("/api/user-state", authHandlers.requireAuth, userStateHandlers.saveState);

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

  function formatBackendExercise(exercise, manifest) {
    const source = exercise.source || "mock";
    const uploadEntry = manifest[`${source}:${exercise.id}`];
    return {
      id: exercise.id,
      name: exercise.name,
      body_part: exercise.bodyPart,
      target_muscle: exercise.target,
      equipment: exercise.equipment,
      secondaryMuscles: exercise.secondaryMuscles || [],
      instructions: Array.isArray(exercise.instructions)
        ? exercise.instructions
        : exercise.instructions
          ? [exercise.instructions]
          : [],
      gif_url: uploadEntry?.imageUrl || exercise.gifUrl || null,
      source,
    };
  }

  app.get("/api/exercises", async (req, res) => {
    try {
      const manifest = await readManifest();
      const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
      const bodyPart = typeof req.query.body_part === "string" ? req.query.body_part.trim().toLowerCase() : "";
      const targetMuscle =
        typeof req.query.target_muscle === "string" ? req.query.target_muscle.trim().toLowerCase() : "";
      const equipment = typeof req.query.equipment === "string" ? req.query.equipment.trim().toLowerCase() : "";
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
      const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "id";
      const order = String(req.query.order).toUpperCase() === "ASC" ? 1 : -1;

      const filtered = mockExercises
        .map((item) => formatBackendExercise(item, manifest))
        .filter((item) => {
          if (bodyPart && String(item.body_part).toLowerCase() !== bodyPart) return false;
          if (targetMuscle && String(item.target_muscle).toLowerCase() !== targetMuscle) return false;
          if (equipment && String(item.equipment).toLowerCase() !== equipment) return false;
          if (search) {
            const matches = [item.name, item.body_part, item.target_muscle, item.equipment].some((val) =>
              String(val || "").toLowerCase().includes(search)
            );
            if (!matches) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const left = String(a[sortBy] ?? a.id);
          const right = String(b[sortBy] ?? b.id);
          return left.localeCompare(right) * order;
        });

      const totalExercises = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalExercises / limit));
      const offset = (page - 1) * limit;
      const rows = filtered.slice(offset, offset + limit);

      return res.status(200).json({
        success: true,
        pagination: {
          currentPage: page,
          limit,
          totalExercises,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        count: rows.length,
        data: rows,
      });
    } catch (error) {
      console.error("List exercises error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve exercises.",
      });
    }
  });

  app.get("/api/exercises/:id", async (req, res) => {
    try {
      const exerciseId = normalizeExerciseId(req.params.id);
      if (!exerciseId) {
        return res.status(400).json({
          success: false,
          message: "Invalid exercise ID.",
        });
      }
      const found = mockExercises.find((item) => String(item.id) === exerciseId);
      if (!found) {
        return res.status(404).json({
          success: false,
          message: "Exercise not found.",
        });
      }
      const manifest = await readManifest();
      return res.status(200).json({
        success: true,
        data: formatBackendExercise(found, manifest),
      });
    } catch (error) {
      console.error("Get exercise error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve exercise.",
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
  const server = http.createServer(app);
  const explicitHost = process.env.HOST?.trim();

  await new Promise((resolve, reject) => {
    let fellBackToIpv4 = false;

    const handleListening = () => {
      server.removeListener("error", handleError);
      console.log(`Fitness Explorer running on http://localhost:${PORT}`);
      resolve();
    };

    const handleError = (error) => {
      if (
        !explicitHost &&
        !fellBackToIpv4 &&
        (error?.code === "EAFNOSUPPORT" || error?.code === "EADDRNOTAVAIL")
      ) {
        fellBackToIpv4 = true;
        server.listen(PORT, "0.0.0.0", handleListening);
        return;
      }
      reject(error);
    };

    server.on("error", handleError);
    if (explicitHost) {
      server.listen(PORT, explicitHost, handleListening);
    } else {
      server.listen({ port: PORT, host: "::", ipv6Only: false }, handleListening);
    }
  });
}

createApp().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
