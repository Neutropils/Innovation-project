// Run with `npm run db:test` to check your DATABASE_URL and list existing tables.
require('dotenv').config()
const sequelize = require('./config')

async function test() {
  try {
    await sequelize.authenticate()
    console.log('Connection successful.')

    const [results] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    )
    console.log('Tables:', results ? results.map(r => r.table_name) : [])
  } catch (err) {
    console.error('Connection failed:', err.message)
  } finally {
    await sequelize.close()
  }
}

test()
