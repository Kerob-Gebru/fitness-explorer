// Define how Sequelize represents one row from the user_profiles table.
// DataTypes describes each column, and the shared Sequelize instance connects
// this model to the configured database.
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import {
  USER_PROFILE_COLUMNS,
  USER_PROFILE_INDEXES,
  USER_PROFILE_TABLE_METADATA,
  USER_PROFILE_TABLE_NAME,
} from "./userProfileSchema.js";

// This model describes the user_profiles table; attribute names match snake_case columns.
const UserProfile = sequelize.define(
  "UserProfile",
  {
    // One profile row per user; deleting the user deletes their profile.
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    first_name: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "",
    },
    last_name: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "",
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "",
    },
    handle: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "",
    },
    location: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "",
    },
    bio: {
      type: DataTypes.STRING(240),
      allowNull: false,
      defaultValue: "",
    },
    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    weight_kg: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: true,
      defaultValue: null,
    },
    target_weight_kg: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: true,
      defaultValue: null,
    },
    height_cm: {
      type: DataTypes.DECIMAL(5, 1),
      allowNull: true,
      defaultValue: null,
    },
    resting_heart_rate: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    },
    units: {
      type: DataTypes.ENUM("metric", "imperial"),
      allowNull: false,
      defaultValue: "metric",
    },
    latest_measurement_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
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
    tableName: USER_PROFILE_TABLE_NAME,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: USER_PROFILE_INDEXES.map((index) => ({ ...index })),
  }
);

export {
  USER_PROFILE_TABLE_NAME,
  USER_PROFILE_COLUMNS,
  USER_PROFILE_INDEXES,
  USER_PROFILE_TABLE_METADATA,
};

export default UserProfile;
