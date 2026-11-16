// Owner: Kwan
// Prototype demo data and request handlers for the lift register, contractors, users and the
// bulk lift import. Shapes follow the API contract in design/feature-dependencies.md, so the
// pages work unchanged when the real endpoints replace this file.
// Writes are kept in memory: they last until the page is reloaded.
import { todayIso } from '@/pages/lifts/liftDisplay'
import { CONTRACTORS, DEFECTS, isOverdue } from './mockData'

// Dates are relative to today so "last checked" stays realistic whenever the demo runs.
const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayIso(d)
}

// contractor id -> [contact name, email, phone] (fictional)
const CONTACTS = {
  1: ['Marcus Lim', 'marcus.lim@apexlifts.example', '6123 4501'],
  2: ['Priya Nair', 'priya.nair@summit.example', '6123 4502'],
  3: ['Hafiz Rahim', 'hafiz@orionlifts.example', '6123 4503'],
  4: ['Wei Ling Goh', 'weiling.goh@meridian.example', '6123 4504'],
}

// [id, liftCode, block, label, street, town, postalCode, contractorId, last checked N days ago (null = never)]
// Lift codes match the defects in mockData.js, so counts and links line up across pages.
const LIFT_ROWS = [
  [1, 'LIFT-0427', '512', 'Lift A', 'Hougang Ave 10', 'Hougang', '530512', 1, 2],
  [2, 'LIFT-0428', '512', 'Lift B', 'Hougang Ave 10', 'Hougang', '530512', 1, 2],
  [3, 'LIFT-0311', '208', 'Lift B', 'Serangoon Central', 'Serangoon', '550208', 1, 4],
  [4, 'LIFT-0102', '101', 'Lift A', 'Hougang Ave 1', 'Hougang', '530101', 1, 9],
  [5, 'LIFT-0518', '330', 'Lift C', 'Anchorvale St', 'Sengkang', '540330', 2, 3],
  [6, 'LIFT-0519', '330', 'Lift D', 'Anchorvale St', 'Sengkang', '540330', 2, 10],
  [7, 'LIFT-0640', '415', 'Lift A', 'Fernvale Rd', 'Sengkang', '790415', 2, 12],
  [8, 'LIFT-0233', '77', 'Lift B', 'Lorong Limau', 'Whampoa', '320077', 3, 1],
  [9, 'LIFT-0761', '902', 'Lift A', 'Tampines Ave 4', 'Tampines', '520902', 3, 20],
  [10, 'LIFT-0855', '640', 'Lift B', 'Punggol Dr', 'Punggol', '820640', 4, 0],
  [11, 'LIFT-0903', '18', 'Lift A', 'Jalan Membina', 'Tiong Bahru', '160018', 4, null],
  [12, 'LIFT-0764', '905', 'Lift C', 'Tampines Ave 4', 'Tampines', '520905', 3, 47],
]

// [id, name, email, role, contractorId, isActive] - the first three are the demo logins
const USER_ROWS = [
  [1, 'Ivy Tan', 'inspector@demo.ems', 'inspector', null, true],
  [2, 'Marcus Lim', 'contractor@demo.ems', 'contractor', 1, true],
  [3, 'Aisha Rahman', 'admin@demo.ems', 'admin', null, true],
  [4, 'Darren Ong', 'darren.ong@demo.ems', 'inspector', null, true],
  [5, 'Priya Nair', 'priya.nair@summit.example', 'contractor', 2, true],
  [6, 'Hafiz Rahim', 'hafiz@orionlifts.example', 'contractor', 3, true],
  [7, 'Wei Ling Goh', 'weiling.goh@meridian.example', 'contractor', 4, false],
]

let contractors
let lifts
let users

// Back to the demo data (also used by tests).
export function resetRegister() {
  contractors = CONTRACTORS.map((c) => {
    const [contactName, contactEmail, contactPhone] = CONTACTS[c.id] ?? ['', '', '']
    return { ...c, contactName, contactEmail, contactPhone, isActive: true }
  })
  lifts = LIFT_ROWS.map(([id, liftCode, block, label, street, town, postalCode, contractorId, checkedAgo]) => ({
    id, liftCode, block, label, street, town, postalCode, contractorId, isActive: true,
    lastInspectedAt: checkedAgo === null ? null : day(-checkedAgo),
  }))
  users = USER_ROWS.map(([id, name, email, role, contractorId, isActive]) => ({ id, name, email, role, contractorId, isActive }))
}
resetRegister()

