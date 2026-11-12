// Owner: Kwan - user management (F04.3). Contractor accounts are linked to a company here.
// Each route is a placeholder until replaced with a controller function.
const router = require('express').Router()
const { authenticate, authorise } = require('../middleware')
const { notImplemented } = require('../utils')

const todo = notImplemented('Kwan')

router.get('/', authenticate, authorise('admin'), todo)
router.post('/', authenticate, authorise('admin'), todo)                       // { name, email, role, contractorId? }
router.patch('/:id', authenticate, authorise('admin'), todo)                   // change role, contractor, deactivate

module.exports = router
