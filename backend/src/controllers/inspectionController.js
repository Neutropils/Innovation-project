// Owner: Kandha - request/response handling for inspections. Business logic is in
// services/inspectionService.js; this file only validates input and shapes the response.
const inspectionService = require('../services/inspectionService')
const { createInspectionSchema, saveResultsSchema, listQuerySchema } = require('../validators/inspectionValidator')
const { success, created, error } = require('../utils')

const YUP_OPTIONS = { abortEarly: false, stripUnknown: true }

// Turns a thrown appError / Yup ValidationError into the standard error response.
function handle(fn) {
  return async (req, res) => {
    try {
      return await fn(req, res)
    } catch (err) {
      if (err.name === 'ValidationError') return error(res, err.errors.join(', '), 'VALIDATION_ERROR', 422)
      if (err.status) {
        // submit() attaches the named items so the page can outline them
        // `error` repeats the contract's name for this failure next to the skeleton's success/code/message
        if (err.details) return res.status(err.status).json({ success: false, error: 'VALIDATION_FAILED', code: err.code, message: err.message, ...err.details })
        return error(res, err.message, err.code, err.status)
      }
      console.error('[inspections]', err)
      return error(res, 'Something went wrong on our side.', 'INTERNAL_ERROR', 500)
    }
  }
}

const parseId = (req) => {
  const id = Number(req.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}
const badId = (res) => error(res, 'Inspection not found', 'NOT_FOUND', 404)

const getChecklistItems = handle(async (req, res) => {
  const { sections, meta } = await inspectionService.getChecklist()
  return res.json({ success: true, data: sections, meta })
})

const createInspection = handle(async (req, res) => {
  const { liftId } = await createInspectionSchema.validate(req.body, YUP_OPTIONS)
  const { created: isNew, inspection } = await inspectionService.createOrGetDraft(req.user, liftId)
  return isNew ? created(res, inspection) : success(res, inspection)
})

const listInspections = handle(async (req, res) => {
  const filters = await listQuerySchema.validate(req.query, YUP_OPTIONS)
  return success(res, await inspectionService.listInspections(req.user, filters))
})

const exportInspections = handle(async (req, res) => {
  const filters = await listQuerySchema.validate(req.query, YUP_OPTIONS)
  const { csv } = await inspectionService.exportCsv(req.user, filters)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="inspections-${today}.csv"`)
  return res.status(200).send(csv)
})

const getInspection = handle(async (req, res) => {
  const id = parseId(req)
  if (!id) return badId(res)
  return success(res, await inspectionService.getInspection(id, req.user))
})

const saveResults = handle(async (req, res) => {
  const id = parseId(req)
  if (!id) return badId(res)
  const { results } = await saveResultsSchema.validate(req.body, YUP_OPTIONS)
  return success(res, await inspectionService.saveResults(req.user, id, results))
})

const submitInspection = handle(async (req, res) => {
  const id = parseId(req)
  if (!id) return badId(res)
  return success(res, await inspectionService.submit(req.user, id))
})

module.exports = {
  getChecklistItems, createInspection, listInspections, exportInspections,
  getInspection, saveResults, submitInspection,
}
