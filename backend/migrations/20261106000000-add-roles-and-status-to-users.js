'use strict'

// Adds the lift spot-check roles (inspector, contractor) and account status
// columns used by login. ALTER TYPE ... ADD VALUE cannot run inside a
// transaction on older PostgreSQL, so this migration runs without one.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'inspector'`)
    await queryInterface.sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'contractor'`)
    await queryInterface.addColumn('users', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    })
    await queryInterface.addColumn('users', 'last_login_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'last_login_at')
    await queryInterface.removeColumn('users', 'is_active')
    // PostgreSQL cannot drop enum values, so rebuild the type with the original two roles.
    // Inspector and contractor accounts are downgraded to member first.
    const q = (sql) => queryInterface.sequelize.query(sql)
    await q(`UPDATE users SET role = 'member' WHERE role IN ('inspector', 'contractor')`)
    await q(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT`)
    await q(`ALTER TYPE "enum_users_role" RENAME TO "enum_users_role_old"`)
    await q(`CREATE TYPE "enum_users_role" AS ENUM ('admin', 'member')`)
    await q(`ALTER TABLE users ALTER COLUMN role TYPE "enum_users_role" USING role::text::"enum_users_role"`)
    await q(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'`)
    await q(`DROP TYPE "enum_users_role_old"`)
  },
}
