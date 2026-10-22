const router = require('express').Router()

// ─── Shared Auth ───────────────────────────────────────────────────────────────
const authRoutes = require('./authRoutes')              // POST /auth/register, POST /auth/login
router.use('/auth', authRoutes)

// ─── <Teammate name>: <feature area> ──────────────────────────────────────────
// const projectRoutes = require('./projectRoutes')
// router.use('/projects', projectRoutes)

module.exports = router
