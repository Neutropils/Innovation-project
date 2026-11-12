const router = require('express').Router()

// Every router is mounted here already (skeleton PR), so you should not need to edit
// this file - add endpoints inside your own router file instead.
// Full endpoint list: design/feature-dependencies.md ("API contract").

// ─── Shared Auth ───────────────────────────────────────────────────────────────
const authRoutes = require('./authRoutes')              // POST /auth/register, POST /auth/login
router.use('/auth', authRoutes)

// ─── Kwan: lift and contractor records, users ─────────────────────────────────
router.use('/lifts', require('./liftRoutes'))
router.use('/contractors', require('./contractorRoutes'))
router.use('/users', require('./userRoutes'))

// ─── Kandha: inspections ──────────────────────────────────────────────────────
const inspectionRoutes = require('./inspectionRoutes')
router.use('/inspections', inspectionRoutes)
router.use('/checklist-items', inspectionRoutes.checklistRouter)

// ─── Si Qi: defects and overview ──────────────────────────────────────────────
const defectRoutes = require('./defectRoutes')
router.use('/defects', defectRoutes)
router.use('/overview', defectRoutes.overviewRouter)

// ─── Jerald: rectification and sign-off ───────────────────────────────────────
const rectificationRoutes = require('./rectificationRoutes')
router.use('/defects', rectificationRoutes)
router.use('/inbox', rectificationRoutes.inboxRouter)
router.use('/attachments', rectificationRoutes.attachmentRouter)

module.exports = router
