// Owner: Kandha - Yup schemas for the inspection endpoints.
// Use with { abortEarly: false, stripUnknown: true } (see inspectionController).
const Yup = require('yup')

const SEVERITY_VALUES = ['critical', 'major', 'minor']
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

// POST /api/inspections
const createInspectionSchema = Yup.object({
  liftId: Yup.number().integer('liftId must be a whole number').positive('liftId must be positive').required('liftId is required'),
})

// One answer in PUT /api/inspections/:id/results. A draft may be incomplete, so only the
// item id is required: result can be null to clear an answer.
const resultEntrySchema = Yup.object({
  checklistItemId: Yup.number().integer().positive().required('checklistItemId is required'),
  result: Yup.string().oneOf(['pass', 'defect'], 'result must be pass or defect').nullable().default(null),
  description: Yup.string().trim().max(2000, 'Description is too long').nullable().default(null),
  location: Yup.string().trim().max(150, 'Location must be 150 characters or fewer').nullable().default(null),
  severity: Yup.string().oneOf(SEVERITY_VALUES, 'severity must be critical, major or minor').nullable().default(null),
})

const saveResultsSchema = Yup.object({
  results: Yup.array().of(resultEntrySchema).min(1, 'results must not be empty').max(200).required('results is required'),
})

// Query string for GET /api/inspections and /api/inspections/export. Empty strings count as "not set".
const blankToUndefined = (value) => (value === '' || value === null ? undefined : value)

const listQuerySchema = Yup.object({
  liftId: Yup.number().transform((v, orig) => (orig === '' ? undefined : v)).integer().positive(),
  from: Yup.string().transform(blankToUndefined).matches(DATE_ONLY, 'from must be YYYY-MM-DD'),
  to: Yup.string().transform(blankToUndefined).matches(DATE_ONLY, 'to must be YYYY-MM-DD'),
  status: Yup.string().transform(blankToUndefined).oneOf(['draft', 'submitted']),
  result: Yup.string().transform(blankToUndefined).oneOf(['defect', 'pass']),
  inspectionId: Yup.number().transform((v, orig) => (orig === '' ? undefined : v)).integer().positive(),
})

module.exports = { SEVERITY_VALUES, createInspectionSchema, saveResultsSchema, listQuerySchema }
