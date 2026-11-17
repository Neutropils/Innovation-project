import {
  applyAllPass, answersFromDetail, dueDatePreview, filterParams, findProblems, groupBySection, problemSummary, toPayload,
} from '@/pages/inspections/inspectionDisplay'
import { ITEMS, makeDetail } from './helpers'

describe('applyAllPass (F01.5)', () => {
  const motorRoom = ITEMS.slice(0, 2)

  it('passes every unanswered item', () => {
    const { answers, changedIds } = applyAllPass({}, motorRoom)
    expect(answers[1].result).toBe('pass')
    expect(answers[2].result).toBe('pass')
    expect(changedIds).toEqual([1, 2])
  })

  it('leaves Defects alone, and keeps what was typed on them', () => {
    const before = { 2: { result: 'defect', description: 'Brake squeals', location: 'x', severity: 'major', photos: [] } }
    const { answers, changedIds } = applyAllPass(before, motorRoom)
    expect(answers[1].result).toBe('pass')
    expect(answers[2]).toEqual(before[2])
    expect(changedIds).toEqual([1])
  })

  it('does not overwrite an item already answered Pass', () => {
    const { changedIds } = applyAllPass({ 1: { result: 'pass' } }, motorRoom)
    expect(changedIds).toEqual([2])
  })

  it('does not touch other sections', () => {
    const { answers } = applyAllPass({}, motorRoom)
    expect(answers[3]).toBeUndefined()
  })
})

describe('findProblems / problemSummary (F01.10)', () => {
  it('names unanswered items and defects without description or severity', () => {
    const answers = {
      1: { result: 'defect', description: 'Noisy', severity: null },
      2: { result: 'defect', description: '   ', severity: 'minor' },
    }
    expect(findProblems(ITEMS, answers)).toEqual({ unanswered: [3], incompleteDefects: [1, 2] })
  })

  it('finds nothing wrong with a complete inspection', () => {
    const answers = { 1: { result: 'pass' }, 2: { result: 'defect', description: 'Brake', severity: 'major' }, 3: { result: 'pass' } }
    expect(findProblems(ITEMS, answers)).toEqual({ unanswered: [], incompleteDefects: [] })
  })

  it('writes one short message', () => {
    expect(problemSummary({ unanswered: [1, 2, 3], incompleteDefects: [9] })).toBe('3 items not answered · 1 defect missing a description or severity')
    expect(problemSummary({ unanswered: [1], incompleteDefects: [] })).toBe('1 item not answered')
  })
})

describe('toPayload', () => {
  it('sends defect details only for a Defect', () => {
    expect(toPayload(2, { result: 'defect', description: 'Brake', location: 'Motor room', severity: 'major' }))
      .toEqual({ checklistItemId: 2, result: 'defect', description: 'Brake', location: 'Motor room', severity: 'major' })
    expect(toPayload(2, { result: 'pass', description: 'stale', location: 'x', severity: 'minor' }))
      .toEqual({ checklistItemId: 2, result: 'pass', description: null, location: null, severity: null })
  })

  it('sends a cleared answer as null', () => {
    expect(toPayload(5, undefined)).toEqual({ checklistItemId: 5, result: null, description: null, location: null, severity: null })
  })
})

describe('dueDatePreview (F01.6)', () => {
  it('adds the API-supplied days to today', () => {
    expect(dueDatePreview('major', { major: 7 }, new Date(2026, 10, 17))).toBe('Contractor due: 24 Nov 2026')
  })

  it('shows nothing without the table or for an unknown severity', () => {
    expect(dueDatePreview('major', undefined)).toBeNull()
    expect(dueDatePreview('huge', { major: 7 })).toBeNull()
  })
})

describe('data shaping', () => {
  it('rebuilds the answers from a saved draft', () => {
    const detail = makeDetail()
    detail.results[1] = { ...detail.results[1], result: 'defect', description: 'Brake', location: 'Motor room', severity: 'major' }
    const answers = answersFromDetail(detail)
    expect(answers[2]).toMatchObject({ result: 'defect', description: 'Brake', severity: 'major' })
    expect(answers[1]).toMatchObject({ result: null, description: '' })
  })

  it('groups items by section in checklist order', () => {
    expect(groupBySection(makeDetail().results).map((g) => [g.section, g.items.length])).toEqual([['Motor room', 2], ['Lift car', 1]])
  })

  it('leaves blank filters out of the query', () => {
    expect(filterParams({ liftId: '3', from: '', to: '2026-11-30', result: '' })).toEqual({ liftId: '3', to: '2026-11-30' })
  })
})
