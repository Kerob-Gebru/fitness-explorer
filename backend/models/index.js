// Central registry for the Sequelize models. Importing this module loads every
// model once, registers their associations, and re-exports the initialized
// models so the rest of the backend has a single import point.
import sequelize from "../config/db.js";
import User from "./User.js";
import AuthSession from "./AuthSession.js";
import Favorite from "./Favorite.js";
import Exercise from "./Exercise.js";
import WorkoutPlan from "./WorkoutPlan.js";
import WorkoutDraft from "./WorkoutDraft.js";
import UserProfile from "./UserProfile.js";

// Users own sessions, favorites, workout plans, one profile row, and one in-progress draft.
User.hasOne(UserProfile, {
  as: "profile",
  foreignKey: "user_id",
  sourceKey: "id",
});
UserProfile.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  targetKey: "id",
});

User.hasMany(AuthSession, {
  as: "authSessions",
  foreignKey: "user_id",
  sourceKey: "id",
});
AuthSession.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  targetKey: "id",
});

User.hasMany(Favorite, {
  as: "favorites",
  foreignKey: "user_id",
  sourceKey: "id",
});
Favorite.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  targetKey: "id",
});

// exercise_id is nullable, so a favorite may point at no local catalog row.
Exercise.hasMany(Favorite, {
  as: "favorites",
  foreignKey: "exercise_id",
  sourceKey: "id",
});
Favorite.belongsTo(Exercise, {
  as: "exercise",
  foreignKey: "exercise_id",
  targetKey: "id",
});

User.hasMany(WorkoutPlan, {
  as: "workoutPlans",
  foreignKey: "user_id",
  sourceKey: "id",
});
WorkoutPlan.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  targetKey: "id",
});

// user_id is WorkoutDraft's primary key, so each user has at most one draft.
User.hasOne(WorkoutDraft, {
  as: "workoutDraft",
  foreignKey: "user_id",
  sourceKey: "id",
});
WorkoutDraft.belongsTo(User, {
  as: "user",
  foreignKey: "user_id",
  targetKey: "id",
});

// The column lives on the old session and points to the new session that
// replaced it, so the old row belongs to its replacement.
AuthSession.hasMany(AuthSession, {
  as: "replacedSessions",
  foreignKey: "replaced_by_session_id",
  sourceKey: "id",
});
AuthSession.belongsTo(AuthSession, {
  as: "replacedBySession",
  foreignKey: "replaced_by_session_id",
  targetKey: "id",
});

export {
  sequelize,
  User,
  UserProfile,
  AuthSession,
  Favorite,
  Exercise,
  WorkoutPlan,
  WorkoutDraft,
};
