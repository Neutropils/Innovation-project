import * as Yup from 'yup'

// Owner: Kwan - schemas for the Admin page forms (F04.1-F04.5)

export const liftSchema = Yup.object({
  liftCode: Yup.string().trim().required('Lift code is required').matches(/^LIFT-\d{4}$/i, 'Use the format LIFT-0000'),
  block: Yup.string().trim().required('Block is required').max(20, 'Block is too long'),
  label: Yup.string().trim().max(20, 'Keep this short, e.g. Lift A'),
  street: Yup.string().trim().required('Street is required').max(150, 'Street is too long'),
  town: Yup.string().trim().max(60, 'Town is too long'),
  postalCode: Yup.string().trim().matches(/^\d{6}$/, { message: 'Postal code is 6 digits', excludeEmptyString: true }),
  contractorId: Yup.string().required('Choose a contractor'),
})

export const contractorSchema = Yup.object({
  name: Yup.string().trim().required('Company name is required').max(150, 'Company name is too long'),
  contactName: Yup.string().trim().max(100, 'Name is too long'),
  contactEmail: Yup.string().trim().email('Enter a valid email address'),
  contactPhone: Yup.string().trim().matches(/^[\d +()-]{8,20}$/, { message: 'Enter a valid phone number', excludeEmptyString: true }),
})

export const USER_ROLES = [
  { value: 'inspector', label: 'Inspector' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'admin', label: 'Admin' },
]

export const userSchema = Yup.object({
  name: Yup.string().trim().required('Name is required').max(100, 'Name is too long'),
  email: Yup.string().trim().required('Email is required').email('Enter a valid email address'),
  role: Yup.string().required('Choose a role').oneOf(USER_ROLES.map((r) => r.value), 'Choose a role'),
  // A contractor account must belong to a lift company, so its inbox shows that company's defects
  contractorId: Yup.string().when('role', {
    is: 'contractor',
    then: (schema) => schema.required('Choose the lift company this account belongs to'),
  }),
})
