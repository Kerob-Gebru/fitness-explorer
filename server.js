import "./backend/config/loadEnv.js";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { appConfig } from "./backend/config/app.js";
import { createErrorHandler, notFoundApiHandler } from "./backend/middleware/errorMiddleware.js";
import upload from "./backend/middleware/uploadMiddleware.js";
import { createAuthHandlers } from "./backend/services/authService.js";
import { fileAuthStore } from "./backend/services/fileAuthStore.js";
import {
  buildStorageKey,
  normalizeExerciseId,
  normalizeSource,
  readImageManifest,
  writeImageManifest,
} from "./backend/services/imageManifestService.js";
import { createUserStateHandlers } from "./backend/services/userStateService.js";
import {
  cleanupPreviousLocalUpload,
  hasValidImageSignature,
  removeUploadedFile,
  uploadDirectory,
} from "./backend/utils/fileHelpers.js";
import { logger } from "./backend/utils/logger.js";
import { mockExercises } from "./src/services/mockExercises.js";

const currentFile = fileURLToPath(import.meta.url);
const rootDirectory = path.dirname(currentFile);
const distDirectory = path.resolve(rootDirectory, "dist");
const authHandlers = createAuthHandlers(fileAuthStore);
const userStateHandlers = createUserStateHandlers(fileAuthStore);

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

async function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );
  app.use(cors(appConfig.corsOptions));
  app.use(express.json({ limit: appConfig.jsonBodyLimit }));
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
      logger.error("Avatar upload failed:", error.message);
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
      await cleanupPreviousLocalUpload(previousAvatarUrl);

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
      logger.error("Remove avatar failed:", error.message);
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
      const manifest = await readImageManifest();
      return res.status(200).json({
        success: true,
        data: manifest,
      });
    } catch (error) {
      logger.error("Read image manifest error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load uploaded exercise images.",
      });
    }
  });

  app.get("/api/exercises", async (req, res) => {
    try {
      const manifest = await readImageManifest();
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
      logger.error("List exercises error:", error.message);
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
      const manifest = await readImageManifest();
      return res.status(200).json({
        success: true,
        data: formatBackendExercise(found, manifest),
      });
    } catch (error) {
      logger.error("Get exercise error:", error.message);
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

      const manifest = await readImageManifest();
      const previousUrl = manifest[storageKey]?.imageUrl;
      manifest[storageKey] = {
        exerciseId,
        source,
        imageUrl,
        filename: req.file.filename,
        updatedAt: new Date().toISOString(),
      };
      await writeImageManifest(manifest);
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
      logger.error("Image upload failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Image upload failed.",
      });
    }
  });

  app.use("/api", notFoundApiHandler);
  app.use(createErrorHandler({ apiOnly: false }));

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

  const PORT = appConfig.fullstackPort;
  const server = http.createServer(app);
  const explicitHost = process.env.HOST?.trim();

  await new Promise((resolve, reject) => {
    let fellBackToIpv4 = false;

    const handleListening = () => {
      server.removeListener("error", handleError);
      logger.info(`Fitness Explorer running on http://localhost:${PORT}`);
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
  logger.error("Server startup failed:", error?.stack || error?.message);
  process.exit(1);
});
