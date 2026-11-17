import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import api from '@/api'
import { META, makeDetail, makeSubmitted, ok, reject, renderAt, serveApi } from './helpers'

jest.mock('@/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }))

beforeEach(() => {
  window.scrollTo = jest.fn()
  serveApi(api, {
    'GET /inspections/7': ok(makeDetail()),
    'GET /checklist-items': ok([], { meta: META }),
    'PUT /inspections/7/results': ok(makeDetail()),
  })
})
afterEach(() => {
  localStorage.clear()
  jest.resetAllMocks()
})

// The page shows Save/Submit twice (summary panel on desktop, bottom bar on phones); CSS decides which is visible
const submitButton = () => screen.getAllByRole('button', { name: 'Submit' })[0]
const resultButton = (code, name) => within(screen.getByRole('group', { name: `Result for ${code}` })).getByRole('button', { name })
const pressed = (el) => el.getAttribute('aria-pressed')

async function openChecklist() {
  renderAt('/inspections/7')
  return screen.findByRole('heading', { name: 'LIFT-0427' })
}

describe('Checklist page (F01.3, F01.8)', () => {
  it('shows the items in their sections with their codes', async () => {
    await openChecklist()
    expect(screen.getByRole('heading', { name: 'Motor room' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lift car' })).toBeInTheDocument()
    expect(screen.getByText('MR-01')).toBeInTheDocument()
    expect(screen.getByText('Doors close smoothly')).toBeInTheDocument()
  })

  it('fills the lift, contractor and inspector from the records, not from typing', async () => {
    await openChecklist()
    const panel = within(screen.getByRole('complementary', { name: 'Inspection summary' }))
    expect(panel.getByText('Filled from records')).toBeInTheDocument()
    expect(panel.getByText('Apex Lift Engineering')).toBeInTheDocument()
    expect(panel.getByText('Ivy Tan')).toBeInTheDocument()
    expect(panel.getByRole('link', { name: /Find in map/ })).toHaveAttribute('href', expect.stringContaining('google.com/maps'))
    expect(panel.getByRole('link', { name: /Find in map/ })).toHaveAttribute('target', '_blank')
  })

  it('shows answered progress and per-section counts', async () => {
    await openChecklist()
    expect(screen.getByRole('progressbar', { name: 'Items answered' })).toHaveAttribute('aria-valuenow', '0')
    await userEvent.click(resultButton('MR-01', 'Pass'))
    expect(screen.getByRole('progressbar', { name: 'Items answered' })).toHaveAttribute('aria-valuenow', '1')
    const nav = within(screen.getByRole('navigation', { name: 'Jump to section' }))
    expect(nav.getByRole('link', { name: /Motor room/ })).toHaveTextContent('1/2')
  })

  it('reopens a saved draft with every answer kept (F01.9)', async () => {
    const draft = makeDetail()
    draft.results[0] = { ...draft.results[0], result: 'pass' }
    draft.results[1] = { ...draft.results[1], result: 'defect', description: 'Brake squeals', location: 'Motor room', severity: 'major' }
    serveApi(api, { 'GET /inspections/7': ok(draft), 'GET /checklist-items': ok([], { meta: META }) })
    await openChecklist()
    expect(pressed(resultButton('MR-01', 'Pass'))).toBe('true')
    expect(pressed(resultButton('MR-02', 'Defect'))).toBe('true')
    expect(screen.getByLabelText(/What’s wrong/)).toHaveValue('Brake squeals')
    expect(screen.getByRole('radio', { name: 'Major' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Pass / Defect and All pass (F01.4, F01.5)', () => {
  it('lets each item be changed after it is set', async () => {
    await openChecklist()
    await userEvent.click(resultButton('MR-01', 'Pass'))
    expect(pressed(resultButton('MR-01', 'Pass'))).toBe('true')
    await userEvent.click(resultButton('MR-01', 'Defect'))
    expect(pressed(resultButton('MR-01', 'Pass'))).toBe('false')
    expect(pressed(resultButton('MR-01', 'Defect'))).toBe('true')
  })

  it('All pass sets the unanswered items in that section and leaves Defects alone', async () => {
    await openChecklist()
    await userEvent.click(resultButton('MR-02', 'Defect'))
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Motor room as pass' }))

    expect(pressed(resultButton('MR-01', 'Pass'))).toBe('true')
    expect(pressed(resultButton('MR-02', 'Defect'))).toBe('true')
    expect(pressed(resultButton('MR-02', 'Pass'))).toBe('false')
    // The other section is untouched
    expect(pressed(resultButton('LC-01', 'Pass'))).toBe('false')
    // ...and every item can still be changed afterwards
    await userEvent.click(resultButton('MR-01', 'Defect'))
    expect(pressed(resultButton('MR-01', 'Defect'))).toBe('true')
  })
})

describe('Defect capture (F01.6)', () => {
  it('opens the fields under the item, with the location prefilled and a due-date preview', async () => {
    await openChecklist()
    await userEvent.click(resultButton('LC-01', 'Defect'))
    expect(screen.getByLabelText('Location')).toHaveValue('Lift car')
    expect(screen.queryByText(/Contractor due/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Major' }))
    expect(screen.getByText(/^Contractor due: \d{1,2} \w{3} \d{4}$/)).toBeInTheDocument()
  })

  it('offers the photo button (Jerald’s component)', async () => {
    await openChecklist()
    await userEvent.click(resultButton('LC-01', 'Defect'))
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument()
  })
})

describe('Autosave (F01.9)', () => {
  it('saves the changed answers about a second after the last change', async () => {
    await openChecklist()
    await userEvent.click(resultButton('MR-01', 'Pass'))
    expect(api.put).not.toHaveBeenCalled()
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1), { timeout: 3000 })
    expect(api.put).toHaveBeenCalledWith('/inspections/7/results', {
      results: [{ checklistItemId: 1, result: 'pass', description: null, location: null, severity: null }],
    })
    expect((await screen.findAllByText(/^Saved \d\d:\d\d$/)).length).toBeGreaterThan(0)
  })

  it('sends a defect with its description, location and severity', async () => {
    await openChecklist()
    await userEvent.click(resultButton('MR-02', 'Defect'))
    await userEvent.type(screen.getByLabelText(/What’s wrong/), 'Brake squeals')
    await userEvent.click(screen.getByRole('radio', { name: 'Major' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0])
    await waitFor(() => expect(api.put).toHaveBeenCalled())
    expect(api.put.mock.calls[0][1].results).toEqual([
      { checklistItemId: 2, result: 'defect', description: 'Brake squeals', location: 'Motor room', severity: 'major' },
    ])
  })

  it('says so when a save fails, and keeps the change to retry', async () => {
    api.put.mockImplementationOnce(() => reject(500, { message: 'boom' }))
    await openChecklist()
    await userEvent.click(resultButton('MR-01', 'Pass'))
    await userEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0])
    expect((await screen.findAllByText(/Not saved/)).length).toBeGreaterThan(0)

    await userEvent.click(screen.getAllByRole('button', { name: 'retry' })[0])
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2))
    expect(api.put.mock.calls[1][1].results[0]).toMatchObject({ checklistItemId: 1, result: 'pass' })
    expect((await screen.findAllByText(/^Saved \d\d:\d\d$/)).length).toBeGreaterThan(0)
  })
})

describe('Submit (F01.10)', () => {
  it('blocks submit and names what is missing', async () => {
    await openChecklist()
    await userEvent.click(resultButton('MR-01', 'Pass'))
    await userEvent.click(submitButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('2 items not answered')
    expect(api.post).not.toHaveBeenCalledWith('/inspections/7/submit')
    expect(screen.getByText('MR-02').closest('li')).toHaveClass('ring-destructive/70')
    expect(screen.getByText('MR-01').closest('li')).not.toHaveClass('ring-destructive/70')
  })

  it('names a Defect that has no description or severity', async () => {
    await openChecklist()
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Motor room as pass' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Lift car as pass' }))
    await userEvent.click(resultButton('MR-02', 'Defect'))
    await userEvent.click(submitButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('1 defect missing a description or severity')
    expect(screen.getByText('Add a description and choose a severity.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalledWith('/inspections/7/submit')
  })

  it('stops naming an item once it is fixed', async () => {
    await openChecklist()
    await userEvent.click(submitButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('3 items not answered')
    await userEvent.click(resultButton('MR-01', 'Pass'))
    expect(screen.getByRole('alert')).toHaveTextContent('2 items not answered')
  })

  it('submits, then goes to the report on the history route with a banner naming the contractor', async () => {
    let submitted = false
    serveApi(api, {
      'GET /inspections/7': () => ok(submitted ? makeSubmitted({ id: 7 }) : makeDetail()),
      'GET /checklist-items': ok([], { meta: META }),
      'PUT /inspections/7/results': ok(makeDetail()),
      'POST /inspections/7/submit': () => { submitted = true; return ok(makeSubmitted({ id: 7 })) },
    })
    await openChecklist()
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Motor room as pass' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Lift car as pass' }))
    await userEvent.click(resultButton('MR-02', 'Defect'))
    await userEvent.type(screen.getByLabelText(/What’s wrong/), 'Brake squeals')
    await userEvent.click(screen.getByRole('radio', { name: 'Major' }))
    await userEvent.click(submitButton())

    expect(await screen.findByText('Submitted · 1 defect sent to Apex Lift Engineering')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/inspections?report=7&submitted=1')
    // Saved first, then submitted
    const submitOrder = api.post.mock.invocationCallOrder[api.post.mock.calls.findIndex(([url]) => url === '/inspections/7/submit')]
    expect(Math.max(...api.put.mock.invocationCallOrder)).toBeLessThan(submitOrder)
    expect(screen.getAllByRole('link', { name: 'DEF-000005' })[0]).toHaveAttribute('href', '/defects/5')
  })

  it('outlines what the server names in a 422, even when this page had not noticed', async () => {
    serveApi(api, {
      'GET /inspections/7': ok(makeDetail()),
      'GET /checklist-items': ok([], { meta: META }),
      'PUT /inspections/7/results': ok(makeDetail()),
      'POST /inspections/7/submit': () => reject(422, { success: false, code: 'VALIDATION_ERROR', message: '1 item is not answered', unanswered: [3], incompleteDefects: [] }),
    })
    await openChecklist()
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Motor room as pass' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Lift car as pass' }))
    await userEvent.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('1 item not answered')
    expect(screen.getByText('LC-01').closest('li')).toHaveClass('ring-destructive/70')
    // Touching the item clears the outline
    await userEvent.click(resultButton('LC-01', 'Defect'))
    await userEvent.click(resultButton('LC-01', 'Pass'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a message, and keeps the draft, when the connection fails', async () => {
    serveApi(api, {
      'GET /inspections/7': ok(makeDetail()),
      'GET /checklist-items': ok([], { meta: META }),
      'PUT /inspections/7/results': ok(makeDetail()),
      'POST /inspections/7/submit': () => Promise.reject(new Error('Network Error')),
    })
    await openChecklist()
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Motor room as pass' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mark all unanswered items in Lift car as pass' }))
    await userEvent.click(submitButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t submit the inspection')
    expect(screen.getByRole('heading', { name: 'LIFT-0427' })).toBeInTheDocument()
  })
})

describe('Already submitted', () => {
  it('redirects /inspections/<id> to its report', async () => {
    serveApi(api, { 'GET /inspections/7': ok(makeSubmitted({ id: 7 })), 'GET /checklist-items': ok([], { meta: META }) })
    renderAt('/inspections/7')
    expect(await screen.findByRole('heading', { name: 'INS-000007' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/inspections?report=7')
  })
})

describe('Starting a draft', () => {
  it('creates (or reopens) the draft for the chosen lift, then moves to its own URL', async () => {
    serveApi(api, {
      'POST /inspections': ok(makeDetail()),
      'GET /checklist-items': ok([], { meta: META }),
    })
    renderAt('/inspections/new?liftId=3')
    expect(await screen.findByRole('heading', { name: 'LIFT-0427' })).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/inspections', { liftId: 3 })
    expect(screen.getByTestId('location')).toHaveTextContent('/inspections/7')
    expect(api.get).not.toHaveBeenCalledWith('/inspections/7') // already loaded, not fetched twice
  })

  it('starts only ONE draft even though React StrictMode runs the effect twice', async () => {
    serveApi(api, { 'POST /inspections': ok(makeDetail()), 'GET /checklist-items': ok([], { meta: META }) })
    renderAt('/inspections/new?liftId=3', 'inspector', { strict: true })
    expect(await screen.findByRole('heading', { name: 'LIFT-0427' })).toBeInTheDocument()
    expect(api.post.mock.calls.filter(([url]) => url === '/inspections')).toHaveLength(1)
  })

  it('asks for a lift when none was chosen', async () => {
    renderAt('/inspections/new')
    expect(await screen.findByText('Choose a lift to inspect')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('says so when the inspection does not exist or is someone else’s draft', async () => {
    serveApi(api, { 'GET /inspections/99': () => reject(404, { success: false, code: 'NOT_FOUND', message: 'Inspection not found' }) })
    renderAt('/inspections/99')
    expect(await screen.findByText('We couldn’t find that inspection')).toBeInTheDocument()
  })

  it('offers a retry when the server fails', async () => {
    serveApi(api, { 'GET /inspections/7': () => reject(500, { message: 'Something went wrong on our side.' }) })
    renderAt('/inspections/7')
    expect(await screen.findByText('Couldn’t load the inspection')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
