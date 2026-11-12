// Loads demo data into the database in DATABASE_URL so every teammate can build their
// part without waiting for anyone else's screens:
//   npm run db:seed
//
// - 3 contractors, 8 lifts, the 25-item checklist
// - demo logins: an admin, an inspector, and one contractor user per company
// - 6 submitted inspections, each with one defect - one defect in every status, two of them overdue
//
// Safe to run more than once: rows that already exist are left alone, and the demo
// inspections are only created if none exist yet. Run it AFTER npm run db:migrate.
// The database is shared, so one person runs it and shares the printed passwords privately.
//
// All names, addresses and companies are made up. The checklist is a PLACEHOLDER until
// EMS sends their official spot-check form (open question in design/feature-dependencies.md).
require('dotenv').config()
const sequelize = require('./config')
const {
  Contractor, Lift, ChecklistItem, User, Inspection, InspectionResult,
  Defect, DefectUpdate, Signoff, DefectEvent,
} = require('./models')
const { createOrResetUser } = require('./services/userService')
const { dueDateFor } = require('./services/defectService')

const SEED_MARKER = '[seed] demo inspection'

const CONTRACTORS = [
  { name: 'Apex Lift Engineering', contactName: 'Daniel Lim', contactEmail: 'ops@apex-lifts.example', contactPhone: '6123 4567' },
  { name: 'Summit Elevators', contactName: 'Priya Nair', contactEmail: 'service@summit.example', contactPhone: '6234 5678' },
  { name: 'Northline Lifts', contactName: 'Marcus Teo', contactEmail: 'help@northline.example', contactPhone: '6345 6789' },
]

// [liftCode, block, street, town, postalCode, contractor index]
const LIFTS = [
  ['LIFT-0427', '512', 'Hougang Avenue 10', 'Hougang', '530512', 0],
  ['LIFT-0428', '512', 'Hougang Avenue 10', 'Hougang', '530512', 0],
  ['LIFT-0311', '208', 'Tampines Street 21', 'Tampines', '520208', 0],
  ['LIFT-0512', '33', 'Bedok North Road', 'Bedok', '460033', 1],
  ['LIFT-0513', '33', 'Bedok North Road', 'Bedok', '460033', 1],
  ['LIFT-0640', '715', 'Yishun Street 71', 'Yishun', '760715', 1],
  ['LIFT-0702', '120', 'Bukit Batok Central', 'Bukit Batok', '650120', 2],
  ['LIFT-0703', '120', 'Bukit Batok Central', 'Bukit Batok', '650120', 2],
]

// PLACEHOLDER checklist - 25 items in 3 sections, replace with the official EMS form.
const CHECKLIST = [
  ['Motor room', 'MR-01', 'Machine and motor run without abnormal noise or vibration'],
  ['Motor room', 'MR-02', 'Brake operates correctly and brake linings are not worn'],
  ['Motor room', 'MR-03', 'Controller panel is closed, labelled and free of burn marks'],
  ['Motor room', 'MR-04', 'Overspeed governor and its seal are intact'],
  ['Motor room', 'MR-05', 'Suspension ropes show no broken wires or excessive wear'],
  ['Motor room', 'MR-06', 'Motor room lighting and ventilation are working'],
  ['Motor room', 'MR-07', 'Rescue device and instructions are in place'],
  ['Motor room', 'MR-08', 'Motor room door is locked and warning signage is displayed'],
  ['Lift car', 'LC-01', 'Car doors open and close smoothly'],
  ['Lift car', 'LC-02', 'Door safety edge or sensor reopens the doors'],
  ['Lift car', 'LC-03', 'All car buttons respond and light up'],
  ['Lift car', 'LC-04', 'Alarm bell and intercom reach the help line'],
  ['Lift car', 'LC-05', 'Emergency light works when power is cut'],
  ['Lift car', 'LC-06', 'Car stops level with each landing'],
  ['Lift car', 'LC-07', 'Car ventilation fan is working'],
  ['Lift car', 'LC-08', 'Car lighting and floor indicator are working'],
  ['Lift car', 'LC-09', 'Lift licence and capacity notice are displayed'],
  ['Hoistway and pit', 'HP-01', 'Landing doors close fully and cannot be opened without the car'],
  ['Hoistway and pit', 'HP-02', 'Landing door locks engage correctly'],
  ['Hoistway and pit', 'HP-03', 'Landing call buttons and indicators work at every floor'],
  ['Hoistway and pit', 'HP-04', 'Pit is dry and free of rubbish'],
  ['Hoistway and pit', 'HP-05', 'Buffers are in place and undamaged'],
  ['Hoistway and pit', 'HP-06', 'Pit stop switch cuts power to the lift'],
  ['Hoistway and pit', 'HP-07', 'Pit lighting is working'],
  ['Hoistway and pit', 'HP-08', 'Counterweight guard is in place'],
]

