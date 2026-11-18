// Owner: Jerald
// Hard-coded sample defects for the Inbox until GET /api/inbox?status= is built.
// Matches the Figma Make prototype. Dates are worked out from today, so
// "Due in 7 days" and "Overdue by 2 days" stay correct whenever the page is opened.

export const CONTRACTOR_NAME = 'Apex Lifts'

// 'YYYY-MM-DD' in the device's local time (toISOString would give the UTC date).
export function toLocalDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysFromToday(days, today = new Date()) {
  return toLocalDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days))
}

// Called when the page mounts, so the dates are relative to the day the page is opened.
export function getMockDefects(today = new Date()) {
  const day = (n) => daysFromToday(n, today)
  return [
    {
      id: 'DEF-000081',
      severity: 'Critical',
      liftCode: 'LIFT-0311',
      address: 'Blk 305 Hougang St 31',
      description: 'Machine brake noise',
      status: 'open',
      dueDate: day(-2),
      dueTime: '17:00',
    },
    {
      id: 'DEF-000088',
      severity: 'Major',
      liftCode: 'LIFT-0427',
      address: 'Blk 512 Hougang Ave 10',
      description: 'Door sensor not responding',
      status: 'open',
      dueDate: day(7),
      dueTime: '17:00',
    },
    {
      id: 'DEF-000074',
      severity: 'Major',
      liftCode: 'LIFT-0298',
      address: 'Blk 211 Serangoon Ave 4',
      description: 'Landing door alignment',
      status: 'in_progress',
      dueDate: day(-3),
      dueTime: '17:00',
    },
    {
      id: 'DEF-000069',
      severity: 'Minor',
      liftCode: 'LIFT-0184',
      address: 'Blk 88 Punggol Way',
      description: 'Cabin light flickering',
      status: 'in_progress',
      dueDate: day(2),
      dueTime: '17:00',
    },
    {
      id: 'DEF-000061',
      severity: 'Major',
      liftCode: 'LIFT-0356',
      address: 'Blk 401 Hougang Ave 8',
      description: 'Emergency bell intermittent',
      status: 'in_progress',
      dueDate: day(-2),
      dueTime: '17:00',
    },
    {
      id: 'DEF-000052',
      severity: 'Minor',
      liftCode: 'LIFT-0203',
      address: 'Blk 117 Rivervale Drive',
      description: 'Floor indicator dim',
      status: 'closed',
      dueDate: day(-10),
      dueTime: '17:00',
      completedDate: day(-11),
    },
  ]
}
