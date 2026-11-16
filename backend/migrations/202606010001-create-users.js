const { DataTypes } = require("sequelize");

// Account rows are created before any private records that refer to users.id.
function getQueryInterface(context) {
  return context.queryInterface ?? context;
}

exports.up = async function up(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.createTable("users", {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
    },
    display_name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    weekly_workout_goal: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 3,
    },
    monthly_workout_goal: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 12,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  await queryInterface.addIndex("users", ["email"], {
    name: "users_email_unique",
    unique: true,
  });
}

exports.down = async function down(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.dropTable("users");
};
