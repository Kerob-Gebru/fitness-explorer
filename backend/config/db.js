// This module creates and exports the one Sequelize connection used by the
// models. Keeping connection settings here avoids duplicating them elsewhere.
import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "fitness_explorer",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    dialect: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
}

export default sequelize;
