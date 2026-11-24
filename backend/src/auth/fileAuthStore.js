import crypto from "node:crypto";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAuthSessionRow } from "../models/authSessionSchema.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const dataDirectory = path.resolve(currentDirectory, "../../data");
const storePath = path.resolve(dataDirectory, "auth-db.json");

let writeChain = Promise.resolve();

function createEmptyStore() {
  return {
    nextUserId: 1,
    users: [],
    auth_sessions: [],
  };
}

async function readStore() {
  try {
    const raw = await fsPromises.readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      nextUserId: Number(parsed?.nextUserId) || 1,
      users: Array.isArray(parsed?.users) ? parsed.users : [],
      auth_sessions: Array.isArray(parsed?.auth_sessions) ? parsed.auth_sessions : [],
    };
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to read auth store:", error.message);
    }
    return createEmptyStore();
  }
}

async function writeStore(data) {
  await fsPromises.mkdir(dataDirectory, { recursive: true });
  const tempPath = `${storePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fsPromises.rename(tempPath, storePath);
}

function runSerialized(task) {
  const next = writeChain.then(task, task);
  writeChain = next.catch(() => {});
  return next;
}

export const fileAuthStore = {
  async findUserByEmail(email) {
    const store = await readStore();
    return store.users.find((u) => u.email === email) || null;
  },

  async findUserById(id) {
    const store = await readStore();
    return store.users.find((u) => Number(u.id) === Number(id)) || null;
  },

  async createUser({ email, displayName, passwordHash }) {
    return runSerialized(async () => {
      const store = await readStore();
      if (store.users.some((u) => u.email === email)) {
        const conflict = new Error("An account with this email already exists.");
        conflict.code = "EMAIL_CONFLICT";
        throw conflict;
      }

      const now = new Date().toISOString();
      const user = {
        id: store.nextUserId,
        email,
        display_name: displayName,
        password_hash: passwordHash,
        weekly_workout_goal: 3,
        monthly_workout_goal: 12,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      store.nextUserId += 1;
      store.users.push(user);
      await writeStore(store);
      return user;
    });
  },

  async createSession({
    id = crypto.randomUUID(),
    userId,
    refreshTokenHash,
    expiresAt,
    tokenFamilyId = crypto.randomUUID(),
  }) {
    return runSerialized(async () => {
      const store = await readStore();
      if (store.auth_sessions.some((s) => s.refresh_token_hash === refreshTokenHash)) {
        const conflict = new Error("Duplicate refresh token hash.");
        conflict.code = "TOKEN_CONFLICT";
        throw conflict;
      }

      const now = new Date();
      const row = buildAuthSessionRow({
        id,
        user_id: userId,
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
        revoked_at: null,
        last_used_at: now,
        token_family_id: tokenFamilyId,
        replaced_by_session_id: null,
        now,
      });

      store.auth_sessions.push(row);
      await writeStore(store);
      return row;
    });
  },

  async findSessionById(sessionId) {
    const store = await readStore();
    return store.auth_sessions.find((s) => s.id === sessionId) || null;
  },

  async findSessionByRefreshHash(refreshTokenHash) {
    const store = await readStore();
    return store.auth_sessions.find((s) => s.refresh_token_hash === refreshTokenHash) || null;
  },

  async rotateSession({ oldSessionId, newSessionId, newRefreshTokenHash, newExpiresAt }) {
    return runSerialized(async () => {
      const store = await readStore();
      const existing = store.auth_sessions.find((s) => s.id === oldSessionId);
      if (!existing) return null;

      const now = new Date();
      const isoNow = now.toISOString();
      existing.revoked_at = isoNow;
      existing.last_used_at = isoNow;
      existing.replaced_by_session_id = newSessionId;
      existing.updated_at = isoNow;

      const nextRow = buildAuthSessionRow({
        id: newSessionId,
        user_id: existing.user_id,
        refresh_token_hash: newRefreshTokenHash,
        expires_at: newExpiresAt,
        revoked_at: null,
        last_used_at: now,
        token_family_id: existing.token_family_id,
        replaced_by_session_id: null,
        now,
      });

      store.auth_sessions.push(nextRow);
      await writeStore(store);
      return nextRow;
    });
  },

  async revokeSessionById(sessionId, userId = null) {
    return runSerialized(async () => {
      const store = await readStore();
      const target = store.auth_sessions.find(
        (s) => s.id === sessionId && (userId === null || Number(s.user_id) === Number(userId))
      );
      if (!target) return false;

      if (!target.revoked_at) {
        const now = new Date().toISOString();
        target.revoked_at = now;
        target.updated_at = now;
        await writeStore(store);
      }
      return true;
    });
  },

  async revokeFamily(userId, tokenFamilyId) {
    return runSerialized(async () => {
      const store = await readStore();
      const now = new Date().toISOString();
      let changed = 0;

      for (const session of store.auth_sessions) {
        if (
          Number(session.user_id) === Number(userId) &&
          session.token_family_id === tokenFamilyId &&
          !session.revoked_at
        ) {
          session.revoked_at = now;
          session.updated_at = now;
          changed += 1;
        }
      }

      if (changed > 0) {
        await writeStore(store);
      }
      return changed;
    });
  },

  async revokeAllUserSessions(userId) {
    return runSerialized(async () => {
      const store = await readStore();
      const now = new Date().toISOString();
      let changed = 0;

      for (const session of store.auth_sessions) {
        if (Number(session.user_id) === Number(userId) && !session.revoked_at) {
          session.revoked_at = now;
          session.updated_at = now;
          changed += 1;
        }
      }

      if (changed > 0) {
        await writeStore(store);
      }
      return changed;
    });
  },

  async listSessionsByUser(userId) {
    const store = await readStore();
    return store.auth_sessions
      .filter((s) => Number(s.user_id) === Number(userId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  },
};