// One demo defect per status, so every screen has something to show.
// [lift index, checklist code, severity, status, description, daysAgo]
const DEMO_DEFECTS = [
  [0, 'LC-02', 'major', 'open', 'Door sensor does not reopen the doors', 1],
  [3, 'MR-06', 'minor', 'acknowledged', 'Motor room fluorescent light flickering', 2],
  [1, 'LC-05', 'critical', 'in_progress', 'Emergency light does not come on during power cut', 3],   // overdue
  [4, 'HP-04', 'minor', 'pending_verification', 'Water pooling in the pit', 6],
  [6, 'LC-06', 'major', 'closed', 'Car stops about 3 cm below level 5', 12],
  [2, 'MR-02', 'critical', 'open', 'Brake lining worn past the limit', 5],   // overdue: critical is due after 1 day
]

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function seedReferenceData() {
  const contractors = []
  for (const c of CONTRACTORS) {
    const [row] = await Contractor.findOrCreate({ where: { name: c.name }, defaults: c })
    contractors.push(row)
  }

  const lifts = []
  for (const [liftCode, block, street, town, postalCode, ci] of LIFTS) {
    const [row] = await Lift.findOrCreate({
      where: { liftCode },
      defaults: { liftCode, block, street, town, postalCode, contractorId: contractors[ci].id },
    })
    lifts.push(row)
  }

  const items = {}
  for (const [i, [section, code, description]] of CHECKLIST.entries()) {
    const [row] = await ChecklistItem.findOrCreate({ where: { code }, defaults: { section, code, description, sortOrder: i + 1 } })
    items[code] = row
  }

  console.log(`Contractors: ${contractors.length}, lifts: ${lifts.length}, checklist items: ${Object.keys(items).length}`)
  return { contractors, lifts, items }
}

async function seedUsers(contractors) {
  const accounts = [
    { name: 'Demo Admin', email: 'admin.demo@example.com', role: 'admin' },
    { name: 'Demo Inspector', email: 'inspector.demo@example.com', role: 'inspector' },
    ...contractors.map((c, i) => ({
      name: `${c.name} (demo)`,
      email: `contractor${i + 1}.demo@example.com`,
      role: 'contractor',
      contractorId: c.id,
    })),
  ]

  const users = {}
  for (const { contractorId, ...account } of accounts) {
    let user = await User.findOne({ where: { email: account.email } })
    if (!user) {
      const result = await createOrResetUser(account)
      console.log(`Created ${account.role.padEnd(10)} ${account.email}  password: ${result.password}`)
      user = await User.findOne({ where: { email: account.email } })
    }
    if (contractorId && user.contractorId !== contractorId) await user.update({ contractorId })
    users[account.email] = user
  }
  return users
}

async function seedDemoInspections({ lifts, items }, users) {
  if (await Inspection.count({ where: { remarks: SEED_MARKER } })) {
    console.log('Demo inspections already exist - skipped.')
    return
  }
  const inspector = users['inspector.demo@example.com']
  const contractorUser = (contractorId) => Object.values(users).find((u) => u.contractorId === contractorId)

  await sequelize.transaction(async (transaction) => {
    for (const [liftIndex, failedCode, severity, status, description, ago] of DEMO_DEFECTS) {
      const lift = lifts[liftIndex]
      const when = daysAgo(ago)
      const inspection = await Inspection.create({
        liftId: lift.id, inspectorId: inspector.id, status: 'submitted', remarks: SEED_MARKER, submittedAt: when,
      }, { transaction })

      let failedResult
      for (const item of Object.values(items)) {
        const isDefect = item.code === failedCode
        const result = await InspectionResult.create({
          inspectionId: inspection.id,
          checklistItemId: item.id,
          result: isDefect ? 'defect' : 'pass',
          defectDescription: isDefect ? description : null,
          severity: isDefect ? severity : null,
        }, { transaction })
        if (isDefect) failedResult = result
      }

      const defect = await Defect.create({
        inspectionId: inspection.id,
        inspectionResultId: failedResult.id,
        liftId: lift.id,
        contractorId: lift.contractorId,
        description,
        severity,
        status,
        dueDate: dueDateFor(severity, when),
        closedAt: status === 'closed' ? daysAgo(1) : null,
      }, { transaction })

      await DefectEvent.create({ defectId: defect.id, actorId: inspector.id, action: 'created', toStatus: 'open' }, { transaction })
      if (status !== 'open') {
        await DefectEvent.create({
          defectId: defect.id, actorId: null, action: 'status_change', fromStatus: 'open', toStatus: status, note: 'Demo data',
        }, { transaction })
      }

      const contractor = contractorUser(lift.contractorId)
      if (['in_progress', 'pending_verification', 'closed'].includes(status)) {
        await DefectUpdate.create({ defectId: defect.id, userId: contractor.id, note: 'Parts ordered, repair scheduled.' }, { transaction })
      }
      if (['pending_verification', 'closed'].includes(status)) {
        await Signoff.create({
          defectId: defect.id,
          signedBy: contractor.id,
          signedAt: daysAgo(2),
          confirmationText: 'I confirm the repair is complete.',
          verifiedBy: status === 'closed' ? inspector.id : null,
          verifiedAt: status === 'closed' ? daysAgo(1) : null,
          decision: status === 'closed' ? 'approved' : null,
        }, { transaction })
      }
    }
  })
  console.log(`Demo inspections: ${DEMO_DEFECTS.length}, one defect each (every status, two overdue)`)
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set - add it to backend/.env')
  const reference = await seedReferenceData()
  const users = await seedUsers(reference.contractors)
  await seedDemoInspections(reference, users)
  console.log('Seed complete. Passwords are printed only when an account is first created - share them privately, never commit them.')
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('Seed failed:', err.message)
      process.exitCode = 1
    })
    .finally(() => sequelize.close())
}

module.exports = { CHECKLIST, CONTRACTORS, LIFTS, DEMO_DEFECTS }
