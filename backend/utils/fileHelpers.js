import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

export const uploadDirectory = path.resolve(currentDirectory, "../uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

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

export async function cleanupPreviousLocalUpload(previousUrl, newFilename = "") {
  if (typeof previousUrl !== "string" || !previousUrl.startsWith("/uploads/")) return;
  const previousFilename = path.basename(previousUrl);
  if (!previousFilename || previousFilename === newFilename) return;
  const previousPath = resolveSafeUploadPath(previousFilename);
  if (previousPath) {
    await removeUploadedFile(previousPath);
  }
}

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
