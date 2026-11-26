// Define how Sequelize represents one row from the workout_drafts table.
// DataTypes describes each column, and the shared Sequelize instance connects
// this model to the configured database.
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// This model describes the existing workout_drafts table; it does not create or
// alter it. Attribute names match the existing snake_case column names.
const WorkoutDraft = sequelize.define(
  "WorkoutDraft",
  {
    // One draft per user; deleting the user deletes their draft.
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    // Title shown for the in-progress session.
    name: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "My training session",
    },
    // Target length of the session in minutes.
    goal_minutes: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 45,
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Explicit mapping avoids Sequelize guessing a table name.
    tableName: "workout_drafts",
    // Sequelize manages timestamps using the table's existing column names.
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default WorkoutDraft;
