// This module creates and exports the one Sequelize connection used by the
// models. Keeping connection settings here avoids duplicating them elsewhere.
// dotenv reads environment settings, and Sequelize provides the MySQL ORM.
import dotenv from "dotenv";
import { Sequelize } from "sequelize";

// Load backend settings from .env while keeping credentials outside source code.
dotenv.config();

// One shared Sequelize instance owns the application's database connections.
// Environment variables keep deployment-specific credentials out of source;
// the fallback values are convenient defaults for local development.
// Sequelize's MySQL dialect also works with the existing MariaDB-compatible DB.
const sequelize = new Sequelize(
  process.env.DB_NAME || "fitness_explorer",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    dialect: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    logging: false,
    // The pool reuses connections rather than opening one for every query.
    // `max` caps simultaneous connections; `acquire` and `idle` are timeouts
    // in milliseconds for obtaining and retiring pooled connections.
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Called during server startup to check credentials and network connectivity.
// authenticate() issues a connection check only; it does not create, alter, or
// synchronize tables, so the existing database schema is left untouched.
export async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully!");
  } catch (error) {
    // Log the underlying database reason for operators, then rethrow so the
    // server's startup function can stop the process rather than hide failure.
    console.error("Database connection failed:", error.message);
    throw error;
  }
}

// Models import this same instance so all queries share the configured pool.
export default sequelize;