const nextId = (list) => Math.max(0, ...list.map((r) => r.id)) + 1
const contractorName = (id) => contractors.find((c) => c.id === id)?.name ?? ''
const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ')

// ── API shapes ───────────────────────────────────────────────────────────────

function liftToApi(lift) {
  const defects = DEFECTS.filter((d) => d.liftCode === lift.liftCode && d.status !== 'closed')
  return {
    ...lift,
    liftName: `Blk ${lift.block}${lift.label ? ` ${lift.label}` : ''}`,
    contractorName: contractorName(lift.contractorId),
    openDefects: defects.length,
    overdueDefects: defects.filter((d) => isOverdue(d)).length,
    pendingVerification: defects.filter((d) => d.status === 'pending_verification').length,
  }
}

const contractorToApi = (c) => ({ ...c, liftCount: lifts.filter((l) => l.contractorId === c.id && l.isActive).length })
const userToApi = (u) => ({ ...u, contractorName: u.contractorId ? contractorName(u.contractorId) : null })

const ok = (data, status = 200) => ({ status, body: { success: true, data } })
const err = (status, code, message) => ({ status, body: { success: false, code, message } })
const invalid = (message) => err(422, 'VALIDATION_ERROR', message)

// ── Lifts ────────────────────────────────────────────────────────────────────

const LIFT_CODE = /^LIFT-\d{4}$/

function saveLift(body, existing) {
  const liftCode = clean(body.liftCode).toUpperCase()
  const block = clean(body.block)
  const street = clean(body.street)
  const contractorId = Number(body.contractorId)

  if (!LIFT_CODE.test(liftCode)) return invalid('Lift code must look like LIFT-0000.')
  if (!block || !street) return invalid('Block and street are required.')
  if (!contractors.some((c) => c.id === contractorId)) return invalid('Choose a contractor from the register.')
  if (lifts.some((l) => l.liftCode === liftCode && l.id !== existing?.id)) {
    return err(409, 'DUPLICATE_LIFT_CODE', `${liftCode} is already in the register.`)
  }

  const fields = {
    liftCode, block, street, contractorId,
    label: clean(body.label), town: clean(body.town), postalCode: clean(body.postalCode),
    isActive: body.isActive !== false,
  }
  if (existing) {
    Object.assign(existing, fields)
    return ok(liftToApi(existing))
  }
  const lift = { id: nextId(lifts), ...fields, lastInspectedAt: null }
  lifts.push(lift)
  return ok(liftToApi(lift), 201)
}

function liftsCsv() {
  const header = ['lift_code', 'block', 'lift', 'street', 'town', 'postal_code', 'contractor', 'active', 'last_checked']
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = lifts.map((l) =>
    [l.liftCode, l.block, l.label, l.street, l.town, l.postalCode, contractorName(l.contractorId), l.isActive ? 'yes' : 'no', l.lastInspectedAt ?? '']
      .map(cell).join(',')
  )
  return [header.join(','), ...lines].join('\n')
}

// ── Bulk import (F05.1, F05.2, F05.5) ────────────────────────────────────────

export const IMPORT_COLUMNS = ['lift_code', 'block', 'lift', 'street', 'town', 'postal_code', 'contractor']
const REQUIRED_COLUMNS = ['lift_code', 'block', 'street', 'contractor']
const COLUMN_LABELS = { lift_code: 'lift code', block: 'block', street: 'street', contractor: 'contractor' }

// Small CSV reader: quoted cells, doubled quotes, CRLF or LF, and the BOM Excel adds.
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '')
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

