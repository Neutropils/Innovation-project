// Applies database migrations from backend/migrations to the database in DATABASE_URL.
//   npm run db:migrate          apply every pending migration
//   npm run db:migrate -- --undo  revert the most recent migration
// Applied migrations are recorded in the "SequelizeMeta" table - the same table
// sequelize-cli uses, so the two tools stay compatible.
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Sequelize } = require('sequelize')
const sequelize = require('./config')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')

async function appliedNames() {
  await sequelize.query('CREATE TABLE IF NOT EXISTS "SequelizeMeta" (name VARCHAR(255) PRIMARY KEY)')
  const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name')
  return rows.map((r) => r.name)
}

async function run() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set - add it to backend/.env')
  const qi = sequelize.getQueryInterface()
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort()
  const applied = await appliedNames()

  if (process.argv.includes('--undo')) {
    const last = applied[applied.length - 1]
    if (!last) return console.log('Nothing to undo.')
    await require(path.join(MIGRATIONS_DIR, last)).down(qi, Sequelize)
    await sequelize.query('DELETE FROM "SequelizeMeta" WHERE name = ?', { replacements: [last] })
    return console.log(`Reverted ${last}`)
  }

  const pending = files.filter((f) => !applied.includes(f))
  if (pending.length === 0) return console.log('Database is up to date.')
  for (const file of pending) {
    await require(path.join(MIGRATIONS_DIR, file)).up(qi, Sequelize)
    await sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES (?)', { replacements: [file] })
    console.log(`Applied ${file}`)
  }
}

run()
  .catch((err) => {
    console.error('Migration failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => sequelize.close())
