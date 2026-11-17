// Owner: Kandha - checklist and inspections (F01.3-F01.12, F05.3)
// Mounted at /inspections and /checklist-items in routes/index.js.
const router = require('express').Router()
const { authenticate, authorise } = require('../middleware')
const controller = require('../controllers/inspectionController')

// /api/inspections
router.get('/', authenticate, authorise('inspector', 'admin'), controller.listInspections)          // ?liftId=&from=&to=&status=&result= history
router.get('/export', authenticate, authorise('inspector', 'admin'), controller.exportInspections)  // CSV, same filters (+ ?inspectionId=)
router.post('/', authenticate, authorise('inspector'), controller.createInspection)                 // { liftId } -> draft (existing one if any)
router.get('/:id', authenticate, authorise('inspector', 'admin'), controller.getInspection)         // inspection + results + defects
router.put('/:id/results', authenticate, authorise('inspector'), controller.saveResults)            // save draft answers
router.post('/:id/submit', authenticate, authorise('inspector'), controller.submitInspection)       // validate, submit, defectService.createFromInspection()

// /api/checklist-items
const checklistRouter = require('express').Router()
checklistRouter.get('/', authenticate, authorise('inspector', 'admin'), controller.getChecklistItems) // active items grouped by section

module.exports = router
module.exports.checklistRouter = checklistRouter
