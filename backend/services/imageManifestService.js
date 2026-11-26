import fsPromises from "node:fs/promises";
import path from "node:path";
import { uploadDirectory } from "../utils/fileHelpers.js";

const MANIFEST_PATH = path.resolve(uploadDirectory, "exercise-images.json");
const VALID_SOURCES = new Set(["backend", "mock", "api"]);

export function normalizeExerciseId(rawId) {
  if (typeof rawId !== "string") return "";
  const trimmed = rawId.trim();
  if (!trimmed || trimmed.length > 100) return "";
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return "";
  return trimmed;
}

export function normalizeSource(rawSource, exerciseId) {
  const value = typeof rawSource === "string" ? rawSource.trim().toLowerCase() : "";
  if (VALID_SOURCES.has(value)) return value;
  if (exerciseId.startsWith("demo-")) return "mock";
  if (/^\d+$/.test(exerciseId)) return "backend";
  return "api";
}

export function buildStorageKey(exerciseId, source) {
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

export async function writeImageManifest(manifest) {
  const tempPath = `${MANIFEST_PATH}.${process.pid}.tmp`;
  await fsPromises.writeFile(tempPath, JSON.stringify(manifest, null, 2), "utf8");
  await fsPromises.rename(tempPath, MANIFEST_PATH);
}
