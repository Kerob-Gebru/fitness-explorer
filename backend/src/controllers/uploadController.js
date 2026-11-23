// Handles exercise image uploads across backend database exercises and
// external/mock exercises, storing files safely and cleaning up orphaned files.
import fsPromises from "node:fs/promises";
import path from "node:path";
import Exercise from "../models/Exercise.js";
import {
  hasValidImageSignature,
  removeUploadedFile,
  resolveSafeUploadPath,
  uploadDirectory,
} from "../middleware/uploadMiddleware.js";

const MANIFEST_PATH = path.resolve(uploadDirectory, "exercise-images.json");
const VALID_SOURCES = new Set(["backend", "mock", "api"]);

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

export async function readImageManifest() {
  try {
    const raw = await fsPromises.readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to read image manifest:", error.message);
    }
    return {};
  }
}

async function writeImageManifest(manifest) {
  const tempPath = `${MANIFEST_PATH}.${process.pid}.tmp`;
  await fsPromises.writeFile(tempPath, JSON.stringify(manifest, null, 2), "utf8");
  await fsPromises.rename(tempPath, MANIFEST_PATH);
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

export async function getUploadedImagesManifest(req, res) {
  try {
    const manifest = await readImageManifest();
    return res.status(200).json({
      success: true,
      data: manifest,
    });
  } catch (error) {
    console.error("Read image manifest error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to read uploaded images manifest.",
    });
  }
}

export async function uploadExerciseImage(req, res) {
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

    // When a database backend exercise is targeted, persist to Sequelize first.
    let persistedToDatabase = false;
    if (source === "backend" && /^\d+$/.test(exerciseId)) {
      const numericId = Number(exerciseId);
      const exercise = await Exercise.findByPk(numericId);
      if (!exercise) {
        await removeUploadedFile(uploadedFilePath);
        return res.status(404).json({
          success: false,
          message: "Exercise not found.",
        });
      }

      const previousUrl = exercise.gif_url;
      await exercise.update({ gif_url: imageUrl });
      await cleanupPreviousLocalUpload(previousUrl, req.file.filename);
      persistedToDatabase = true;
    } else if (source === "backend") {
      await removeUploadedFile(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: "Invalid backend exercise ID.",
      });
    }

    if (!persistedToDatabase) {
      // If a MySQL connection happens to be configured for external exercises,
      // sync via unique external_id without creating duplicates; otherwise use
      // the persistent disk manifest in backend/uploads.
      let dbSynced = false;
      try {
        const externalKey = storageKey.slice(0, 100);
        const existing = await Exercise.findOne({ where: { external_id: externalKey } });
        if (existing) {
          const previousUrl = existing.gif_url;
          await existing.update({ gif_url: imageUrl });
          await cleanupPreviousLocalUpload(previousUrl, req.file.filename);
          dbSynced = true;
        } else if (typeof req.body?.name === "string" && req.body.name.trim()) {
          await Exercise.create({
            external_id: externalKey,
            name: req.body.name.trim().slice(0, 150),
            body_part: typeof req.body.bodyPart === "string" ? req.body.bodyPart.trim().slice(0, 100) || null : null,
            target_muscle: typeof req.body.target === "string" ? req.body.target.trim().slice(0, 100) || null : null,
            equipment: typeof req.body.equipment === "string" ? req.body.equipment.trim().slice(0, 100) || null : null,
            gif_url: imageUrl,
          });
          dbSynced = true;
        }
      } catch {
        // Database is not active in local/mock/live mode; fall back to disk manifest.
      }

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
      if (!dbSynced) {
        await cleanupPreviousLocalUpload(previousUrl, req.file.filename);
      }
    }

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
}
