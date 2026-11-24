import crypto from "node:crypto";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROCESS_SIGNING_SECRET =
  (process.env.AUTH_TOKEN_SECRET && process.env.AUTH_TOKEN_SECRET.trim()) ||
  crypto.randomBytes(32).toString("hex");

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export function normalizeEmail(rawEmail) {
  if (typeof rawEmail !== "string") return "";
  const trimmed = rawEmail.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) {
    return "";
  }
  return trimmed;
}

export function validateDisplayName(rawName) {
  if (typeof rawName !== "string") return "";
  const trimmed = rawName.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 80) {
    return "";
  }
  return trimmed;
}

export function validatePassword(rawPassword) {
  if (typeof rawPassword !== "string") return false;
  return rawPassword.length >= 8 && rawPassword.length <= 128;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, hexDigest] = parts;
  if (!salt || !hexDigest) return false;

  const expectedBuffer = Buffer.from(hexDigest, "hex");
  const actualBuffer = await scryptAsync(password, salt);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function generateRefreshToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function signAccessToken({ userId, sessionId, email }) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(userId),
      sid: String(sessionId),
      email: String(email),
      iat: nowSeconds,
      exp: nowSeconds + ACCESS_TOKEN_TTL_SECONDS,
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", PROCESS_SIGNING_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", PROCESS_SIGNING_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const actualSigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSignature);
  if (
    actualSigBuf.length !== expectedSigBuf.length ||
    !crypto.timingSafeEqual(actualSigBuf, expectedSigBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!parsed?.sub || !parsed?.sid || typeof parsed.exp !== "number" || parsed.exp <= nowSeconds) {
      return null;
    }
    return {
      userId: Number(parsed.sub),
      sessionId: String(parsed.sid),
      email: String(parsed.email || ""),
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") return "";
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  return match ? match[1].trim() : "";
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: Number(user.id),
    email: user.email,
    displayName: user.display_name,
    weeklyWorkoutGoal: Number(user.weekly_workout_goal ?? 3),
    monthlyWorkoutGoal: Number(user.monthly_workout_goal ?? 12),
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
  };
}

export function sanitizeSession(session) {
  if (!session) return null;
  const nowMs = Date.now();
  const expiresMs = new Date(session.expires_at).getTime();
  let status = "active";
  if (session.replaced_by_session_id) {
    status = "rotated";
  } else if (session.revoked_at) {
    status = "revoked";
  } else if (Number.isFinite(expiresMs) && expiresMs <= nowMs) {
    status = "expired";
  }

  return {
    id: session.id,
    userId: Number(session.user_id),
    tokenFamilyId: session.token_family_id,
    replacedBySessionId: session.replaced_by_session_id || null,
    expiresAt: session.expires_at,
    revokedAt: session.revoked_at || null,
    lastUsedAt: session.last_used_at || null,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    status,
  };
}
