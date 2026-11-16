const { DataTypes, literal } = require("sequelize");

// Keep rotated sessions so a reused token can identify and revoke its family.
// Existing sessions receive independent family IDs before the column is made
// required; no existing session row is deleted or replaced.
function getQueryInterface(context) {
  return context.queryInterface ?? context;
}

exports.up = async function up(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.addColumn("auth_sessions", "token_family_id", {
    type: DataTypes.CHAR(36),
    allowNull: true,
  });

  await queryInterface.bulkUpdate(
    "auth_sessions",
    { token_family_id: literal("UUID()") },
    { token_family_id: null }
  );

  await queryInterface.changeColumn("auth_sessions", "token_family_id", {
    type: DataTypes.CHAR(36),
    allowNull: false,
  });

  await queryInterface.addColumn(
    "auth_sessions",
    "replaced_by_session_id",
    {
      type: DataTypes.CHAR(36),
      allowNull: true,
    }
  );
  await queryInterface.addConstraint("auth_sessions", {
    fields: ["replaced_by_session_id"],
    type: "FOREIGN KEY",
    name: "auth_sessions_replaced_by_session_fk",
    references: {
      table: "auth_sessions",
      field: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  await queryInterface.addIndex(
    "auth_sessions",
    ["user_id", "token_family_id", "revoked_at"],
    { name: "auth_sessions_user_family_revoked" }
  );
  await queryInterface.addIndex(
    "auth_sessions",
    ["replaced_by_session_id"],
    { name: "auth_sessions_replaced_by_session" }
  );
}

exports.down = async function down(context) {
  const queryInterface = getQueryInterface(context);
  await queryInterface.removeConstraint(
    "auth_sessions",
    "auth_sessions_replaced_by_session_fk"
  );
  await queryInterface.removeIndex(
    "auth_sessions",
    "auth_sessions_replaced_by_session"
  );
  await queryInterface.removeIndex(
    "auth_sessions",
    "auth_sessions_user_family_revoked"
  );
  await queryInterface.removeColumn("auth_sessions", "replaced_by_session_id");
  await queryInterface.removeColumn("auth_sessions", "token_family_id");
};
