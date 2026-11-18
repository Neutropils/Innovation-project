// The whole loop in prototype mode, through the real mock adapter (no backend):
// inspector submits a checklist with failed items -> open defects appear for the lift's
// contractor (F02.1) -> the Overview counts the inspection (F08.4) and breaks each company's
// defects down by status (F08.3).
import { mockAdapter } from '@/prototype/mockApi'
import { DEFECTS, overview } from '@/prototype/mockData'
import { countSubmittedInspections, resetInspections, CHECKLIST } from '@/prototype/inspectionRecords'
import { resetDefectRecords } from '@/prototype/defectRecords'
import { statusBreakdown } from '@/pages/overview/OverviewPage'
import { localIso } from '@/pages/defects/defectDisplay'

const ORIGINAL = DEFECTS.map((d) => ({ ...d }))

function signInAs(role) {
  const who = {
    inspector: { sub: 1, name: 'Ivy Tan', role: 'inspector', contractorId: null },
    admin: { sub: 3, name: 'Aisha Rahman', role: 'admin', contractorId: null },
  }[role]
  localStorage.setItem('app_token', `prototype.${btoa(JSON.stringify(who))}.unsigned`)
}

async function call(method, url, data, params) {
  const promise = mockAdapter({ method, url, params, data: data === undefined ? undefined : JSON.stringify(data) })
    .then((r) => ({ status: r.status, body: r.data }), (e) => ({ status: e.response?.status, body: e.response?.data }))
  await jest.runAllTimersAsync()
  return promise
}

const dayIso = (offset) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return localIso(d)
}

// Every item Pass, except the given { itemId: { severity, description } }
const answers = (defects = {}) => CHECKLIST.map((item) => (defects[item.id]
  ? { checklistItemId: item.id, result: 'defect', severity: defects[item.id].severity, description: defects[item.id].description }
  : { checklistItemId: item.id, result: 'pass' }))

beforeEach(() => {
  jest.useFakeTimers()
  resetInspections()
  resetDefectRecords()
})
afterEach(() => {
  jest.useRealTimers()
  DEFECTS.length = ORIGINAL.length
  DEFECTS.forEach((d, i) => Object.assign(d, ORIGINAL[i]))
  localStorage.clear()
})

