import assert from "node:assert/strict";
import test from "node:test";
import {
  REFRESH_COOKIE_NAME,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from "./authCore.js";
import { createAuthHandlers } from "./authHandlers.js";
import { createUserStateHandlers } from "./userStateHandlers.js";
import {
  AUTH_SESSION_COLUMNS,
  AUTH_SESSION_INDEXES,
  AUTH_SESSION_TABLE_METADATA,
  AUTH_SESSION_TABLE_NAME,
  buildAuthSessionRow,
} from "../models/authSessionSchema.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  USER_PROFILE_COLUMNS,
  USER_PROFILE_INDEXES,
  USER_PROFILE_TABLE_METADATA,
  USER_PROFILE_TABLE_NAME,
  buildUserProfileRow,
  mapProfileRowToClient,
} from "../models/userProfileSchema.js";

function createMemoryAuthStore() {
  let nextUserId = 1;
  const users = [];
  const sessions = [];
  const userStates = new Map();

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
        avatar_url: null,
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
    async updateUserProfile(userId, { displayName, email, avatarUrl } = {}) {
      const user = users.find((u) => Number(u.id) === Number(userId));
      if (!user) return null;
      if (email && email !== user.email) {
        if (users.some((u) => u.email === email && Number(u.id) !== Number(userId))) {
          const error = new Error("Conflict");
          error.code = "EMAIL_CONFLICT";
          throw error;
        }
        user.email = email;
      }
      if (displayName) user.display_name = displayName;
      if (avatarUrl !== undefined) user.avatar_url = avatarUrl || null;
      user.updated_at = new Date().toISOString();
      return user;
    },
    async updateUserPassword(userId, passwordHash) {
      const user = users.find((u) => Number(u.id) === Number(userId));
      if (!user) return null;
      user.password_hash = passwordHash;
      user.updated_at = new Date().toISOString();
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
    async getUserState(userId) {
      return userStates.get(String(userId)) || null;
    },
    async saveUserState(userId, nextState) {
      const now = new Date().toISOString();
      const record = { ...nextState, updatedAt: now };
      userStates.set(String(userId), record);

      const user = users.find((u) => Number(u.id) === Number(userId)) || null;
      const goals = nextState?.workout?.goals;
      if (user && goals) {
        if (Number.isInteger(goals.weekly)) user.weekly_workout_goal = goals.weekly;
        if (Number.isInteger(goals.monthly)) user.monthly_workout_goal = goals.monthly;
        user.updated_at = now;
      }
      return { record, user };
    },
  };
}

