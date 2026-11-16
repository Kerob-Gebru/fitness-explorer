const { DataTypes } = require("sequelize");

// These user-owned tables depend on users. Exercise links are nullable because
// mock and external exercises may exist only as snapshots, not catalog rows.
function getQueryInterface(context) {
  return context.queryInterface ?? context;
}

exports.up = async function up(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.createTable("auth_sessions", {
    id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    refresh_token_hash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
    },
    revoked_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    last_used_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
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
  });
  await queryInterface.addIndex("auth_sessions", ["refresh_token_hash"], {
    name: "auth_sessions_refresh_token_unique",
    unique: true,
  });
  await queryInterface.addIndex("auth_sessions", ["user_id", "expires_at"], {
    name: "auth_sessions_user_expiry",
  });

  await queryInterface.createTable("favorites", {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    // Keep this signed INT aligned with the existing exercises.id column.
    exercise_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "exercises", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    source: {
      type: DataTypes.ENUM("backend", "mock", "api"),
      allowNull: false,
    },
    source_exercise_id: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    exercise_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
  await queryInterface.addIndex(
    "favorites",
    ["user_id", "source", "source_exercise_id"],
    { name: "favorites_user_source_exercise_unique", unique: true }
  );
  await queryInterface.addIndex("favorites", ["user_id", "created_at"], {
    name: "favorites_user_created",
  });
  await queryInterface.addIndex("favorites", ["exercise_id"], {
    name: "favorites_exercise",
  });

  await queryInterface.createTable("workout_plans", {
    id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(300),
      allowNull: false,
      defaultValue: "",
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
  });
  await queryInterface.addIndex("workout_plans", ["user_id", "updated_at"], {
    name: "workout_plans_user_updated",
  });
  // MariaDB requires a unique referenced key for the composite ownership FK.
  await queryInterface.addIndex("workout_plans", ["user_id", "id"], {
    name: "workout_plans_user_id_unique",
    unique: true,
  });

  await queryInterface.createTable("workout_drafts", {
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "My training session",
    },
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
  });
}

exports.down = async function down(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.dropTable("workout_drafts");
  await queryInterface.dropTable("workout_plans");
  await queryInterface.dropTable("favorites");
  await queryInterface.dropTable("auth_sessions");
};