// Checks an import file against the register without saving anything.
// Returns { error } when the file itself is unusable, otherwise:
//   ready     rows that can be imported (after fixes)
//   fixes     values corrected automatically, each shown to the admin: { row, field, from, to }
//   rejected  rows that cannot be imported: { row, liftCode, reason, values }
// `row` is the row number as the admin sees it in the spreadsheet (headings are row 1).
export function checkImport(csv, register = { lifts, contractors }) {
  const rows = parseCsv(csv)
  if (rows.length === 0) {
    return { error: { code: 'EMPTY_FILE', message: 'This file has nothing in it. Download the template to see the layout.' } }
  }
  const header = rows[0].map((h) => clean(h).toLowerCase().replace(/ /g, '_'))
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c))
  if (missing.length > 0) {
    return {
      error: {
        code: 'MISSING_COLUMNS',
        message: `The file is missing ${missing.length === 1 ? 'this column' : 'these columns'}: ${missing.join(', ')}. Download the template to see the layout.`,
      },
    }
  }
  if (rows.length === 1) {
    return { error: { code: 'EMPTY_FILE', message: 'The file has column headings but no lifts under them.' } }
  }

  const ready = []
  const fixes = []
  const rejected = []
  const seen = new Map() // lift code -> row number of its first use in this file

  rows.slice(1).forEach((cells, index) => {
    const row = index + 2
    const values = Object.fromEntries(header.map((h, i) => [h, clean(cells[i])]))
    const reject = (reason) => rejected.push({ row, liftCode: values.lift_code, reason, values })
    const fix = (field, to) => {
      fixes.push({ row, field, from: values[field], to })
      return to
    }

    const blank = REQUIRED_COLUMNS.filter((c) => !values[c])
    if (blank.length > 0) return reject(`Missing ${blank.map((c) => COLUMN_LABELS[c]).join(' and ')}`)

    // "lift-427", "LIFT 0427", "lift_427" -> "LIFT-0427"
    const codeMatch = values.lift_code.match(/^LIFT[-_ ]?(\d{1,4})$/i)
    if (!codeMatch) return reject(`Lift code "${values.lift_code}" is not recognised (expected LIFT-0000)`)
    const tidyCode = `LIFT-${codeMatch[1].padStart(4, '0')}`
    const liftCode = tidyCode === values.lift_code ? tidyCode : fix('lift_code', tidyCode)

    // "Blk Blk 5", "Block 512" -> "5", "512"
    const tidyBlock = values.block.replace(/^(?:(?:blk|block)\.?\s*)+/i, '')
    if (!tidyBlock) return reject('Missing block')
    const block = tidyBlock === values.block ? tidyBlock : fix('block', tidyBlock)

    const contractor = register.contractors.find((c) => c.name.toLowerCase() === values.contractor.toLowerCase())
    if (!contractor) return reject(`Contractor "${values.contractor}" is not in the register - add it under Contractors first`)
    if (!contractor.isActive) return reject(`Contractor "${contractor.name}" is inactive`)

    if (register.lifts.some((l) => l.liftCode === liftCode)) return reject(`${liftCode} is already in the register`)
    if (seen.has(liftCode)) return reject(`Same lift code as row ${seen.get(liftCode)}`)
    seen.set(liftCode, row)

    ready.push({
      row, liftCode, block,
      label: values.lift ?? '', street: values.street, town: values.town ?? '', postalCode: values.postal_code ?? '',
      contractorId: contractor.id, contractorName: contractor.name,
    })
  })

  return { total: rows.length - 1, ready, fixes, rejected }
}

function importLifts(body) {
  const result = checkImport(body.csv)
  if (result.error) return err(422, result.error.code, result.error.message)
  const dryRun = body.dryRun !== false
  if (!dryRun) {
    for (const { row, contractorName: _name, ...fields } of result.ready) {
      lifts.push({ id: nextId(lifts), ...fields, isActive: true, lastInspectedAt: null })
    }
  }
  return ok({ dryRun, total: result.total, accepted: result.ready.length, ready: result.ready, fixes: result.fixes, rejected: result.rejected })
}

// Files for the "try a sample" buttons on the Import tab, so the demo needs no file on disk.
export const SAMPLE_IMPORTS = {
  clean: {
    filename: 'lifts-clean.csv',
    csv: [
      IMPORT_COLUMNS.join(','),
      'LIFT-1001,221,Lift A,Bishan St 23,Bishan,570221,Apex Lifts',
      'LIFT-1002,221,Lift B,Bishan St 23,Bishan,570221,Apex Lifts',
      'LIFT-1003,145,Lift A,Lorong 2 Toa Payoh,Toa Payoh,310145,Summit Elevators',
      'LIFT-1004,146,Lift A,Lorong 2 Toa Payoh,Toa Payoh,310146,Summit Elevators',
      'LIFT-1005,60,Lift A,Marine Dr,Marine Parade,440060,Orion Lift Services',
    ].join('\n'),
  },
  problems: {
    filename: 'lifts-with-problems.csv',
    csv: [
      IMPORT_COLUMNS.join(','),
      'LIFT-2001,301,Lift A,Ang Mo Kio Ave 3,Ang Mo Kio,560301,Apex Lifts',
      'lift-2002,Blk Blk 5,Lift A,Hougang Ave 3,Hougang,530005,apex lifts',
      'LIFT-0427,512,Lift A,Hougang Ave 10,Hougang,530512,Apex Lifts',
      'LIFT-2003,302,Lift B,,Ang Mo Kio,560302,Summit Elevators',
      'LIFT-2004,88,Lift A,Bedok North Rd,Bedok,460088,Skyline Lifts',
      'LIFT-2001,301,Lift B,Ang Mo Kio Ave 3,Ang Mo Kio,560301,Apex Lifts',
      'LIFT 2005,Block 303,Lift A,Ang Mo Kio Ave 3,Ang Mo Kio,560303,Meridian Vertical',
    ].join('\n'),
  },
}

