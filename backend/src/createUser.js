// Creates a real login account in the database in DATABASE_URL.
//
//   npm run db:create-user -- --email ops@example.com --name "Jane Tan" --role inspector
//
// Options:
//   --email     required
//   --name      required
//   --role      admin | inspector | contractor | member   (default: member)
//   --password  optional - a strong random password is generated and printed if omitted
//   --reset     update name/role/password if the account already exists
//
// The password is printed once and only its bcrypt hash is stored. Never commit it.
require('dotenv').config()
const sequelize = require('./config')
const { createOrResetUser } = require('./services/userService')

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) args[key] = true
    else { args[key] = next; i++ }
  }
  return args
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set - add it to backend/.env')
  const args = parseArgs(process.argv.slice(2))
  if (!args.email || !args.name) throw new Error('Usage: npm run db:create-user -- --email <email> --name "<name>" --role <role>')

  const result = await createOrResetUser({
    email: String(args.email),
    name: String(args.name),
    role: String(args.role || 'member'),
    password: typeof args.password === 'string' ? args.password : undefined,
    reset: Boolean(args.reset),
  })
  console.log(`${result.created ? 'Created' : 'Updated'} ${result.user.role} account`)
  console.log(`  Email:    ${result.user.email}`)
  console.log(`  Password: ${result.password}`)
}

main()
  .catch((err) => {
    console.error('Could not create user:', err.message)
    process.exitCode = 1
  })
  .finally(() => sequelize.close())
