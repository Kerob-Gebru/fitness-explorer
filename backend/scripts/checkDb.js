import "../config/loadEnv.js";
import { sequelize, testDatabaseConnection } from "../config/db.js";
import * as models from "../models/index.js";

async function checkDatabase() {
  try {
    await testDatabaseConnection();
    const registeredModels = Object.keys(models).filter((key) => key !== "sequelize");
    console.log("Registered Sequelize models:", registeredModels.join(", "));
  } catch (error) {
    console.error("Database check failed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

checkDatabase();
