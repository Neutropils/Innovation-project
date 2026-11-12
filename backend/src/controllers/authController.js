const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { User } = require('../models')
const { success, created, error } = require('../utils')
const { registerSchema, loginSchema } = require('../validators')

function signToken(user) {
  const secret = process.env.NODE_ENV === 'production'
    ? process.env.JWT_SECRET
    : process.env.DEV_JWT_SECRET
  return jwt.sign(
    // contractorId: the lift company of a contractor account (null for other roles), so
    // contractor routes can filter by company without another database lookup
    { sub: user.id, name: user.name, email: user.email, role: user.role, contractorId: user.contractorId ?? null },
    secret,
    { expiresIn: '8h' }
  )
}

async function register(req, res) {
  try {
    const body = await registerSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    const email = body.email.trim().toLowerCase()
    const exists = await User.findOne({ where: { email } })
    if (exists) return error(res, 'An account with this email already exists.', 'EMAIL_IN_USE', 409)
    const hash = await bcrypt.hash(body.password, 12)
    // New accounts are always members - promote to admin directly in the database
    const user = await User.create({ name: body.name, email, password: hash, role: 'member' })
    const token = signToken(user)
    return created(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    if (err.name === 'ValidationError') return error(res, err.errors.join(', '), 'VALIDATION_ERROR', 422)
    return error(res, err.message, 'INTERNAL_ERROR', 500)
  }
}

// A real bcrypt hash (cost 12) used when the email is unknown, so the response time
// does not reveal which emails have accounts. Computed once on first use.
let dummyHash
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync('timing-equaliser', 12)
  return dummyHash
}

async function login(req, res) {
  try {
    const body = await loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    const user = await User.findOne({ where: { email: body.email.trim().toLowerCase() } })
    // Always run bcrypt, even when the user is not found, to prevent timing attacks
    const valid = await bcrypt.compare(body.password, user ? user.password : getDummyHash())
    if (!user || !valid) return error(res, 'Invalid email or password.', 'INVALID_CREDENTIALS', 401)
    if (!user.isActive) {
      return error(res, 'This account has been deactivated. Contact your administrator.', 'ACCOUNT_DISABLED', 403)
    }
    await user.update({ lastLoginAt: new Date() })
    const token = signToken(user)
    return success(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    if (err.name === 'ValidationError') return error(res, err.errors.join(', '), 'VALIDATION_ERROR', 422)
    return error(res, err.message, 'INTERNAL_ERROR', 500)
  }
}

module.exports = { register, login }
