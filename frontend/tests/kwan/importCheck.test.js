import { SAMPLE_IMPORTS, checkImport, parseCsv, registerRequest, resetRegister } from '@/prototype/registerData'

const HEADER = 'lift_code,block,lift,street,town,postal_code,contractor'
const file = (...rows) => [HEADER, ...rows].join('\n')
const request = (method, path, body) => registerRequest({}, { method, path, body })

beforeEach(() => resetRegister())

describe('parseCsv', () => {
  it('reads quoted cells with commas, doubled quotes, CRLF line ends and the Excel BOM', () => {
    expect(parseCsv('﻿a,b\r\n"Blk 5, Tower ""A""",x\r\n\r\n')).toEqual([['a', 'b'], ['Blk 5, Tower "A"', 'x']])
  })
})

describe('checkImport', () => {
  it('accepts every row of a clean file', () => {
    const result = checkImport(SAMPLE_IMPORTS.clean.csv)
    expect(result).toMatchObject({ total: 5, fixes: [], rejected: [] })
    expect(result.ready).toHaveLength(5)
    expect(result.ready[0]).toMatchObject({ row: 2, liftCode: 'LIFT-1001', block: '221', contractorId: 1 })
  })

  it('fixes lift code format and repeated "Blk", and shows each fix', () => {
    const result = checkImport(file('lift-2002,Blk Blk 5,Lift A,Hougang Ave 3,Hougang,530005,apex lifts'))
    expect(result.rejected).toEqual([])
    expect(result.fixes).toEqual([
      { row: 2, field: 'lift_code', from: 'lift-2002', to: 'LIFT-2002' },
      { row: 2, field: 'block', from: 'Blk Blk 5', to: '5' },
    ])
    // Contractor name matched whatever the letter case
    expect(result.ready[0]).toMatchObject({ liftCode: 'LIFT-2002', block: '5', contractorName: 'Apex Lifts' })
  })

  it.each([
    ['a lift already in the register', 'LIFT-0427,512,Lift A,Hougang Ave 10,Hougang,530512,Apex Lifts', 'LIFT-0427 is already in the register'],
    ['a missing street', 'LIFT-2003,302,Lift B,,Ang Mo Kio,560302,Summit Elevators', 'Missing street'],
    ['two missing fields', 'LIFT-2003,,Lift B,,Ang Mo Kio,560302,Summit Elevators', 'Missing block and street'],
    ['an unknown contractor', 'LIFT-2004,88,Lift A,Bedok North Rd,Bedok,460088,Skyline Lifts', 'Contractor "Skyline Lifts" is not in the register - add it under Contractors first'],
    ['an unreadable lift code', 'A12,88,Lift A,Bedok North Rd,Bedok,460088,Apex Lifts', 'Lift code "A12" is not recognised (expected LIFT-0000)'],
  ])('rejects %s with the reason', (_what, row, reason) => {
    const result = checkImport(file(row))
    expect(result.ready).toEqual([])
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]).toMatchObject({ row: 2, reason })
  })

  it('rejects the second use of a lift code in the same file, naming the first row', () => {
    const result = checkImport(file(
      'LIFT-2001,301,Lift A,Ang Mo Kio Ave 3,Ang Mo Kio,560301,Apex Lifts',
      'lift 2001,301,Lift B,Ang Mo Kio Ave 3,Ang Mo Kio,560301,Apex Lifts'
    ))
    expect(result.ready).toHaveLength(1)
    expect(result.rejected[0]).toMatchObject({ row: 3, reason: 'Same lift code as row 2' })
  })

  it('sorts the sample file with problems into ready, fixed and rejected', () => {
    const result = checkImport(SAMPLE_IMPORTS.problems.csv)
    expect(result.total).toBe(7)
    expect(result.ready.map((r) => r.liftCode)).toEqual(['LIFT-2001', 'LIFT-2002', 'LIFT-2005'])
    expect(result.fixes).toHaveLength(4)
    expect(result.rejected.map((r) => r.row)).toEqual([4, 5, 6, 7])
  })

  it('refuses a file without the required columns and names them', () => {
    const { error } = checkImport('lift_code,block,town\nLIFT-2001,301,Ang Mo Kio')
    expect(error.code).toBe('MISSING_COLUMNS')
    expect(error.message).toMatch(/these columns: street, contractor/)
  })

  it.each([
    ['nothing at all', ''],
    ['headings but no rows', HEADER],
  ])('refuses a file with %s', (_what, csv) => {
    expect(checkImport(csv).error.code).toBe('EMPTY_FILE')
  })
})

describe('POST /lifts/import', () => {
  const count = () => request('get', '/lifts').body.data.length

  it('saves nothing on a check (dryRun)', () => {
    const before = count()
    const res = request('post', '/lifts/import', { csv: SAMPLE_IMPORTS.clean.csv, dryRun: true })
    expect(res.body.data).toMatchObject({ dryRun: true, accepted: 5 })
    expect(count()).toBe(before)
  })

  it('adds only the accepted rows on confirm', () => {
    const before = count()
    const res = request('post', '/lifts/import', { csv: SAMPLE_IMPORTS.problems.csv, dryRun: false })
    expect(res.body.data).toMatchObject({ dryRun: false, accepted: 3 })
    expect(count()).toBe(before + 3)
  })

  it('answers 422 with the reason for an unusable file', () => {
    const res = request('post', '/lifts/import', { csv: 'name\nx', dryRun: true })
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('MISSING_COLUMNS')
  })
})

describe('register rules', () => {
  it('refuses a duplicate lift code', () => {
    const res = request('post', '/lifts', { liftCode: 'lift-0427', block: '1', street: 'Any St', contractorId: 1 })
    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ code: 'DUPLICATE_LIFT_CODE', message: 'LIFT-0427 is already in the register.' })
  })

  it('refuses to deactivate a contractor that still has active lifts', () => {
    const res = request('patch', '/contractors/1', { isActive: false })
    expect(res.status).toBe(409)
    expect(res.body.message).toBe('Apex Lifts still maintains 4 active lifts. Move them to another contractor first.')
  })

  it('refuses a contractor account with no lift company', () => {
    const res = request('post', '/users', { name: 'New Tech', email: 'tech@apexlifts.example', role: 'contractor' })
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTRACTOR_REQUIRED')
  })

  it('returns no records in the Empty scenario', () => {
    expect(registerRequest({}, { method: 'get', path: '/lifts', empty: true }).body.data).toEqual([])
  })

  it('leaves requests for other resources to the rest of the mock API', () => {
    expect(request('get', '/defects')).toBeNull()
  })
})
