import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetRegister } from '@/prototype/registerData'
import { failReads, renderAt, serveDemoData } from './helpers'

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

const allLifts = () => within(screen.getByRole('region', { name: 'All lifts' }))

describe('Lifts page - inspector', () => {
  it('lists every lift with its contractor, last check and open defects', async () => {
    renderAt('/lifts', 'inspector')
    expect(await screen.findByText('12 lifts in the register')).toBeInTheDocument()
    const card = allLifts().getByText('LIFT-0427').closest('li')
    expect(within(card).getByRole('heading', { name: 'Blk 512 Lift A' })).toBeInTheDocument()
    expect(within(card).getByText('Apex Lifts')).toBeInTheDocument()
    expect(within(card).getByText('Checked 2 days ago')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /2 open/ })).toHaveAttribute('href', '/defects?q=LIFT-0427&status=active')
  })

  it('starts an inspection for the chosen lift (contract with the inspection page)', async () => {
    renderAt('/lifts', 'inspector')
    await screen.findByText('12 lifts in the register')
    expect(allLifts().getByRole('link', { name: 'Start inspection of LIFT-0427' })).toHaveAttribute('href', '/inspections/new?liftId=1')
    expect(allLifts().getByRole('link', { name: 'History of LIFT-0427' })).toHaveAttribute('href', '/inspections?liftId=1')
  })

  it('suggests the never-checked lift first and says why', async () => {
    renderAt('/lifts', 'inspector')
    const suggested = within(await screen.findByRole('region', { name: 'Suggested next checks' }))
    const cards = suggested.getAllByRole('listitem')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]).getByText('LIFT-0903')).toBeInTheDocument()
    expect(within(cards[0]).getByText('Never spot-checked')).toBeInTheDocument()
    expect(within(cards[1]).getByText('Not checked for 47 days')).toBeInTheDocument()
  })

  it('links to the repairs waiting to be verified', async () => {
    renderAt('/lifts', 'inspector')
    const link = await screen.findByRole('link', { name: /2 repairs waiting for you/ })
    expect(link).toHaveAttribute('href', '/defects?status=pending_verification')
  })

  it('filters as you type and hides the suggestions while searching', async () => {
    renderAt('/lifts', 'inspector')
    await screen.findByText('12 lifts in the register')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search lifts' }), 'tampines')
    expect(screen.getByText('2 lifts match your search')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Suggested next checks' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Search results' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows a no-results state that clears back to the full list', async () => {
    renderAt('/lifts?q=zzz', 'inspector')
    const empty = (await screen.findByText('No lifts match “zzz”')).parentElement
    await userEvent.click(within(empty).getByRole('button', { name: 'Clear search' }))
    expect(screen.getByText('12 lifts in the register')).toBeInTheDocument()
  })

  it('tells an inspector who to ask when the register is empty', async () => {
    serveDemoData({ empty: true })
    renderAt('/lifts', 'inspector')
    expect(await screen.findByText('No lifts in the register yet')).toBeInTheDocument()
    expect(screen.getByText(/Ask your EMS admin/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Import lifts' })).not.toBeInTheDocument()
  })

  it('shows an error with a retry that loads the list', async () => {
    failReads('error')
    renderAt('/lifts', 'inspector')
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the lifts')
    serveDemoData()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('12 lifts in the register')).toBeInTheDocument()
  })

  it('keeps the last list on screen when the connection drops', async () => {
    const first = renderAt('/lifts', 'inspector')
    await screen.findByText('12 lifts in the register')
    first.unmount()

    failReads('offline')
    renderAt('/lifts', 'inspector')
    expect(await screen.findByText('You’re offline')).toBeInTheDocument()
    expect(allLifts().getByText('LIFT-0427')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an offline state, not an error, when nothing was saved', async () => {
    failReads('offline')
    renderAt('/lifts', 'inspector')
    expect(await screen.findByText(/hasn’t been opened online yet/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Lifts page - admin', () => {
  it('offers Edit instead of Start inspection, which is inspector-only', async () => {
    renderAt('/lifts', 'admin')
    await screen.findByText('12 lifts in the register')
    expect(screen.queryByRole('link', { name: /Start inspection/ })).not.toBeInTheDocument()
    expect(allLifts().getByRole('link', { name: 'Edit LIFT-0427' })).toHaveAttribute('href', '/admin?tab=lifts&q=LIFT-0427')
  })

  it('offers the import when the register is empty', async () => {
    serveDemoData({ empty: true })
    renderAt('/lifts', 'admin')
    expect(await screen.findByRole('link', { name: 'Import lifts' })).toHaveAttribute('href', '/admin?tab=import')
  })
})
