import path from "node:path";
import { AuthSession, User, UserProfile, sequelize } from "../models/index.js";
import {
  USER_PROFILE_TABLE_METADATA,
  buildUserProfileRow,
} from "../models/userProfileSchema.js";
import { createAuthHandlers } from "../services/authService.js";
import { fileAuthStore } from "../services/fileAuthStore.js";
import { sanitizeUser } from "../utils/authHelpers.js";
import {
  cleanupPreviousLocalUpload,
  hasValidImageSignature,
  removeUploadedFile,
} from "../utils/fileHelpers.js";

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

  async updateUserProfile(userId, { displayName, email } = {}) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    const updates = {};
    if (typeof displayName === "string" && displayName) {
      updates.display_name = displayName;
    }
    if (typeof email === "string" && email && email !== user.email) {
      updates.email = email;
    }
    if (Object.keys(updates).length > 0) {
      await user.update(updates);
    }
    return user;
  },

  async updateUserPassword(userId, passwordHash) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    await user.update({ password_hash: passwordHash });
    return user;
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
  restore,
  logout,
  listSessions,
  revokeSession,
  revokeAllSessions,
  updateProfile,
  changePassword,
} = createAuthHandlers(sequelizeAuthStore);

export async function uploadAvatar(req, res) {
  const uploadedFilePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image to upload.",
      });
    }
    if (req.file.size === 0) {
      await removeUploadedFile(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: "The selected image is empty.",
      });
    }
    const extension = path.extname(req.file.filename).toLowerCase();
    const valid = await hasValidImageSignature(uploadedFilePath, extension);
    if (!valid) {
      await removeUploadedFile(uploadedFilePath);
      return res.status(400).json({
        success: false,
        message: "The uploaded file is not a valid JPG, PNG, GIF, or WEBP image.",
      });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const prevState = await fileAuthStore.getUserState(req.auth.userId);
    const previousAvatar = prevState?.profile?.avatarUrl || req.auth.user?.avatar_url;
    await cleanupPreviousLocalUpload(previousAvatar, req.file.filename);

    await fileAuthStore.updateUserProfile(req.auth.userId, { avatarUrl });
    const baseState = prevState || { favorites: [], recentExercises: [], workout: {} };
    await fileAuthStore.saveUserState(req.auth.userId, {
      ...baseState,
      profile: { ...(baseState.profile || {}), avatarUrl },
    });

    try {
      const existingProfile = await UserProfile.findByPk(req.auth.userId);
      if (existingProfile) {
        await existingProfile.update({ avatar_url: avatarUrl });
      } else {
        await UserProfile.upsert(
          buildUserProfileRow({
            user_id: req.auth.userId,
            ...(baseState.profile || {}),
            avatarUrl,
          })
        );
      }
    } catch {
      // Fallback silently when SQL DB is unavailable.
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo updated.",
      data: {
        avatarUrl,
        user: { ...sanitizeUser(req.auth.user), avatarUrl },
        profileSchema: USER_PROFILE_TABLE_METADATA,
      },
    });
  } catch (error) {
    await removeUploadedFile(uploadedFilePath);
    console.error("Avatar upload failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to upload profile photo.",
    });
  }
}

export async function removeAvatar(req, res) {
  try {
    const prevState = await fileAuthStore.getUserState(req.auth.userId);
    const previousAvatar = prevState?.profile?.avatarUrl || req.auth.user?.avatar_url;
    await cleanupPreviousLocalUpload(previousAvatar);

    await fileAuthStore.updateUserProfile(req.auth.userId, { avatarUrl: "" });
    if (prevState) {
      await fileAuthStore.saveUserState(req.auth.userId, {
        ...prevState,
        profile: { ...(prevState.profile || {}), avatarUrl: "" },
      });
    }

    try {
      await UserProfile.update(
        { avatar_url: null },
        { where: { user_id: req.auth.userId } }
      );
    } catch {
      // Fallback silently when SQL DB is unavailable.
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo removed.",
      data: {
        avatarUrl: null,
        user: { ...sanitizeUser(req.auth.user), avatarUrl: null },
        profileSchema: USER_PROFILE_TABLE_METADATA,
      },
    });
  } catch (error) {
    console.error("Remove avatar failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to remove profile photo.",
    });
  }
}
