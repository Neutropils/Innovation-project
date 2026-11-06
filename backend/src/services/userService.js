const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { User, ROLES } = require('../models')

const BCRYPT_ROUNDS = 12

// Readable random password: 4 groups of 4 characters without look-alikes (0/O, 1/l/I).
function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(16)
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return chars.match(/.{4}/g).join('-')
}

function toPublic(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
}

// Creates an account, or with { reset: true } updates the name/role/password of an existing one.
async function createOrResetUser({ name, email, role, password, reset = false }) {
  if (!ROLES.includes(role)) {
    const err = new Error(`Role must be one of: ${ROLES.join(', ')}`)
    err.status = 422
    throw err
  }
  if (password && password.length < 8) {
    const err = new Error('Password must be at least 8 characters')
    err.status = 422
    throw err
  }
  const normalisedEmail = email.trim().toLowerCase()
  const plainPassword = password || generatePassword()
  const hash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS)

  const existing = await User.findOne({ where: { email: normalisedEmail } })
  if (existing && !reset) {
    const err = new Error(`An account for ${normalisedEmail} already exists (use --reset to change it)`)
    err.status = 409
    throw err
  }
  const user = existing
    ? await existing.update({ name, role, password: hash, isActive: true })
    : await User.create({ name, email: normalisedEmail, role, password: hash })

  return { user: toPublic(user), password: plainPassword, created: !existing }
}

module.exports = { createOrResetUser, generatePassword, BCRYPT_ROUNDS }
