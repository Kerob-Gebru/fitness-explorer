const { DataTypes, literal } = require("sequelize");

// Calendar entries are created before sessions because a session can point
// back to its scheduled entry. Deleting a plan or schedule preserves history.
function getQueryInterface(context) {
  return context.queryInterface ?? context;
}

exports.up = async function up(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.createTable("scheduled_workouts", {
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
    // The companion owner lets the composite FK be cleared without nulling
    // this scheduled workout's own, required user_id.
    plan_user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    plan_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    scheduled_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    scheduled_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING(300),
      allowNull: false,
      defaultValue: "",
    },
    status: {
      type: DataTypes.ENUM(
        "scheduled",
        "in-progress",
        "completed",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "scheduled",
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
  await queryInterface.addIndex(
    "scheduled_workouts",
    ["user_id", "scheduled_date", "scheduled_time"],
    { name: "scheduled_workouts_user_date_time" }
  );
  await queryInterface.addIndex(
    "scheduled_workouts",
    ["user_id", "status", "scheduled_date"],
    { name: "scheduled_workouts_user_status_date" }
  );
  await queryInterface.addIndex("scheduled_workouts", ["plan_id"], {
    name: "scheduled_workouts_plan",
  });
  await queryInterface.addIndex(
    "scheduled_workouts",
    ["plan_user_id", "plan_id"],
    { name: "scheduled_workouts_plan_owner_reference" }
  );
  await queryInterface.addIndex("scheduled_workouts", ["user_id", "id"], {
    name: "scheduled_workouts_user_id_unique",
    unique: true,
  });
  await queryInterface.addConstraint("scheduled_workouts", {
    fields: ["plan_user_id", "plan_id"],
    type: "CHECK",
    name: "scheduled_workouts_plan_owner_check",
    where: literal(
      "(`plan_user_id` IS NULL AND `plan_id` IS NULL) OR (`plan_user_id` IS NOT NULL AND `plan_id` IS NOT NULL AND `plan_user_id` = `user_id`)"
    ),
  });
  await queryInterface.addConstraint("scheduled_workouts", {
    fields: ["plan_user_id", "plan_id"],
    type: "FOREIGN KEY",
    name: "scheduled_workouts_plan_owner_fk",
    references: {
      table: "workout_plans",
      fields: ["user_id", "id"],
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  await queryInterface.createTable("workout_sessions", {
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
    // Optional ownership columns allow SET NULL on the composite source links
    // without changing the owner of the historical session itself.
    plan_user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    plan_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    scheduled_workout_user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    scheduled_workout_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    scheduled_for: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "paused", "completed", "ended-early"),
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
    },
    resumed_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    duration_seconds: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    elapsed_seconds: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    current_exercise_position: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    rest_duration_seconds: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
    },
    rest_remaining_seconds: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
    },
    rest_ends_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    rest_paused: {
      type: DataTypes.BOOLEAN,
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
  await queryInterface.addIndex(
    "workout_sessions",
    ["user_id", "status", "started_at"],
    { name: "workout_sessions_user_status_started" }
  );
  await queryInterface.addIndex("workout_sessions", ["user_id", "completed_at"], {
    name: "workout_sessions_user_completed",
  });
  await queryInterface.addIndex("workout_sessions", ["plan_id"], {
    name: "workout_sessions_plan",
  });
  await queryInterface.addIndex("workout_sessions", ["scheduled_workout_id"], {
    name: "workout_sessions_scheduled_workout",
  });
  await queryInterface.addIndex(
    "workout_sessions",
    ["plan_user_id", "plan_id"],
    { name: "workout_sessions_plan_owner_reference" }
  );
  await queryInterface.addIndex(
    "workout_sessions",
    ["scheduled_workout_user_id", "scheduled_workout_id"],
    { name: "workout_sessions_schedule_owner_reference" }
  );
  await queryInterface.addConstraint("workout_sessions", {
    fields: ["plan_user_id", "plan_id"],
    type: "CHECK",
    name: "workout_sessions_plan_owner_check",
    where: literal(
      "(`plan_user_id` IS NULL AND `plan_id` IS NULL) OR (`plan_user_id` IS NOT NULL AND `plan_id` IS NOT NULL AND `plan_user_id` = `user_id`)"
    ),
  });
  await queryInterface.addConstraint("workout_sessions", {
    fields: ["plan_user_id", "plan_id"],
    type: "FOREIGN KEY",
    name: "workout_sessions_plan_owner_fk",
    references: {
      table: "workout_plans",
      fields: ["user_id", "id"],
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });
  await queryInterface.addConstraint("workout_sessions", {
    fields: ["scheduled_workout_user_id", "scheduled_workout_id"],
    type: "CHECK",
    name: "workout_sessions_schedule_owner_check",
    where: literal(
      "(`scheduled_workout_user_id` IS NULL AND `scheduled_workout_id` IS NULL) OR (`scheduled_workout_user_id` IS NOT NULL AND `scheduled_workout_id` IS NOT NULL AND `scheduled_workout_user_id` = `user_id`)"
    ),
  });
  await queryInterface.addConstraint("workout_sessions", {
    fields: ["scheduled_workout_user_id", "scheduled_workout_id"],
    type: "FOREIGN KEY",
    name: "workout_sessions_schedule_owner_fk",
    references: {
      table: "scheduled_workouts",
      fields: ["user_id", "id"],
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });
}

exports.down = async function down(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.dropTable("workout_sessions");
  await queryInterface.dropTable("scheduled_workouts");
};
