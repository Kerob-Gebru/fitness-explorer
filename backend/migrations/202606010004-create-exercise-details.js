const { DataTypes } = require("sequelize");

// These child tables are created last so every referenced parent exists.
// Each optional exercise_id is a signed INT matching exercises.id exactly.
function getQueryInterface(context) {
  return context.queryInterface ?? context;
}

exports.up = async function up(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.createTable("workout_plan_exercises", {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    plan_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: "workout_plans", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    position: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
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
    sets: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    reps: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
    },
    rest_seconds: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
  });
  await queryInterface.addIndex("workout_plan_exercises", ["plan_id", "position"], {
    name: "workout_plan_exercises_plan_position_unique",
    unique: true,
  });
  await queryInterface.addIndex("workout_plan_exercises", ["exercise_id"], {
    name: "workout_plan_exercises_exercise",
  });

  await queryInterface.createTable("workout_draft_exercises", {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: "workout_drafts", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    position: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
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
    sets: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    reps: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
    },
    rest_seconds: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
    builder_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });
  await queryInterface.addIndex(
    "workout_draft_exercises",
    ["user_id", "position"],
    { name: "workout_draft_exercises_user_position_unique", unique: true }
  );
  await queryInterface.addIndex("workout_draft_exercises", ["exercise_id"], {
    name: "workout_draft_exercises_exercise",
  });

  await queryInterface.createTable("scheduled_workout_exercises", {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    scheduled_workout_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: "scheduled_workouts", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    position: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
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
    sets: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    reps: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
    },
    rest_seconds: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
  });
  await queryInterface.addIndex(
    "scheduled_workout_exercises",
    ["scheduled_workout_id", "position"],
    { name: "scheduled_workout_exercises_schedule_position_unique", unique: true }
  );
  await queryInterface.addIndex("scheduled_workout_exercises", ["exercise_id"], {
    name: "scheduled_workout_exercises_exercise",
  });

  await queryInterface.createTable("workout_session_exercises", {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    session_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: "workout_sessions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    position: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
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
    planned_sets: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    target_reps: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
    },
    rest_seconds: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "skipped"),
      allowNull: false,
      defaultValue: "pending",
    },
  });
  await queryInterface.addIndex(
    "workout_session_exercises",
    ["session_id", "position"],
    { name: "workout_session_exercises_session_position_unique", unique: true }
  );
  await queryInterface.addIndex("workout_session_exercises", ["exercise_id"], {
    name: "workout_session_exercises_exercise",
  });

  await queryInterface.createTable("workout_session_sets", {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    session_exercise_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: "workout_session_exercises", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    set_number: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    reps: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
    },
    target_reps: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    weight: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
    },
    weight_unit: {
      type: DataTypes.ENUM("kg", "lb"),
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: "",
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });
  await queryInterface.addIndex(
    "workout_session_sets",
    ["session_exercise_id", "set_number"],
    { name: "workout_session_sets_exercise_number_unique", unique: true }
  );
}

exports.down = async function down(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.dropTable("workout_session_sets");
  await queryInterface.dropTable("workout_session_exercises");
  await queryInterface.dropTable("scheduled_workout_exercises");
  await queryInterface.dropTable("workout_draft_exercises");
  await queryInterface.dropTable("workout_plan_exercises");
};
