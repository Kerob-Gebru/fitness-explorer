import { createUserStateHandlers } from "../auth/userStateHandlers.js";
import { fileAuthStore } from "../auth/fileAuthStore.js";
import { User, UserProfile } from "../models/index.js";
import {
  buildUserProfileRow,
  mapProfileRowToClient,
} from "../models/userProfileSchema.js";

const userStateStore = {
  async getUserState(userId) {
    const fileRecord = await fileAuthStore.getUserState(userId);
    try {
      const dbProfile = await UserProfile.findByPk(userId);
      if (dbProfile) {
        return {
          ...(fileRecord || { favorites: [], recentExercises: [], workout: {} }),
          profile: mapProfileRowToClient(dbProfile),
          updatedAt: fileRecord?.updatedAt || dbProfile.updated_at || null,
        };
      }
    } catch {
      // Fallback silently to fileAuthStore when SQL DB is unavailable.
    }
    return fileRecord;
  },

  async saveUserState(userId, nextState) {
    const result = await fileAuthStore.saveUserState(userId, nextState);
    let sqlUser = null;

    try {
      await UserProfile.upsert(
        buildUserProfileRow({
          user_id: userId,
          ...(nextState?.profile || {}),
        })
      );

      const goals = nextState?.workout?.goals;
      if (goals && typeof goals === "object") {
        const user = await User.findByPk(userId);
        if (user) {
          const updates = {};
          if (Number.isInteger(goals.weekly) && goals.weekly >= 1 && goals.weekly <= 14) {
            updates.weekly_workout_goal = goals.weekly;
          }
          if (Number.isInteger(goals.monthly) && goals.monthly >= 1 && goals.monthly <= 60) {
            updates.monthly_workout_goal = goals.monthly;
          }
          if (Object.keys(updates).length > 0) {
            await user.update(updates);
          }
          sqlUser = user;
        }
      }
    } catch {
      // Fallback silently to fileAuthStore / req.auth.user when SQL DB is unavailable.
    }

    return {
      record: result.record,
      profile: result.profile,
      user: result.user || sqlUser,
    };
  },
};

export const { getState, saveState } = createUserStateHandlers(userStateStore);
