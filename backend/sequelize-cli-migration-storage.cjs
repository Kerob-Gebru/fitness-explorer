const { DataTypes } = require("sequelize");

const MIGRATION_TEST_DATABASE = "fitness_explorer_migration_test";

class MigrationStorage {
  constructor({ sequelize }) {
    if (sequelize.config.database !== MIGRATION_TEST_DATABASE) {
      throw new Error(
        `Refusing migration storage access to database "${sequelize.config.database}".`
      );
    }

    this.model = sequelize.define(
      "FitnessExplorerSequelizeMeta",
      {
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          primaryKey: true,
        },
        executed_at: {
          type: DataTypes.DATE(3),
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        tableName: "SequelizeMeta",
        timestamps: false,
      }
    );
  }

  async executed() {
    const rows = await this.model.sync().then(() =>
      this.model.findAll({
        attributes: ["name"],
        order: [["name", "ASC"]],
      })
    );
    return rows.map((row) => row.name);
  }

  async logMigration(name) {
    await this.model.sync();
    await this.model.create({ name });
  }

  async unlogMigration(name) {
    await this.model.sync();
    await this.model.destroy({ where: { name } });
  }
}

module.exports = MigrationStorage;
