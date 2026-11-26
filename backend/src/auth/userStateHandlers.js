import { sanitizeUser } from "./authCore.js";
import {
  USER_PROFILE_TABLE_METADATA,
  sanitizeProfilePayload,
} from "../models/userProfileSchema.js";

function sanitizeUserStatePayload(raw) {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const favorites = Array.isArray(input.favorites) ? input.favorites.slice(0, 500) : [];
  const recentExercises = Array.isArray(input.recentExercises)
    ? input.recentExercises.slice(0, 12)
    : [];
  const rawWorkout =
    input.workout && typeof input.workout === "object" && !Array.isArray(input.workout)
      ? input.workout
      : {};

  return {
    favorites,
    recentExercises,
    profile: sanitizeProfilePayload(input.profile),
    workout: {
      exercises: Array.isArray(rawWorkout.exercises) ? rawWorkout.exercises.slice(0, 200) : [],
      goals:
        rawWorkout.goals && typeof rawWorkout.goals === "object" && !Array.isArray(rawWorkout.goals)
          ? rawWorkout.goals
          : { weekly: 3, monthly: 12 },
      settings:
        rawWorkout.settings && typeof rawWorkout.settings === "object" && !Array.isArray(rawWorkout.settings)
          ? rawWorkout.settings
          : { name: "My training session", goalMinutes: 45, configs: {}, completed: [] },
      plans: Array.isArray(rawWorkout.plans) ? rawWorkout.plans.slice(0, 200) : [],
      history: Array.isArray(rawWorkout.history) ? rawWorkout.history.slice(0, 500) : [],
      scheduledWorkouts: Array.isArray(rawWorkout.scheduledWorkouts)
        ? rawWorkout.scheduledWorkouts.slice(0, 500)
        : [],
      activeSession:
        rawWorkout.activeSession &&
        typeof rawWorkout.activeSession === "object" &&
        !Array.isArray(rawWorkout.activeSession)
          ? rawWorkout.activeSession
          : null,
    },
  };
}

export function createUserStateHandlers(store) {
  async function getState(req, res) {
    try {
      const record = await store.getUserState(req.auth.userId);
      return res.status(200).json({
        success: true,
        data: {
          state: record ? sanitizeUserStatePayload(record) : null,
          updatedAt: record?.updatedAt || null,
          user: sanitizeUser(req.auth.user),
          profileSchema: USER_PROFILE_TABLE_METADATA,
        },
      });
    } catch (error) {
      console.error("Load user state failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load saved user data.",
      });
    }
  }

  async function saveState(req, res) {
    try {
      const payload = sanitizeUserStatePayload(req.body);
      const { record, user } = await store.saveUserState(req.auth.userId, payload);
      return res.status(200).json({
        success: true,
        data: {
          state: sanitizeUserStatePayload(record),
          updatedAt: record.updatedAt,
          user: sanitizeUser(user || req.auth.user),
          profileSchema: USER_PROFILE_TABLE_METADATA,
        },
      });
    } catch (error) {
      console.error("Save user state failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to save user data.",
      });
    }
  }

  return {
    getState,
    saveState,
  };
}
