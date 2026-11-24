import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from "./authCore.js";
import { createAuthHandlers } from "./authHandlers.js";
import {
  AUTH_SESSION_COLUMNS,
  AUTH_SESSION_INDEXES,
  AUTH_SESSION_TABLE_METADATA,
  AUTH_SESSION_TABLE_NAME,
  buildAuthSessionRow,
} from "../models/authSessionSchema.js";

function createMemoryAuthStore() {
  let nextUserId = 1;
  const users = [];
  const sessions = [];

  return {
    async findUserByEmail(email) {
      return users.find((u) => u.email === email) || null;
    },
    async findUserById(id) {
      return users.find((u) => Number(u.id) === Number(id)) || null;
    },
    async createUser({ email, displayName, passwordHash }) {
      if (users.some((u) => u.email === email)) {
        const error = new Error("Conflict");
        error.code = "EMAIL_CONFLICT";
        throw error;
      }
      const now = new Date().toISOString();
      const user = {
        id: nextUserId++,
        email,
        display_name: displayName,
        password_hash: passwordHash,
        weekly_workout_goal: 3,
        monthly_workout_goal: 12,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      users.push(user);
      return user;
    },
    async createSession({ id, userId, refreshTokenHash, expiresAt, tokenFamilyId }) {
      const row = buildAuthSessionRow({
        id,
        user_id: userId,
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
        last_used_at: new Date(),
        token_family_id: tokenFamilyId,
      });
      sessions.push(row);
      return row;
    },
    async findSessionById(sessionId) {
      return sessions.find((s) => s.id === sessionId) || null;
    },
    async findSessionByRefreshHash(refreshTokenHash) {
      return sessions.find((s) => s.refresh_token_hash === refreshTokenHash) || null;
    },
    async rotateSession({ oldSessionId, newSessionId, newRefreshTokenHash, newExpiresAt }) {
      const existing = sessions.find((s) => s.id === oldSessionId);
      if (!existing) return null;
      const now = new Date();
      existing.revoked_at = now.toISOString();
      existing.last_used_at = now.toISOString();
      existing.replaced_by_session_id = newSessionId;
      existing.updated_at = now.toISOString();

      const nextRow = buildAuthSessionRow({
        id: newSessionId,
        user_id: existing.user_id,
        refresh_token_hash: newRefreshTokenHash,
        expires_at: newExpiresAt,
        last_used_at: now,
        token_family_id: existing.token_family_id,
      });
      sessions.push(nextRow);
      return nextRow;
    },
    async revokeSessionById(sessionId, userId = null) {
      const target = sessions.find(
        (s) => s.id === sessionId && (userId === null || Number(s.user_id) === Number(userId))
      );
      if (!target) return false;
      target.revoked_at = new Date().toISOString();
      return true;
    },
    async revokeFamily(userId, tokenFamilyId) {
      let count = 0;
      for (const s of sessions) {
        if (Number(s.user_id) === Number(userId) && s.token_family_id === tokenFamilyId && !s.revoked_at) {
          s.revoked_at = new Date().toISOString();
          count += 1;
        }
      }
      return count;
    },
    async revokeAllUserSessions(userId) {
      let count = 0;
      for (const s of sessions) {
        if (Number(s.user_id) === Number(userId) && !s.revoked_at) {
          s.revoked_at = new Date().toISOString();
          count += 1;
        }
      }
      return count;
    },
    async listSessionsByUser(userId) {
      return sessions.filter((s) => Number(s.user_id) === Number(userId));
    },
  };
}

function invokeHandler(handler, { body = {}, headers = {}, params = {}, auth = null } = {}) {
  return new Promise((resolve) => {
    const req = { body, headers, params, auth };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload });
      },
    };
    handler(req, res, () => resolve({ status: 200, nextCalled: true, req }));
  });
}

test("exposes complete auth_sessions table schema definition", () => {
  assert.equal(AUTH_SESSION_TABLE_NAME, "auth_sessions");
  assert.equal(AUTH_SESSION_TABLE_METADATA.columns.length, 10);
  assert.ok(AUTH_SESSION_COLUMNS.id.primaryKey);
  assert.equal(AUTH_SESSION_COLUMNS.refresh_token_hash.type, "CHAR(64)");
  assert.equal(AUTH_SESSION_COLUMNS.token_family_id.type, "CHAR(36)");
  assert.equal(AUTH_SESSION_COLUMNS.replaced_by_session_id.references.table, "auth_sessions");
  assert.equal(AUTH_SESSION_INDEXES.length, 4);
});

test("hashes passwords with scrypt and verifies HMAC bearer tokens", async () => {
  const hash = await hashPassword("Strength2026!");
  assert.ok(hash.startsWith("scrypt$"));
  assert.equal(await verifyPassword("Strength2026!", hash), true);
  assert.equal(await verifyPassword("WrongPassword!", hash), false);

  const token = signAccessToken({ userId: 7, sessionId: "sess-1", email: "a@example.com" });
  const claims = verifyAccessToken(token);
  assert.equal(claims.userId, 7);
  assert.equal(claims.sessionId, "sess-1");
  assert.equal(verifyAccessToken(`${token}tampered`), null);
});

test("handles registration, login, session rotation, and token reuse family revocation", async () => {
  const store = createMemoryAuthStore();
  const handlers = createAuthHandlers(store);

  const registerRes = await invokeHandler(handlers.register, {
    body: {
      displayName: "Jordan Cole",
      email: "jordan@fitnessexplorer.app",
      password: "Password123!",
    },
  });
  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.body.data.user.email, "jordan@fitnessexplorer.app");
  assert.equal("password_hash" in registerRes.body.data.user, false);
  assert.equal("refresh_token_hash" in registerRes.body.data.session, false);

  const firstRefreshToken = registerRes.body.data.refreshToken;
  assert.equal(hashRefreshToken(firstRefreshToken).length, 64);

  const loginRes = await invokeHandler(handlers.login, {
    body: {
      email: "jordan@fitnessexplorer.app",
      password: "Password123!",
    },
  });
  assert.equal(loginRes.status, 200);

  const rotateRes = await invokeHandler(handlers.refresh, {
    body: { refreshToken: firstRefreshToken },
  });
  assert.equal(rotateRes.status, 200);
  assert.notEqual(rotateRes.body.data.refreshToken, firstRefreshToken);
  assert.equal(
    rotateRes.body.data.session.tokenFamilyId,
    registerRes.body.data.session.tokenFamilyId
  );

  // Presenting the already-rotated token must revoke the entire family.
  const reuseRes = await invokeHandler(handlers.refresh, {
    body: { refreshToken: firstRefreshToken },
  });
  assert.equal(reuseRes.status, 401);

  const followUpRes = await invokeHandler(handlers.refresh, {
    body: { refreshToken: rotateRes.body.data.refreshToken },
  });
  assert.equal(followUpRes.status, 401);
});
