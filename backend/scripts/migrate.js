import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), "../");

const action = process.argv[2] || "status";
const allowedCommands = {
  up: ["sequelize-cli", "db:migrate", "--env", "test"],
  status: ["sequelize-cli", "db:migrate:status", "--env", "test"],
  undo: ["sequelize-cli", "db:migrate:undo", "--env", "test"],
  seed: ["sequelize-cli", "db:seed:all", "--env", "test"],
};

const args = allowedCommands[action];
if (!args) {
  console.error(`Unknown migration action "${action}". Use: up | status | undo | seed`);
  process.exit(1);
}

const result = spawnSync("npx", args, {
  cwd: backendRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    MIGRATION_TARGET: "migration-test",
    MIGRATION_TEST_DB_NAME: "fitness_explorer_migration_test",
  },
});

process.exit(result.status ?? 1);
