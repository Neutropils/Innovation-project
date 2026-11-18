// Owner: Si Qi - request/response handling for defects. Business logic is in
// services/defectService.js; this file only validates input and shapes the response.
const defectService = require('../services/defectService')
const { assignSchema } = require('../validators/defectValidator')
const { success, error } = require('../utils')

const YUP_OPTIONS = { abortEarly: false, stripUnknown: true }

// Turns a thrown appError / Yup ValidationError into the standard error response.
function handle(fn) {
  return async (req, res) => {
    try {
      return await fn(req, res)
    } catch (err) {
      if (err.name === 'ValidationError') return error(res, err.errors.join(', '), 'VALIDATION_ERROR', 422)
      if (err.status) return error(res, err.message, err.code, err.status)
      console.error('[defects]', err)
      return error(res, 'Something went wrong on our side.', 'INTERNAL_ERROR', 500)
    }
  }
}

// Non-numeric ids answer 404, like a defect that does not exist
function withId(fn) {
  return handle(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) return error(res, 'Defect not found', 'NOT_FOUND', 404)
    return fn(req, res, id)
  })
}

// GET /api/defects/:id
const getDefect = withId(async (req, res, id) => success(res, await defectService.getDefect(id, req.user)))

// GET /api/defects/:id/history
const getHistory = withId(async (req, res, id) => success(res, await defectService.getHistory(id, req.user)))

// PATCH /api/defects/:id/assign  { contractorId, reason }
const assign = withId(async (req, res, id) => {
  const body = await assignSchema.validate(req.body, YUP_OPTIONS)
  return success(res, await defectService.reassign(id, body, req.user))
})

module.exports = { getDefect, getHistory, assign }
