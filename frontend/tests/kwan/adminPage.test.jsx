import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetRegister } from '@/prototype/registerData'
import { failReads, failSaves, renderAt, serveDemoData } from './helpers'

jest.mock('@/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }))

beforeEach(() => {
  resetRegister()
  serveDemoData()
})

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  jest.resetAllMocks()
})

const field = (name) => screen.getByLabelText(name)
const save = () => userEvent.click(screen.getByRole('button', { name: 'Save' }))

async function fillLift({ code = 'LIFT-3001', block = '77', street = 'Lorong Limau', contractor = 'Apex Lifts' } = {}) {
  await userEvent.type(field(/^Lift code/), code)
  await userEvent.type(field(/^Block/), block)
  await userEvent.type(field(/^Street/), street)
  await screen.findByRole('option', { name: contractor })
  await userEvent.selectOptions(field(/^Contractor/), contractor)
}

describe('Admin page - tabs', () => {
  it('opens on the lift register and switches tabs', async () => {
    renderAt('/admin')
    expect(await screen.findByText('12 lifts')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Lifts' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('tab', { name: 'Contractors' }))
    const apex = (await screen.findByText('Apex Lifts')).closest('li')
    expect(within(apex).getByText('4 lifts')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Users' }))
    const inactive = (await screen.findByText('Wei Ling Goh')).closest('li')
    expect(within(inactive).getByText('Inactive')).toBeInTheDocument()
    expect(within(inactive).getByText('Meridian Vertical')).toBeInTheDocument()
  })

  it('opens the tab named in the link, with the search from the Lifts page', async () => {
    renderAt('/admin?tab=lifts&q=LIFT-0427')
    expect(await screen.findByText('1 of 12 lifts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit LIFT-0427' })).toBeInTheDocument()
  })

  it('shows an empty state per tab, and an error state with retry', async () => {
    serveDemoData({ empty: true })
    renderAt('/admin?tab=contractors')
    expect(await screen.findByText('No contractors yet')).toBeInTheDocument()

    failReads('error')
    await userEvent.click(screen.getByRole('tab', { name: 'Users' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load users')
    serveDemoData()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Ivy Tan')).toBeInTheDocument()
  })
})

describe('Admin page - lifts', () => {
  it('says what is missing when the form is saved empty', async () => {
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Add lift' }))
    await save()
    expect(await screen.findByText('Lift code is required')).toBeInTheDocument()
    expect(screen.getByText('Block is required')).toBeInTheDocument()
    expect(screen.getByText('Street is required')).toBeInTheDocument()
    expect(field(/^Contractor/)).toHaveAccessibleDescription('Choose a contractor')
  })

  it('checks the lift code and postal code formats', async () => {
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Add lift' }))
    await userEvent.type(field(/^Lift code/), 'A12')
    await userEvent.type(field(/^Postal code/), '12')
    await save()
    expect(await screen.findByText('Use the format LIFT-0000')).toBeInTheDocument()
    expect(screen.getByText('Postal code is 6 digits')).toBeInTheDocument()
  })

  it('adds a lift and confirms it', async () => {
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Add lift' }))
    await fillLift()
    await save()
    expect(await screen.findByRole('status')).toHaveTextContent('LIFT-3001 added to the register.')
    expect(await screen.findByText('13 lifts')).toBeInTheDocument()
  })

  it('shows a duplicate lift code under the field and keeps the form filled in', async () => {
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Add lift' }))
    await fillLift({ code: 'LIFT-0427' })
    await save()
    expect(await screen.findByText('LIFT-0427 is already in the register.')).toBeInTheDocument()
    expect(field(/^Lift code/)).toHaveAttribute('aria-invalid', 'true')
    expect(field(/^Street/)).toHaveValue('Lorong Limau')
  })

  it('says nothing was saved when the connection drops mid-save, and keeps the entries', async () => {
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Add lift' }))
    await fillLift()
    failSaves('offline')
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re offline, so nothing was saved.')
    expect(field(/^Lift code/)).toHaveValue('LIFT-3001')
  })

  it('takes a deactivated lift out of the inspectors’ list but keeps it in the register', async () => {
    renderAt('/admin?q=LIFT-0428')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit LIFT-0428' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Active/ }))
    await save()
    expect(await screen.findByText('Inactive')).toBeInTheDocument()

    localStorage.clear()
    renderAt('/lifts', 'inspector')
    expect(await screen.findByText('11 lifts in the register')).toBeInTheDocument()
  })
})

describe('Admin page - contractors', () => {
  it('refuses to deactivate a company that still has lifts, and says what to do', async () => {
    renderAt('/admin?tab=contractors')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Apex Lifts' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Active/ }))
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Apex Lifts still maintains 4 active lifts. Move them to another contractor first.')
  })

  it('shows a duplicate company name under the field', async () => {
    renderAt('/admin?tab=contractors')
    await userEvent.click(await screen.findByRole('button', { name: 'Add contractor' }))
    await userEvent.type(field(/^Company name/), 'apex lifts')
    await userEvent.type(field(/^Contact email/), 'not-an-email')
    await save()
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    await userEvent.clear(field(/^Contact email/))
    await save()
    expect(await screen.findByText('apex lifts is already in the register.')).toBeInTheDocument()
  })
})

describe('Admin page - users', () => {
  it('needs a lift company for a contractor account, then shows the temporary password once', async () => {
    renderAt('/admin?tab=users')
    await userEvent.click(await screen.findByRole('button', { name: 'Add user' }))
    await userEvent.type(field(/^Name/), 'Nora Tech')
    await userEvent.type(field(/^Email/), 'nora@summit.example')
    expect(screen.queryByLabelText(/^Lift company/)).not.toBeInTheDocument()
    await userEvent.selectOptions(field(/^Role/), 'Contractor')
    await save()
    expect(await screen.findByText('Choose the lift company this account belongs to')).toBeInTheDocument()

    await screen.findByRole('option', { name: 'Summit Elevators' })
    await userEvent.selectOptions(field(/^Lift company/), 'Summit Elevators')
    await save()
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Nora Tech added.')
    expect(notice).toHaveTextContent(/Temporary password: Elev8-\w{6}/)
    const row = (await screen.findByText('Nora Tech')).closest('li')
    expect(within(row).getByText('Summit Elevators')).toBeInTheDocument()
  })

  it('refuses an email that already has an account', async () => {
    renderAt('/admin?tab=users')
    await userEvent.click(await screen.findByRole('button', { name: 'Add user' }))
    await userEvent.type(field(/^Name/), 'Ivy Again')
    await userEvent.type(field(/^Email/), 'inspector@demo.ems')
    await userEvent.selectOptions(field(/^Role/), 'Inspector')
    await save()
    expect(await screen.findByText('An account for inspector@demo.ems already exists.')).toBeInTheDocument()
  })

  it('stops an admin deactivating their own account', async () => {
    renderAt('/admin?tab=users')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Aisha Rahman' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Active/ }))
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('You can’t deactivate the account you’re signed in with.')
  })
})

describe('Admin page - import', () => {
  const upload = (name, content) =>
    userEvent.upload(screen.getByLabelText('Lift file'), new File([content], name, { type: 'text/csv' }), { applyAccept: false })

  it('checks a file first, then imports only the good rows on confirm', async () => {
    renderAt('/admin?tab=import')
    await userEvent.click(await screen.findByRole('button', { name: 'File with problems' }))

    // Check: nothing saved yet
    expect(await screen.findByRole('status')).toHaveTextContent('7 rows read. Nothing has been saved yet.')
    expect(within(screen.getByRole('list', { name: 'Fixed for you' })).getAllByRole('listitem')).toHaveLength(4)
    const rejected = within(screen.getByRole('list', { name: 'Rejected rows' }))
    expect(rejected.getAllByRole('listitem')).toHaveLength(4)
    expect(rejected.getByText('LIFT-0427 is already in the register')).toBeInTheDocument()
    expect(rejected.getByText('Missing street')).toBeInTheDocument()

    // Confirm
    await userEvent.click(screen.getByRole('button', { name: 'Import 3 lifts' }))
    expect(await screen.findByRole('status')).toHaveTextContent('3 lifts added to the register. 4 rows skipped.')

    await userEvent.click(screen.getByRole('button', { name: 'View lifts' }))
    expect(await screen.findByText('15 lifts')).toBeInTheDocument()
  })

  it('reads an uploaded CSV file', async () => {
    renderAt('/admin?tab=import')
    await screen.findByRole('button', { name: 'Choose file' })
    await upload('new-lifts.csv', 'lift_code,block,lift,street,town,postal_code,contractor\nLIFT-4001,9,Lift A,Any St,Town,123456,Apex Lifts')
    expect(await screen.findByRole('heading', { name: 'Check new-lifts.csv' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import 1 lift' })).toBeEnabled()
  })

  it('refuses a file that is not a CSV and says how to make one', async () => {
    renderAt('/admin?tab=import')
    await screen.findByRole('button', { name: 'Choose file' })
    await upload('lifts.xlsx', 'binary')
    expect(await screen.findByRole('alert')).toHaveTextContent('“lifts.xlsx” isn’t a CSV file. In Excel, choose File > Save As > CSV')
  })

  it('refuses an empty file', async () => {
    renderAt('/admin?tab=import')
    await screen.findByRole('button', { name: 'Choose file' })
    await upload('empty.csv', '')
    expect(await screen.findByRole('alert')).toHaveTextContent('“empty.csv” is empty.')
  })

  it('names the missing columns', async () => {
    renderAt('/admin?tab=import')
    await screen.findByRole('button', { name: 'Choose file' })
    await upload('wrong.csv', 'code,address\nLIFT-4001,Any St')
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is missing these columns: lift_code, block, street, contractor.')
  })

  it('will not import when every row is rejected', async () => {
    renderAt('/admin?tab=import')
    await screen.findByRole('button', { name: 'Choose file' })
    await upload('dupes.csv', 'lift_code,block,lift,street,town,postal_code,contractor\nLIFT-0427,512,Lift A,Hougang Ave 10,Hougang,530512,Apex Lifts')
    expect(await screen.findByRole('status')).toHaveTextContent('None of the 1 row can be imported. Nothing has been saved.')
    expect(screen.getByRole('button', { name: 'Import 0 lifts' })).toBeDisabled()
  })
})
