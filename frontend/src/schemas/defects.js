import * as Yup from 'yup'

// Owner: Si Qi - schemas for defect forms. Same limits as backend/src/validators/defectValidator.js.

// Reassign a defect to another lift company (F02.4). contractorId is the <select> value (a string).
export const reassignSchema = Yup.object({
  contractorId: Yup.string().required('Choose a contractor'),
  reason: Yup.string()
    .trim()
    .required('A reason is required')
    .min(3, 'Give a reason of at least 3 characters')
    .max(500, 'Reason must be 500 characters or fewer'),
})
