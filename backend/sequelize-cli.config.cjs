require("dotenv").config();
const path = require("node:path");

const MIGRATION_TEST_DATABASE = "fitness_explorer_migration_test";

module.exports = function getSequelizeCliConfig() {
  if (
    process.env.MIGRATION_TARGET !== "migration-test" ||
    process.env.MIGRATION_TEST_DB_NAME !== MIGRATION_TEST_DATABASE
  ) {
    throw new Error(
      'Refusing Sequelize CLI access: explicitly set MIGRATION_TARGET="migration-test" and MIGRATION_TEST_DB_NAME="fitness_explorer_migration_test".'
    );
  }

  process.env.DB_NAME = MIGRATION_TEST_DATABASE;

  return {
    test: {
      database: MIGRATION_TEST_DATABASE,
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      dialect: "mysql",
      logging: false,
      migrationStorage: path.resolve(
        __dirname,
        "sequelize-cli-migration-storage.cjs"
      ),
      migrationStorageTableName: "SequelizeMeta",
      seederStorage: "sequelize",
      seederStorageTableName: "SequelizeData",
    },
  };
};
