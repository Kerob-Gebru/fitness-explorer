import crypto from "node:crypto";
import { createAuthMiddleware } from "../middleware/authMiddleware.js";
import { AUTH_SESSION_TABLE_METADATA } from "../models/authSessionSchema.js";
import { USER_PROFILE_TABLE_METADATA } from "../models/userProfileSchema.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
  extractBearerToken,
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  normalizeEmail,
  parseCookies,
  sanitizeSession,
  sanitizeUser,
  signAccessToken,
  validateDisplayName,
  validatePassword,
  verifyAccessToken,
  verifyPassword,
} from "../utils/authHelpers.js";

function isSecureRequest(req) {
  return Boolean(req?.secure || req?.headers?.["x-forwarded-proto"] === "https");
}

function setRefreshCookie(req, res, refreshToken) {
  if (typeof res?.cookie !== "function") return;
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function clearRefreshCookie(req, res) {
  if (typeof res?.clearCookie !== "function") return;
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/api/auth",
  });
}

function extractRefreshToken(req) {
  const fromBody = typeof req?.body?.refreshToken === "string" ? req.body.refreshToken.trim() : "";
  if (fromBody) return fromBody;
  const cookies = parseCookies(req?.headers?.cookie);
  return typeof cookies[REFRESH_COOKIE_NAME] === "string" ? cookies[REFRESH_COOKIE_NAME].trim() : "";
}

