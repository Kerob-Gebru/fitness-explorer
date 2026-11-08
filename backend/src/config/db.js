import dotenv from "dotenv";
import { Sequelize } from "sequelize";

// Load backend settings from .env while keeping credentials outside source code.
dotenv.config();

// One shared Sequelize instance owns the application's database connections.
// The MySQL dialect also works with the existing MariaDB-compatible database.
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

// Authentication checks the credentials and network connection without
// creating, altering, or synchronizing any database tables.
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
