// Owner: Si Qi - Yup schemas for the defect endpoints.
// Use with { abortEarly: false, stripUnknown: true } (see defectController).
const Yup = require('yup')

// PATCH /api/defects/:id/assign
const assignSchema = Yup.object({
  contractorId: Yup.number()
    .typeError('contractorId must be a number')
    .integer('contractorId must be a whole number')
    .positive('contractorId must be positive')
    .required('Choose a contractor'),
  reason: Yup.string()
    .trim()
    .min(3, 'Give a reason of at least 3 characters')
    .max(500, 'Reason must be 500 characters or fewer')
    .required('A reason is required'),
})

module.exports = { assignSchema }
