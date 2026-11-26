import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const logsDirectory = path.resolve(path.dirname(currentFile), "../logs");
const logFilePath = path.resolve(logsDirectory, "app.log");

function appendLog(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  try {
    fs.mkdirSync(logsDirectory, { recursive: true });
    fsPromises.appendFile(logFilePath, line, "utf8").catch(() => {});
  } catch {
    // Ignore file logging errors in read-only environments.
  }
}

export const logger = {
  info(message) {
    console.log(message);
    appendLog("INFO", message);
  },
  warn(message) {
    console.warn(message);
    appendLog("WARN", message);
  },
  error(message, detail = "") {
    const formatted = detail ? `${message} ${detail}` : message;
    console.error(formatted);
    appendLog("ERROR", formatted);
  },
};
