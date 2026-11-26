// Centralized Express application settings (ports, CORS origins, upload limits).
const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const defaultAllowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://[::1]:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://[::1]:5173",
  "http://localhost:4173",
  ...configuredOrigins,
]);

export function isAllowedOrigin(origin) {
  if (!origin || defaultAllowedOrigins.has(origin)) return true;
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

export const appConfig = Object.freeze({
  backendPort: Number(process.env.PORT) || 5000,
  fullstackPort: Number(process.env.PORT) || 3000,
  jsonBodyLimit: "1mb",
  maxUploadSizeBytes: 5 * 1024 * 1024,
  corsOptions: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS."));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});