export function createAuthHandlers(store) {
  const requireAuth = createAuthMiddleware(store);

  async function register(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const displayName = validateDisplayName(req.body?.displayName);
      const password = req.body?.password;

      if (!displayName) {
        return res.status(400).json({
          success: false,
          message: "Display name must be between 2 and 80 characters.",
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      if (!validatePassword(password)) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long.",
        });
      }

      const passwordHash = await hashPassword(password);
      const user = await store.createUser({ email, displayName, passwordHash });

      const refreshToken = generateRefreshToken();
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const sessionId = crypto.randomUUID();
      const tokenFamilyId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      const session = await store.createSession({
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        expiresAt,
        tokenFamilyId,
      });

      const accessToken = signAccessToken({
        userId: user.id,
        sessionId: session.id,
        email: user.email,
      });

      const sanitizedSession = sanitizeSession(session);
      setRefreshCookie(req, res, refreshToken);

      return res.status(201).json({
        success: true,
        message: "Account created successfully.",
        data: {
          user: sanitizeUser(user),
          session: sanitizedSession,
          sessions: [sanitizedSession],
          schema: AUTH_SESSION_TABLE_METADATA,
          profileSchema: USER_PROFILE_TABLE_METADATA,
          accessToken,
          refreshToken,
          expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    } catch (error) {
      if (
        error?.code === "EMAIL_CONFLICT" ||
        error?.name === "SequelizeUniqueConstraintError" ||
        error?.code === "ER_DUP_ENTRY"
      ) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists.",
        });
      }

      console.error("Registration failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not create account.",
      });
    }
  }

  async function login(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = typeof req.body?.password === "string" ? req.body.password : "";

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required.",
        });
      }

      const user = await store.findUserByEmail(email);
      const validPassword = user ? await verifyPassword(password, user.password_hash) : false;

      if (!user || !validPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "This account is deactivated.",
        });
      }

      const refreshToken = generateRefreshToken();
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const sessionId = crypto.randomUUID();
      const tokenFamilyId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      const session = await store.createSession({
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        expiresAt,
        tokenFamilyId,
      });

      const accessToken = signAccessToken({
        userId: user.id,
        sessionId: session.id,
        email: user.email,
      });

      const sessions = await store.listSessionsByUser(user.id);
      setRefreshCookie(req, res, refreshToken);

      return res.status(200).json({
        success: true,
        message: "Signed in successfully.",
        data: {
          user: sanitizeUser(user),
          session: sanitizeSession(session),
          sessions: sessions.map(sanitizeSession),
          schema: AUTH_SESSION_TABLE_METADATA,
          profileSchema: USER_PROFILE_TABLE_METADATA,
          accessToken,
          refreshToken,
          expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    } catch (error) {
      console.error("Login failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Sign in failed.",
      });
    }
  }

  async function refresh(req, res) {
    try {
      const rawRefreshToken = extractRefreshToken(req);
      if (!rawRefreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required.",
        });
      }

      const tokenHash = hashRefreshToken(rawRefreshToken);
      const existing = await store.findSessionByRefreshHash(tokenHash);
      if (!existing) {
        clearRefreshCookie(req, res);
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token.",
        });
      }

      if (existing.revoked_at || existing.replaced_by_session_id) {
        await store.revokeFamily(existing.user_id, existing.token_family_id);
        clearRefreshCookie(req, res);
        return res.status(401).json({
          success: false,
          message: "Session token reuse detected. Please sign in again.",
        });
      }

      if (new Date(existing.expires_at).getTime() <= Date.now()) {
        await store.revokeSessionById(existing.id, existing.user_id);
        clearRefreshCookie(req, res);
        return res.status(401).json({
          success: false,
          message: "Refresh token expired. Please sign in again.",
        });
      }

      const user = await store.findUserById(existing.user_id);
      if (!user || !user.is_active) {
        await store.revokeFamily(existing.user_id, existing.token_family_id);
        clearRefreshCookie(req, res);
        return res.status(401).json({
          success: false,
          message: "Account unavailable.",
        });
      }

      const nextRefreshToken = generateRefreshToken();
      const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);
      const nextSessionId = crypto.randomUUID();
      const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      const rotatedSession = await store.rotateSession({
        oldSessionId: existing.id,
        newSessionId: nextSessionId,
        newRefreshTokenHash: nextRefreshTokenHash,
        newExpiresAt: nextExpiresAt,
      });

      const accessToken = signAccessToken({
        userId: user.id,
        sessionId: rotatedSession.id,
        email: user.email,
      });

      const sessions = await store.listSessionsByUser(user.id);
      setRefreshCookie(req, res, nextRefreshToken);

      return res.status(200).json({
        success: true,
        message: "Session rotated.",
        data: {
          user: sanitizeUser(user),
          session: sanitizeSession(rotatedSession),
          sessions: sessions.map(sanitizeSession),
          schema: AUTH_SESSION_TABLE_METADATA,
          profileSchema: USER_PROFILE_TABLE_METADATA,
          accessToken,
          refreshToken: nextRefreshToken,
          expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    } catch (error) {
      console.error("Session refresh failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to rotate session.",
      });
    }
  }

  async function restore(req, res) {
    try {
      const cookies = parseCookies(req?.headers?.cookie);
      const rawRefreshToken =
        typeof cookies[REFRESH_COOKIE_NAME] === "string" ? cookies[REFRESH_COOKIE_NAME].trim() : "";

      if (!rawRefreshToken) {
        return res.status(200).json({
          success: true,
          data: { authenticated: false },
        });
      }

      const tokenHash = hashRefreshToken(rawRefreshToken);
      const existing = await store.findSessionByRefreshHash(tokenHash);
      if (!existing) {
        clearRefreshCookie(req, res);
        return res.status(200).json({
          success: true,
          data: { authenticated: false },
        });
      }

      if (existing.revoked_at || existing.replaced_by_session_id) {
        await store.revokeFamily(existing.user_id, existing.token_family_id);
        clearRefreshCookie(req, res);
        return res.status(200).json({
          success: true,
          data: { authenticated: false },
        });
      }

      if (new Date(existing.expires_at).getTime() <= Date.now()) {
        await store.revokeSessionById(existing.id, existing.user_id);
        clearRefreshCookie(req, res);
        return res.status(200).json({
          success: true,
          data: { authenticated: false },
        });
      }

      const user = await store.findUserById(existing.user_id);
      if (!user || !user.is_active) {
        await store.revokeFamily(existing.user_id, existing.token_family_id);
        clearRefreshCookie(req, res);
        return res.status(200).json({
          success: true,
          data: { authenticated: false },
        });
      }

      const nextRefreshToken = generateRefreshToken();
      const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);
      const nextSessionId = crypto.randomUUID();
      const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      const rotatedSession = await store.rotateSession({
        oldSessionId: existing.id,
        newSessionId: nextSessionId,
        newRefreshTokenHash: nextRefreshTokenHash,
        newExpiresAt: nextExpiresAt,
      });

      const accessToken = signAccessToken({
        userId: user.id,
        sessionId: rotatedSession.id,
        email: user.email,
      });

      const sessions = await store.listSessionsByUser(user.id);
      setRefreshCookie(req, res, nextRefreshToken);

      return res.status(200).json({
        success: true,
        data: {
          authenticated: true,
          user: sanitizeUser(user),
          session: sanitizeSession(rotatedSession),
          sessions: sessions.map(sanitizeSession),
          schema: AUTH_SESSION_TABLE_METADATA,
          profileSchema: USER_PROFILE_TABLE_METADATA,
          accessToken,
          refreshToken: nextRefreshToken,
          expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    } catch (error) {
      console.error("Session restore failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to restore session.",
      });
    }
  }

  async function logout(req, res) {
    try {
      const bearerClaims = verifyAccessToken(extractBearerToken(req.headers.authorization));
      const rawRefreshToken = extractRefreshToken(req);

      if (rawRefreshToken) {
        const session = await store.findSessionByRefreshHash(hashRefreshToken(rawRefreshToken));
        if (session) {
          await store.revokeSessionById(session.id, session.user_id);
        }
      } else if (bearerClaims) {
        await store.revokeSessionById(bearerClaims.sessionId, bearerClaims.userId);
      }

      clearRefreshCookie(req, res);

      return res.status(200).json({
        success: true,
        message: "Signed out.",
      });
    } catch (error) {
      console.error("Logout failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to sign out.",
      });
    }
  }

  async function listSessions(req, res) {
    try {
      const sessions = await store.listSessionsByUser(req.auth.userId);
      return res.status(200).json({
        success: true,
        data: {
          user: sanitizeUser(req.auth.user),
          currentSessionId: req.auth.sessionId,
          schema: AUTH_SESSION_TABLE_METADATA,
          profileSchema: USER_PROFILE_TABLE_METADATA,
          sessions: sessions.map(sanitizeSession),
        },
      });
    } catch (error) {
      console.error("List sessions failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load sessions.",
      });
    }
  }

  async function revokeSession(req, res) {
    try {
      const sessionId = typeof req.params.id === "string" ? req.params.id.trim() : "";
      if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID.",
        });
      }

      const revoked = await store.revokeSessionById(sessionId, req.auth.userId);
      if (!revoked) {
        return res.status(404).json({
          success: false,
          message: "Session not found.",
        });
      }

      const revokedCurrentSession = sessionId === req.auth.sessionId;
      if (revokedCurrentSession) {
        clearRefreshCookie(req, res);
      }

      return res.status(200).json({
        success: true,
        message: "Session revoked.",
        data: {
          revokedSessionId: sessionId,
          revokedCurrentSession,
        },
      });
    } catch (error) {
      console.error("Revoke session failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to revoke session.",
      });
    }
  }

  async function revokeAllSessions(req, res) {
    try {
      const count = await store.revokeAllUserSessions(req.auth.userId);
      clearRefreshCookie(req, res);
      return res.status(200).json({
        success: true,
        message: "All sessions signed out.",
        data: { revokedCount: count },
      });
    } catch (error) {
      console.error("Revoke all sessions failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to sign out of all sessions.",
      });
    }
  }

  async function updateProfile(req, res) {
    try {
      const updates = {};
      if (req.body?.displayName !== undefined) {
        const displayName = validateDisplayName(req.body.displayName);
        if (!displayName) {
          return res.status(400).json({
            success: false,
            message: "Display name must be between 2 and 80 characters.",
          });
        }
        updates.displayName = displayName;
      }

      if (req.body?.email !== undefined) {
        const email = normalizeEmail(req.body.email);
        if (!email) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid email address.",
          });
        }
        updates.email = email;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(200).json({
          success: true,
          message: "Profile updated.",
          data: { user: sanitizeUser(req.auth.user) },
        });
      }

      const updatedUser = await store.updateUserProfile(req.auth.userId, updates);
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "Account not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile updated.",
        data: { user: sanitizeUser(updatedUser) },
      });
    } catch (error) {
      if (
        error?.code === "EMAIL_CONFLICT" ||
        error?.name === "SequelizeUniqueConstraintError" ||
        error?.code === "ER_DUP_ENTRY"
      ) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists.",
        });
      }

      console.error("Update profile failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to update profile.",
      });
    }
  }

  async function changePassword(req, res) {
    try {
      const currentPassword =
        typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
      const newPassword =
        typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current and new passwords are required.",
        });
      }

      const validCurrent = await verifyPassword(currentPassword, req.auth.user.password_hash);
      if (!validCurrent) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect.",
        });
      }

      if (!validatePassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters long.",
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: "Choose a new password different from your current one.",
        });
      }

      const nextHash = await hashPassword(newPassword);
      await store.updateUserPassword(req.auth.userId, nextHash);

      return res.status(200).json({
        success: true,
        message: "Password updated successfully.",
      });
    } catch (error) {
      console.error("Change password failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to update password.",
      });
    }
  }

  return {
    requireAuth,
    register,
    login,
    refresh,
    restore,
    logout,
    listSessions,
    revokeSession,
    revokeAllSessions,
    updateProfile,
    changePassword,
  };
}
