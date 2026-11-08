import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// This model describes the existing database table; it does not create or
// alter that table. Attribute names match the current snake_case columns.
const Exercise = sequelize.define(
  "Exercise",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    external_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    body_part: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    target_muscle: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    equipment: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gif_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "exercises",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["body_part"] },
      { fields: ["target_muscle"] },
      { fields: ["equipment"] },
    ],
  }
);

export default Exercise;