describe('F02.1 automatic defect creation', () => {
  it('turns each failed item of a submitted inspection into an open defect for the lift\'s contractor', async () => {
    signInAs('inspector')
    const draft = await call('post', '/inspections', { liftId: 3 })   // LIFT-0311, Apex Lifts
    expect(draft.status).toBe(201)
    const id = draft.body.data.id

    await call('put', `/inspections/${id}/results`, {
      results: answers({
        2: { severity: 'critical', description: 'Brake squealing on stop' },
        10: { severity: 'major', description: 'Door sensor slow to react' },
      }),
    })
    const submitted = await call('post', `/inspections/${id}/submit`)
    expect(submitted.status).toBe(200)
    expect(submitted.body.data.status).toBe('submitted')
    expect(submitted.body.data.defects).toHaveLength(2)

    signInAs('admin')
    const list = (await call('get', '/defects', undefined, { liftId: 3, status: 'open' })).body.data
    const created = list.filter((d) => d.inspectionId === id)
    expect(created).toHaveLength(2)
    const brake = created.find((d) => d.item === 'Brake squealing on stop')
    expect(brake).toMatchObject({
      liftCode: 'LIFT-0311', contractorId: 1, contractorName: 'Apex Lifts', severity: 'critical',
      status: 'open', createdAt: dayIso(0), dueDate: dayIso(1),
    })
    expect(brake.code).toMatch(/^DEF-\d{6}$/)
    expect(created.find((d) => d.severity === 'major').dueDate).toBe(dayIso(7))

    // Its history starts with the inspector who found it
    const history = (await call('get', `/defects/${brake.id}/history`)).body.data
    expect(history).toEqual([expect.objectContaining({ action: 'created', toStatus: 'open', actor: { id: 1, name: 'Ivy Tan', role: 'inspector' } })])
  })

  it('creates nothing for an all-pass inspection', async () => {
    signInAs('inspector')
    const before = DEFECTS.length
    const id = (await call('post', '/inspections', { liftId: 5 })).body.data.id
    await call('put', `/inspections/${id}/results`, { results: answers() })
    expect((await call('post', `/inspections/${id}/submit`)).status).toBe(200)
    expect(DEFECTS).toHaveLength(before)
  })

  it('refuses a second submit, so defects are never created twice', async () => {
    signInAs('inspector')
    const id = (await call('post', '/inspections', { liftId: 4 })).body.data.id
    await call('put', `/inspections/${id}/results`, { results: answers({ 5: { severity: 'minor', description: 'Rope wear' } }) })
    await call('post', `/inspections/${id}/submit`)
    const count = DEFECTS.length
    const again = await call('post', `/inspections/${id}/submit`)
    expect(again.status).toBe(409)
    expect(again.body.code).toBe('ALREADY_SUBMITTED')
    expect(DEFECTS).toHaveLength(count)
  })

  it('refuses an incomplete checklist and names what is missing, creating nothing', async () => {
    signInAs('inspector')
    const before = DEFECTS.length
    const id = (await call('post', '/inspections', { liftId: 6 })).body.data.id
    await call('put', `/inspections/${id}/results`, {
      results: [{ checklistItemId: 1, result: 'pass' }, { checklistItemId: 2, result: 'defect', severity: 'major' }],
    })
    const res = await call('post', `/inspections/${id}/submit`)
    expect(res.status).toBe(422)
    expect(res.body.unanswered).toHaveLength(CHECKLIST.length - 2)
    expect(res.body.incompleteDefects).toEqual([2])
    expect(DEFECTS).toHaveLength(before)
  })

  it('reopens the same draft instead of starting a second one', async () => {
    signInAs('inspector')
    const first = await call('post', '/inspections', { liftId: 7 })
    const second = await call('post', '/inspections', { liftId: 7 })
    expect(second.status).toBe(200)
    expect(second.body.data.id).toBe(first.body.data.id)
  })

  it('only lets an inspector start an inspection', async () => {
    signInAs('admin')
    expect((await call('post', '/inspections', { liftId: 3 })).status).toBe(403)
  })

  it('links every demo defect to the inspection that found it', async () => {
    signInAs('admin')
    const defect = DEFECTS.find((d) => d.id === 88)
    expect(defect.inspectionId).toEqual(expect.any(Number))
    const report = (await call('get', `/inspections/${defect.inspectionId}`)).body.data
    expect(report.lift.liftCode).toBe(defect.liftCode)
    expect(report.defects.map((d) => d.displayId)).toContain('DEF-000088')
  })
})

describe('F08.4 inspection summary', () => {
  it('counts submitted inspections from the records, and a new submit adds one', async () => {
    const before = countSubmittedInspections('week')
    expect(before).toBeGreaterThan(0)
    expect(countSubmittedInspections('all')).toBeGreaterThanOrEqual(countSubmittedInspections('30d'))
    expect(countSubmittedInspections('30d')).toBeGreaterThanOrEqual(before)

    signInAs('inspector')
    const id = (await call('post', '/inspections', { liftId: 8 })).body.data.id
    await call('put', `/inspections/${id}/results`, { results: answers() })
    await call('post', `/inspections/${id}/submit`)
    expect(countSubmittedInspections('week')).toBe(before + 1)

    signInAs('admin')
    const res = await call('get', '/overview', undefined, { period: 'week' })
    expect(res.body.data.inspections).toBe(before + 1)
  })

  it('matches the history list for the same period', async () => {
    signInAs('admin')
    const all = (await call('get', '/inspections', undefined, { status: 'submitted' })).body.data
    expect(all).toHaveLength(countSubmittedInspections('all'))
  })
})

describe('F08.3 contractor overview by status', () => {
  it('breaks each company\'s not-closed defects down by status, adding up to its open count', () => {
    for (const c of overview('all').byContractor) {
      const sum = Object.values(c.byStatus).reduce((a, b) => a + b, 0)
      expect(sum).toBe(c.open)
    }
  })

  it('reads as a short line, skipping statuses with nothing', () => {
    expect(statusBreakdown({ open: 2, acknowledged: 0, in_progress: 1, pending_verification: 1 })).toBe('2 new · 1 in progress · 1 to verify')
    expect(statusBreakdown({ open: 0, acknowledged: 0, in_progress: 0, pending_verification: 0 })).toBe('')
  })
})
