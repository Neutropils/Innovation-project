// Prototype demo data for the EMS (admin) pages - fictional contractors, lifts and defects.
import { matchesDates, matchesSearch } from '@/pages/defects/defectDisplay'

// Dates are relative to today so the overdue flags stay realistic whenever the demo runs.
// Shapes match the planned API (design/feature-dependencies.md "Endpoints").

export const CONTRACTORS = [
  // Fictional companies and contacts - demo only (.demo is not a real domain)
  { id: 1, name: 'Apex Lifts',          contactName: 'Daniel Ong',  phone: '+65 6000 0101', email: 'service@apex-lifts.demo' },
  { id: 2, name: 'Summit Elevators',    contactName: 'Priya Nair',  phone: '+65 6000 0202', email: 'ops@summit-elevators.demo' },
  { id: 3, name: 'Orion Lift Services', contactName: 'Jason Lee',   phone: '+65 6000 0303', email: 'help@orion-lifts.demo' },
  { id: 4, name: 'Meridian Vertical',   contactName: 'Mei Ling Goh', phone: '+65 6000 0404', email: 'care@meridian-vertical.demo' },
]

// Days until due by severity - mirrors SEVERITY_DUE_DAYS placeholders (TBC with EMS)
export const SEVERITY_DUE_DAYS = { critical: 1, major: 7, minor: 14 }

const day = (offset) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

// [id, liftCode, liftName, item, severity, status, contractorId, createdDaysAgo]
// Due date = created + SEVERITY_DUE_DAYS, so overdue falls out of the data naturally.
const ROWS = [
  [88, 'LIFT-0427', 'Blk 512 Lift A', 'Door sensor not responding', 'major', 'open', 1, 2],
  [81, 'LIFT-0311', 'Blk 208 Lift B', 'Machine brake wear beyond limit', 'critical', 'in_progress', 1, 4],
  [79, 'LIFT-0427', 'Blk 512 Lift A', 'Car lighting flickering', 'minor', 'acknowledged', 1, 6],
  [74, 'LIFT-0102', 'Blk 101 Lift A', 'Landing door gap too wide', 'major', 'pending_verification', 1, 9],
  [72, 'LIFT-0518', 'Blk 330 Lift C', 'Alarm button intercom silent', 'critical', 'open', 2, 3],
  [70, 'LIFT-0519', 'Blk 330 Lift D', 'Levelling off by 15 mm', 'major', 'in_progress', 2, 10],
  [66, 'LIFT-0640', 'Blk 415 Lift A', 'Pit light not working', 'minor', 'pending_verification', 2, 12],
  [63, 'LIFT-0233', 'Blk 77 Lift B', 'Controller fault log errors', 'major', 'open', 3, 1],
  [60, 'LIFT-0233', 'Blk 77 Lift B', 'Emergency light battery flat', 'critical', 'acknowledged', 3, 5],
  [57, 'LIFT-0761', 'Blk 902 Lift A', 'Handrail loose', 'minor', 'in_progress', 3, 20],
  [52, 'LIFT-0855', 'Blk 640 Lift B', 'Overspeed governor tag expired', 'major', 'open', 4, 0],
  [49, 'LIFT-0102', 'Blk 101 Lift A', 'Car door edge rubber torn', 'minor', 'closed', 1, 18],
  [45, 'LIFT-0518', 'Blk 330 Lift C', 'Hoistway debris', 'minor', 'closed', 2, 25],
  [41, 'LIFT-0855', 'Blk 640 Lift B', 'Buffer oil low', 'major', 'closed', 4, 40],
]

export const DEFECTS = ROWS.map(([id, liftCode, liftName, item, severity, status, contractorId, ago]) => ({
  id,
  code: `DEF-${String(id).padStart(6, '0')}`,
  liftCode,
  liftName,
  item,
  severity,
  status,
  contractorId,
  contractorName: CONTRACTORS.find((c) => c.id === contractorId).name,
  createdAt: day(-ago),
  dueDate: day(-ago + SEVERITY_DUE_DAYS[severity]),
}))

// Inspections submitted, per period (no inspection list in this prototype yet)
const INSPECTIONS = { week: 12, month: 42, '30d': 47, all: 318 }

const PERIOD_DAYS = { week: 7, month: new Date().getDate() - 1, '30d': 30, all: Infinity }

export const isOverdue = (d, today = day(0)) => d.status !== 'closed' && d.dueDate < today

function inPeriod(d, period) {
  const days = PERIOD_DAYS[period] ?? Infinity
  return days === Infinity || d.createdAt >= day(-days)
}

// GET /api/defects?contractorId=&status=&severity=&overdue=&q=&reported=&from=&to=&due=
export function queryDefects(params = {}) {
  return DEFECTS.filter((d) =>
    matchesSearch(d, params.q) &&
    matchesDates(d, params) &&
    (!params.contractorId || d.contractorId === Number(params.contractorId)) &&
    (!params.status || (params.status === 'active' ? d.status !== 'closed' : d.status === params.status)) &&
    (!params.severity || d.severity === params.severity) &&
    (String(params.overdue) !== 'true' || isOverdue(d))
  ).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

// GET /api/overview?period=
export function overview(period = 'month') {
  const list = DEFECTS.filter((d) => inPeriod(d, period))
  const count = (fn) => list.filter(fn).length
  return {
    period,
    open: count((d) => d.status !== 'closed'),
    overdue: count((d) => isOverdue(d)),
    pendingVerification: count((d) => d.status === 'pending_verification'),
    inspections: INSPECTIONS[period] ?? INSPECTIONS.month,
    byContractor: CONTRACTORS.map((c) => ({
      contractorId: c.id,
      name: c.name,
      open: count((d) => d.contractorId === c.id && d.status !== 'closed'),
      overdue: count((d) => d.contractorId === c.id && isOverdue(d)),
    })),
  }
}

// GET /api/defects/export - CSV of the filtered list
export function defectsCsv(params) {
  const header = ['Defect', 'Lift', 'Location', 'Item', 'Severity', 'Status', 'Contractor', 'Due date', 'Overdue']
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`
  const lines = queryDefects(params).map((d) =>
    [d.code, d.liftCode, d.liftName, d.item, d.severity, d.status, d.contractorName, d.dueDate, isOverdue(d) ? 'yes' : 'no'].map(cell).join(',')
  )
  return [header.join(','), ...lines].join('\n')
}

export const EMPTY_OVERVIEW = (period) => ({
  period, open: 0, overdue: 0, pendingVerification: 0, inspections: 0,
  byContractor: CONTRACTORS.map((c) => ({ contractorId: c.id, name: c.name, open: 0, overdue: 0 })),
})
