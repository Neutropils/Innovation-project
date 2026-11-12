// Owner: Jerald - contractor inbox, progress, evidence, sign-off and inspector verification (F03)
// Each route is a placeholder until replaced with a controller function.
// Status changes go through defectService.transition() - see design/workflow-diagram.md.
const router = require('express').Router()
const { authenticate, authorise } = require('../middleware')
const { notImplemented } = require('../utils')

const todo = notImplemented('Jerald')

// /api/defects/:id/... (same prefix as Si Qi's defectRoutes, different paths)
router.post('/:id/acknowledge', authenticate, authorise('contractor'), todo)              // open -> acknowledged
router.post('/:id/updates', authenticate, authorise('contractor'), todo)                  // { note } ; first one: acknowledged -> in_progress
router.post('/:id/signoff', authenticate, authorise('contractor'), todo)                  // { confirmationText } ; needs evidence -> pending_verification
router.post('/:id/verify', authenticate, authorise('inspector', 'admin'), todo)           // { decision, reason } -> closed / in_progress
router.get('/:id/signoffs', authenticate, authorise('inspector', 'admin', 'contractor'), todo)

// /api/inbox
const inboxRouter = require('express').Router()
inboxRouter.get('/', authenticate, authorise('contractor'), todo)                         // own company's defects, ?status=

// /api/attachments
const attachmentRouter = require('express').Router()
attachmentRouter.post('/', authenticate, authorise('inspector', 'contractor'), todo)      // multipart photo -> { id, url }

module.exports = router
module.exports.inboxRouter = inboxRouter
module.exports.attachmentRouter = attachmentRouter
