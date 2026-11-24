import { createAuthHandlers } from "../auth/authHandlers.js";
import { AuthSession, User, sequelize } from "../models/index.js";

const sequelizeAuthStore = {
  async findUserByEmail(email) {
    return User.findOne({ where: { email } });
  },

  async findUserById(id) {
    return User.findByPk(id);
  },

  async createUser({ email, displayName, passwordHash }) {
    return User.create({
      email,
      display_name: displayName,
      password_hash: passwordHash,
    });
  },

  async createSession({ id, userId, refreshTokenHash, expiresAt, tokenFamilyId }) {
    return AuthSession.create({
      id,
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
      last_used_at: new Date(),
      token_family_id: tokenFamilyId,
    });
  },

  async findSessionById(sessionId) {
    return AuthSession.findByPk(sessionId);
  },

  async findSessionByRefreshHash(refreshTokenHash) {
    return AuthSession.findOne({ where: { refresh_token_hash: refreshTokenHash } });
  },

  async rotateSession({ oldSessionId, newSessionId, newRefreshTokenHash, newExpiresAt }) {
    return sequelize.transaction(async (transaction) => {
      const existing = await AuthSession.findByPk(oldSessionId, { transaction });
      if (!existing) return null;

      const now = new Date();
      await existing.update(
        {
          revoked_at: now,
          last_used_at: now,
          replaced_by_session_id: newSessionId,
        },
        { transaction }
      );

      return AuthSession.create(
        {
          id: newSessionId,
          user_id: existing.user_id,
          refresh_token_hash: newRefreshTokenHash,
          expires_at: newExpiresAt,
          last_used_at: now,
          token_family_id: existing.token_family_id,
          replaced_by_session_id: null,
        },
        { transaction }
      );
    });
  },

  async revokeSessionById(sessionId, userId = null) {
    const where = { id: sessionId };
    if (userId !== null) {
      where.user_id = userId;
    }
    const existing = await AuthSession.findOne({ where });
    if (!existing) return false;

    if (!existing.revoked_at) {
      await existing.update({ revoked_at: new Date() });
    }
    return true;
  },

  async revokeFamily(userId, tokenFamilyId) {
    const [updatedCount] = await AuthSession.update(
      { revoked_at: new Date() },
      {
        where: {
          user_id: userId,
          token_family_id: tokenFamilyId,
          revoked_at: null,
        },
      }
    );
    return updatedCount;
  },

  async revokeAllUserSessions(userId) {
    const [updatedCount] = await AuthSession.update(
      { revoked_at: new Date() },
      {
        where: {
          user_id: userId,
          revoked_at: null,
        },
      }
    );
    return updatedCount;
  },

  async listSessionsByUser(userId) {
    return AuthSession.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: 20,
    });
  },
};

export const {
  requireAuth,
  register,
  login,
  refresh,
  logout,
  listSessions,
  revokeSession,
  revokeAllSessions,
} = createAuthHandlers(sequelizeAuthStore);
