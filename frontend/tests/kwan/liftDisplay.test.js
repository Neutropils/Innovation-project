import { checkPriority, lastCheckText, mapsUrl, matchesLift, suggestedLifts } from '@/pages/lifts/liftDisplay'

const TODAY = '2026-11-18'

const lift = (overrides = {}) => ({
  id: 1, liftCode: 'LIFT-0427', block: '512', liftName: 'Blk 512 Lift A', street: 'Hougang Ave 10', town: 'Hougang',
  postalCode: '530512', contractorName: 'Apex Lifts', lastInspectedAt: '2026-11-16',
  openDefects: 0, overdueDefects: 0, pendingVerification: 0,
  ...overrides,
})

describe('matchesLift', () => {
  it('finds a lift by code, block, street or contractor, in any letter case', () => {
    expect(matchesLift(lift(), 'lift-0427')).toBe(true)
    expect(matchesLift(lift(), '512')).toBe(true)
    expect(matchesLift(lift(), 'HOUGANG')).toBe(true)
    expect(matchesLift(lift(), 'apex')).toBe(true)
  })

  it('needs every word to match', () => {
    expect(matchesLift(lift(), '512 hougang')).toBe(true)
    expect(matchesLift(lift(), '512 tampines')).toBe(false)
  })

  it('matches everything when the search is blank', () => {
    expect(matchesLift(lift(), '   ')).toBe(true)
  })
})

describe('lastCheckText', () => {
  it.each([
    [null, 'Never checked'],
    ['2026-11-18', 'Checked today'],
    ['2026-11-17', 'Checked yesterday'],
    ['2026-11-05', 'Checked 13 days ago'],
  ])('%s -> %s', (lastInspectedAt, text) => {
    expect(lastCheckText(lift({ lastInspectedAt }), TODAY)).toBe(text)
  })
})

describe('checkPriority', () => {
  it('gives no reason for a lift checked recently with nothing outstanding', () => {
    expect(checkPriority(lift(), TODAY).reasons).toEqual([])
  })

  it('flags a lift that has never been spot-checked', () => {
    expect(checkPriority(lift({ lastInspectedAt: null }), TODAY).reasons).toEqual([{ text: 'Never spot-checked', tone: 'warn' }])
  })

  it('flags a lift only once it is past the 30-day interval', () => {
    expect(checkPriority(lift({ lastInspectedAt: '2026-10-19' }), TODAY).reasons).toEqual([]) // exactly 30 days
    expect(checkPriority(lift({ lastInspectedAt: '2026-10-18' }), TODAY).reasons[0].text).toBe('Not checked for 31 days')
  })

  it('gives every reason that applies, in plain words', () => {
    const { reasons } = checkPriority(lift({ overdueDefects: 2, pendingVerification: 1 }), TODAY)
    expect(reasons.map((r) => r.text)).toEqual(['2 overdue defects', '1 repair to verify'])
  })

  it('scores more overdue defects higher', () => {
    const one = checkPriority(lift({ overdueDefects: 1 }), TODAY).score
    const three = checkPriority(lift({ overdueDefects: 3 }), TODAY).score
    expect(three).toBeGreaterThan(one)
  })
})

describe('suggestedLifts', () => {
  const lifts = [
    lift({ id: 1, liftCode: 'LIFT-0001' }),                                  // nothing to flag
    lift({ id: 2, liftCode: 'LIFT-0002', overdueDefects: 1 }),
    lift({ id: 3, liftCode: 'LIFT-0003', lastInspectedAt: null }),
    lift({ id: 4, liftCode: 'LIFT-0004', lastInspectedAt: '2026-10-02' }),   // 47 days
    lift({ id: 5, liftCode: 'LIFT-0005', pendingVerification: 1 }),
  ]

  it('puts never-checked first, then longest unchecked, then overdue defects', () => {
    expect(suggestedLifts(lifts, 3, TODAY).map((s) => s.lift.liftCode)).toEqual(['LIFT-0003', 'LIFT-0004', 'LIFT-0002'])
  })

  it('leaves out lifts with nothing to flag', () => {
    const codes = suggestedLifts(lifts, 10, TODAY).map((s) => s.lift.liftCode)
    expect(codes).toHaveLength(4)
    expect(codes).not.toContain('LIFT-0001')
  })

  it('suggests nothing for an empty register', () => {
    expect(suggestedLifts([], 3, TODAY)).toEqual([])
  })
})

describe('mapsUrl', () => {
  it('builds a Google Maps search for the lift address', () => {
    expect(mapsUrl(lift())).toBe('https://www.google.com/maps/search/?api=1&query=Blk%20512%20Hougang%20Ave%2010%20Singapore%20530512')
  })
})
