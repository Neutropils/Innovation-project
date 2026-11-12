// Owner: Kandha - checklist and inspections (F01.3-F01.12, F05.3)
// Each route is a placeholder until replaced with a controller function.
// Mounted at /inspections and /checklist-items in routes/index.js.
const router = require('express').Router()
const { authenticate, authorise } = require('../middleware')
const { notImplemented } = require('../utils')

const todo = notImplemented('Kandha')

// /api/inspections
router.get('/', authenticate, authorise('inspector', 'admin'), todo)          // ?liftId=&from=&to= history
router.get('/export', authenticate, authorise('inspector', 'admin'), todo)    // CSV, same filters
router.post('/', authenticate, authorise('inspector'), todo)                  // { liftId } -> new draft
router.get('/:id', authenticate, authorise('inspector', 'admin'), todo)       // inspection + results + defects
router.put('/:id/results', authenticate, authorise('inspector'), todo)        // save draft answers
router.post('/:id/submit', authenticate, authorise('inspector'), todo)        // validate, submit, then defectService.createFromInspection()

// /api/checklist-items
const checklistRouter = require('express').Router()
checklistRouter.get('/', authenticate, authorise('inspector', 'admin'), todo) // active items grouped by section

module.exports = router
module.exports.checklistRouter = checklistRouter
