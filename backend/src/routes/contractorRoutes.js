// Owner: Kwan - contractor register (F04.2, F04.4)
// Each route is a placeholder until replaced with a controller function.
const router = require('express').Router()
const { authenticate, authorise } = require('../middleware')
const { notImplemented } = require('../utils')

const todo = notImplemented('Kwan')

router.get('/', authenticate, authorise('inspector', 'admin'), todo)
router.get('/:id', authenticate, authorise('inspector', 'admin'), todo)        // contractor + its lifts
router.post('/', authenticate, authorise('admin'), todo)
router.patch('/:id', authenticate, authorise('admin'), todo)

module.exports = router
