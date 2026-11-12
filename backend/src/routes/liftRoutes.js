// Owner: Kwan - lift register, search and bulk import (F01.1, F01.2, F04.1, F04.5, F05.1, F05.2, F05.5)
// Each route is a placeholder until replaced with a controller function.
const router = require('express').Router()
const { authenticate, authorise } = require('../middleware')
const { notImplemented } = require('../utils')

const todo = notImplemented('Kwan')

router.get('/', authenticate, authorise('inspector', 'admin'), todo)           // ?q= search by lift code, block or street
router.post('/import', authenticate, authorise('admin'), todo)                // multipart CSV / Excel -> { accepted, rejected: [{ row, reason }] }
router.get('/:id', authenticate, authorise('inspector', 'admin'), todo)        // lift + its contractor
router.post('/', authenticate, authorise('admin'), todo)
router.patch('/:id', authenticate, authorise('admin'), todo)

module.exports = router