// ── Contractors ──────────────────────────────────────────────────────────────

function saveContractor(body, existing) {
  const name = clean(body.name)
  if (!name) return invalid('Company name is required.')
  if (contractors.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== existing?.id)) {
    return err(409, 'DUPLICATE_CONTRACTOR', `${name} is already in the register.`)
  }
  const isActive = body.isActive !== false
  if (existing && !isActive) {
    const active = lifts.filter((l) => l.contractorId === existing.id && l.isActive).length
    if (active > 0) {
      return err(409, 'CONTRACTOR_HAS_LIFTS',
        `${existing.name} still maintains ${active} active lift${active === 1 ? '' : 's'}. Move them to another contractor first.`)
    }
  }
  const fields = { name, contactName: clean(body.contactName), contactEmail: clean(body.contactEmail), contactPhone: clean(body.contactPhone), isActive }
  if (existing) {
    Object.assign(existing, fields)
    return ok(contractorToApi(existing))
  }
  const contractor = { id: nextId(contractors), ...fields }
  contractors.push(contractor)
  return ok(contractorToApi(contractor), 201)
}

// ── Users ────────────────────────────────────────────────────────────────────

const ROLES = ['admin', 'inspector', 'contractor']

// The signed-in account, read from the prototype token the same way the backend reads req.user.
function actorEmail(config) {
  try {
    const token = String(config.headers?.Authorization ?? '').replace(/^Bearer /, '')
    return JSON.parse(atob(token.split('.')[1])).email
  } catch {
    return null
  }
}

function temporaryPassword() {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return `Elev8-${Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('')}`
}

function saveUser(body, existing, config) {
  const name = clean(body.name)
  const email = clean(body.email).toLowerCase()
  const role = body.role
  const contractorId = role === 'contractor' ? Number(body.contractorId) || null : null
  const isActive = body.isActive !== false

  if (!name || !email) return invalid('Name and email are required.')
  if (!ROLES.includes(role)) return invalid('Choose a role.')
  if (role === 'contractor' && !contractors.some((c) => c.id === contractorId)) {
    return err(422, 'CONTRACTOR_REQUIRED', 'Choose the lift company this account belongs to.')
  }
  if (users.some((u) => u.email === email && u.id !== existing?.id)) {
    return err(409, 'DUPLICATE_EMAIL', `An account for ${email} already exists.`)
  }
  if (existing && !isActive && existing.email === actorEmail(config)) {
    return err(409, 'CANNOT_DEACTIVATE_SELF', 'You can’t deactivate the account you’re signed in with.')
  }

  const fields = { name, email, role, contractorId, isActive }
  if (existing) {
    Object.assign(existing, fields)
    return ok(userToApi(existing))
  }
  const user = { id: nextId(users), ...fields }
  users.push(user)
  return ok({ ...userToApi(user), temporaryPassword: temporaryPassword() }, 201)
}

// ── Router ───────────────────────────────────────────────────────────────────

// Answers lift, contractor and user requests; returns null for anything else.
// `empty` is the "Empty" demo scenario: lists come back with no records.
export function registerRequest(config, { method, path, body = {}, empty = false }) {
  const [, resource, rest] = path.match(/\/(lifts|contractors|users)(?:\/([\w-]+))?$/) ?? []
  if (!resource) return null

  const list = { lifts, contractors, users }[resource]
  const toApi = { lifts: liftToApi, contractors: contractorToApi, users: userToApi }[resource]
  const save = { lifts: saveLift, contractors: saveContractor, users: saveUser }[resource]

  if (!rest) {
    if (method === 'get') return ok(empty ? [] : list.map(toApi))
    if (method === 'post') return save(body, null, config)
    return null
  }
  if (resource === 'lifts' && rest === 'export' && method === 'get') return { status: 200, body: empty ? liftsCsv().split('\n')[0] : liftsCsv() }
  if (resource === 'lifts' && rest === 'import' && method === 'post') return importLifts(body)

  const record = list.find((r) => String(r.id) === rest)
  if (!record) return err(404, 'NOT_FOUND', 'That record no longer exists.')
  if (method === 'get') return ok(toApi(record))
  if (method === 'patch') return save({ ...record, ...body }, record, config)
  return null
}
