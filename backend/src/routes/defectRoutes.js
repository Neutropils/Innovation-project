// Owner: Si Qi - defect list, detail, reassignment, history, export, overview (F02, F05.4, F05.6, F08)
// Each route is a placeholder until replaced with a controller function.
// Contractor actions on a defect (acknowledge, sign off, verify) live in Jerald's
// rectificationRoutes.js, which is mounted on the same /defects prefix.
const router = require('express').Router()
const { authenticate, authorise } = require('../middleware')
const { notImplemented } = require('../utils')

const todo = notImplemented('Si Qi')

// /api/defects
router.get('/', authenticate, authorise('inspector', 'admin'), todo)              // ?contractorId=&status=&severity=&overdue=&liftId=
router.get('/export', authenticate, authorise('inspector', 'admin'), todo)        // CSV, same filters
router.get('/:id', authenticate, authorise('inspector', 'admin', 'contractor'), todo)  // contractor: own company only
router.get('/:id/history', authenticate, authorise('inspector', 'admin', 'contractor'), todo)
router.patch('/:id/assign', authenticate, authorise('admin'), todo)               // { contractorId, reason }

// /api/overview
const overviewRouter = require('express').Router()
overviewRouter.get('/', authenticate, authorise('admin'), todo)                   // ?from=&to= counts

module.exports = router
module.exports.overviewRouter = overviewRouter