function invokeHandler(handler, { body = {}, headers = {}, params = {}, auth = null } = {}) {
  return new Promise((resolve) => {
    const req = { body, headers, params, auth };
    const cookiesSet = {};
    const cookiesCleared = [];
    const res = {
      statusCode: 200,
      cookie(name, value, options) {
        cookiesSet[name] = { value, options };
      },
      clearCookie(name, options) {
        cookiesCleared.push({ name, options });
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({
          status: this.statusCode,
          body: payload,
          cookiesSet,
          cookiesCleared,
        });
      },
    };
    handler(req, res, () => resolve({ status: 200, nextCalled: true, req, cookiesSet, cookiesCleared }));
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

test("exposes complete user_profiles table schema, row mappers, and User Sequelize association", async () => {
  assert.equal(USER_PROFILE_TABLE_NAME, "user_profiles");
  assert.equal(USER_PROFILE_TABLE_METADATA.columns.length, 16);
  assert.ok(USER_PROFILE_COLUMNS.user_id.primaryKey);
  assert.equal(USER_PROFILE_COLUMNS.user_id.references.table, "users");
  assert.equal(USER_PROFILE_COLUMNS.user_id.references.column, "id");
  assert.equal(USER_PROFILE_COLUMNS.weight_kg.type, "DECIMAL(5,1)");
  assert.equal(USER_PROFILE_COLUMNS.resting_heart_rate.type, "SMALLINT.UNSIGNED");
  assert.equal(USER_PROFILE_COLUMNS.units.type, "ENUM('metric','imperial')");
  assert.equal(USER_PROFILE_INDEXES.length, 2);

  const row = buildUserProfileRow({
    user_id: 42,
    firstName: "Jamie",
    lastName: "Nelson",
    handle: "@jamie",
    phone: "+1-813-425-8374",
    location: "Austin, TX",
    bio: "Strength & conditioning",
    avatarUrl: "/uploads/avatar-42.png",
    weightKg: 85.44,
    targetWeightKg: 80,
    heightCm: 181,
    restingHeartRate: 62,
    units: "imperial",
    latestMeasurementDate: "2026-09-05T12:00:00.000Z",
  });
  assert.equal(row.user_id, 42);
  assert.equal(row.first_name, "Jamie");
  assert.equal(row.weight_kg, 85.4);
  assert.equal(row.resting_heart_rate, 62);
  assert.equal(row.units, "imperial");
  assert.equal(row.latest_measurement_date, "2026-09-05");

  const mapped = mapProfileRowToClient(row);
  assert.equal(mapped.firstName, "Jamie");
  assert.equal(mapped.lastName, "Nelson");
  assert.equal(mapped.avatarUrl, "/uploads/avatar-42.png");
  assert.equal(mapped.weightKg, 85.4);
  assert.equal(mapped.latestMeasurementDate, "2026-09-05");

  try {
    const { User, UserProfile } = await import("../models/index.js");
    assert.equal(UserProfile.getTableName(), "user_profiles");
    assert.ok(User.associations.profile);
    assert.ok(UserProfile.associations.user);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    const modelsDir = path.dirname(fileURLToPath(import.meta.url));
    const indexSrc = fs.readFileSync(path.resolve(modelsDir, "../models/index.js"), "utf8");
    const modelSrc = fs.readFileSync(path.resolve(modelsDir, "../models/UserProfile.js"), "utf8");
    assert.match(modelSrc, /USER_PROFILE_TABLE_NAME/);
    assert.match(indexSrc, /User\.hasOne\(UserProfile/);
    assert.match(indexSrc, /UserProfile\.belongsTo\(User/);
  }
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
  assert.ok(registerRes.cookiesSet[REFRESH_COOKIE_NAME]?.value);
  assert.equal(registerRes.cookiesSet[REFRESH_COOKIE_NAME]?.options?.httpOnly, true);

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

test("restores session from HttpOnly cookie and returns unauthenticated without cookie", async () => {
  const store = createMemoryAuthStore();
  const handlers = createAuthHandlers(store);

  const emptyRestore = await invokeHandler(handlers.restore);
  assert.equal(emptyRestore.status, 200);
  assert.equal(emptyRestore.body.data.authenticated, false);

  const registerRes = await invokeHandler(handlers.register, {
    body: {
      displayName: "Taylor Morgan",
      email: "taylor@fitnessexplorer.app",
      password: "Password123!",
    },
  });
  const cookieToken = registerRes.cookiesSet[REFRESH_COOKIE_NAME].value;

  const restoreRes = await invokeHandler(handlers.restore, {
    headers: {
      cookie: `${REFRESH_COOKIE_NAME}=${encodeURIComponent(cookieToken)}`,
    },
  });
  assert.equal(restoreRes.status, 200);
  assert.equal(restoreRes.body.data.authenticated, true);
  assert.equal(restoreRes.body.data.user.email, "taylor@fitnessexplorer.app");
  assert.ok(restoreRes.body.data.accessToken);
  assert.notEqual(restoreRes.cookiesSet[REFRESH_COOKIE_NAME].value, cookieToken);
});

test("persists and reloads user saved favorites, plans, and goals via userStateHandlers", async () => {
  const store = createMemoryAuthStore();
  const authHandlers = createAuthHandlers(store);
  const stateHandlers = createUserStateHandlers(store);

  const registerRes = await invokeHandler(authHandlers.register, {
    body: {
      displayName: "Sam Rivera",
      email: "sam@fitnessexplorer.app",
      password: "Password123!",
    },
  });
  const userId = registerRes.body.data.user.id;
  const user = await store.findUserById(userId);
  const session = (await store.listSessionsByUser(userId))[0];
  const auth = { userId, sessionId: session.id, user, session };

  const initialGet = await invokeHandler(stateHandlers.getState, { auth });
  assert.equal(initialGet.status, 200);
  assert.equal(initialGet.body.data.state, null);

  const saveRes = await invokeHandler(stateHandlers.saveState, {
    auth,
    body: {
      favorites: [{ id: "demo-001", name: "push-up" }],
      recentExercises: [{ id: "demo-001", name: "push-up" }],
      workout: {
        goals: { weekly: 5, monthly: 20 },
        plans: [{ id: "plan-1", name: "Upper Body", exercises: [{ id: "demo-001", name: "push-up" }] }],
      },
    },
  });
  assert.equal(saveRes.status, 200);
  assert.equal(saveRes.body.data.user.weeklyWorkoutGoal, 5);
  assert.equal(saveRes.body.data.user.monthlyWorkoutGoal, 20);

  const reloaded = await invokeHandler(stateHandlers.getState, { auth });
  assert.equal(reloaded.status, 200);
  assert.equal(reloaded.body.data.state.favorites.length, 1);
  assert.equal(reloaded.body.data.state.workout.plans.length, 1);
  assert.equal(reloaded.body.data.state.workout.goals.weekly, 5);

  const saveWithProfile = await invokeHandler(stateHandlers.saveState, {
    auth,
    body: {
      profile: {
        firstName: "Sam",
        lastName: "Rivera",
        handle: "@samrivera",
        phone: "+1 555 019 3344",
        location: "Austin, TX",
        weightKg: 78.5,
        restingHeartRate: 58,
        units: "metric",
      },
    },
  });
  assert.equal(saveWithProfile.status, 200);
  assert.equal(saveWithProfile.body.data.state.profile.location, "Austin, TX");
  assert.equal(saveWithProfile.body.data.state.profile.weightKg, 78.5);
  assert.equal(saveWithProfile.body.data.state.profile.restingHeartRate, 58);
  assert.equal(saveWithProfile.body.data.profileSchema.tableName, "user_profiles");
  assert.equal(registerRes.body.data.profileSchema.tableName, "user_profiles");

  const profilePatch = await invokeHandler(authHandlers.updateProfile, {
    auth,
    body: { displayName: "Samantha Rivera", email: "samantha@fitnessexplorer.app" },
  });
  assert.equal(profilePatch.status, 200);
  assert.equal(profilePatch.body.data.user.displayName, "Samantha Rivera");
  assert.equal(profilePatch.body.data.user.email, "samantha@fitnessexplorer.app");

  const wrongPwRes = await invokeHandler(authHandlers.changePassword, {
    auth,
    body: { currentPassword: "WrongPassword!", newPassword: "NewPassword456!" },
  });
  assert.equal(wrongPwRes.status, 401);

  const changePwRes = await invokeHandler(authHandlers.changePassword, {
    auth,
    body: { currentPassword: "Password123!", newPassword: "NewPassword456!" },
  });
  assert.equal(changePwRes.status, 200);

  const loginNewPw = await invokeHandler(authHandlers.login, {
    body: { email: "samantha@fitnessexplorer.app", password: "NewPassword456!" },
  });
  assert.equal(loginNewPw.status, 200);
});
