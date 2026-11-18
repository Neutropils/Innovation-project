// Owner: Jerald
// Hard-coded sample defects for the Inbox and Defect detail until the API is built.
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

// Called once per page load, so the dates are relative to the day the app is opened.
export function getMockDefects(today = new Date()) {
  const day = (n) => daysFromToday(n, today)
  // ISO timestamp n days from today at a local 'HH:MM'
  const at = (n, time) => {
    const [h, m] = time.split(':').map(Number)
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + n, h, m).toISOString()
  }

  // id is the number used in URLs (/defects/81); code is what people read (DEF-000081).
  // history is newest first; `by` marks a progress note posted by the contractor.
  return [
    {
      id: 81,
      code: 'DEF-000081',
      severity: 'Critical',
      liftCode: 'LIFT-0311',
      address: 'Blk 305 Hougang St 31',
      description: 'Machine brake noise',
      photoLabel: 'Machine room inspection',
      status: 'open',
      reportedAt: at(-6, '09:35'),
      dueDate: day(-2),
      dueTime: '17:00',
      history: [
        { title: `Defect assigned to ${CONTRACTOR_NAME}`, at: at(-6, '09:42') },
        { title: 'Defect reported by Tan', at: at(-6, '09:35') },
      ],
    },
    {
      id: 88,
      code: 'DEF-000088',
      severity: 'Major',
      liftCode: 'LIFT-0427',
      address: 'Blk 512 Hougang Ave 10',
      description: 'Door sensor not responding',
      photoLabel: 'Lift car inspection',
      status: 'open',
      reportedAt: at(-6, '11:02'),
      dueDate: day(7),
      dueTime: '17:00',
      history: [
        { title: `Defect assigned to ${CONTRACTOR_NAME}`, at: at(-6, '11:10') },
        { title: 'Defect reported by Tan', at: at(-6, '11:02') },
      ],
    },
    {
      id: 74,
      code: 'DEF-000074',
      severity: 'Major',
      liftCode: 'LIFT-0298',
      address: 'Blk 211 Serangoon Ave 4',
      description: 'Landing door alignment',
      photoLabel: 'Landing door inspection',
      status: 'in_progress',
      reportedAt: at(-7, '14:48'),
      dueDate: day(-3),
      dueTime: '17:00',
      history: [
        { title: 'Ordered new door guide shoes', by: 'Lim', at: at(-6, '10:20') },
        { title: 'Acknowledged by Lim', at: at(-7, '15:14') },
        { title: 'Defect reported by Tan', at: at(-7, '14:48') },
      ],
    },
    {
      id: 69,
      code: 'DEF-000069',
      severity: 'Minor',
      liftCode: 'LIFT-0184',
      address: 'Blk 88 Punggol Way',
      description: 'Cabin light flickering',
      photoLabel: 'Lift car inspection',
      status: 'in_progress',
      reportedAt: at(-8, '09:50'),
      dueDate: day(2),
      dueTime: '17:00',
      history: [
        { title: 'Replacement light panel on order', by: 'Lim', at: at(-7, '11:05') },
        { title: 'Acknowledged by Lim', at: at(-8, '10:22') },
        { title: 'Defect reported by Tan', at: at(-8, '09:50') },
      ],
    },
    {
      id: 61,
      code: 'DEF-000061',
      severity: 'Major',
      liftCode: 'LIFT-0356',
      address: 'Blk 401 Hougang Ave 8',
      description: 'Emergency bell intermittent',
      photoLabel: 'Lift car inspection',
      status: 'in_progress',
      reportedAt: at(-10, '15:40'),
      dueDate: day(-2),
      dueTime: '17:00',
      history: [
        { title: 'Rejected by Tan: Audio still cuts out', tone: 'warn', at: at(-6, '13:05') },
        { title: 'Signed off by Lim', at: at(-6, '11:30') },
        { title: 'Acknowledged by Lim', at: at(-9, '16:18') },
        { title: 'Defect reported by Tan', at: at(-10, '15:40') },
      ],
    },
    {
      id: 52,
      code: 'DEF-000052',
      severity: 'Minor',
      liftCode: 'LIFT-0203',
      address: 'Blk 117 Rivervale Drive',
      description: 'Floor indicator dim',
      photoLabel: 'Lift car inspection',
      status: 'closed',
      reportedAt: at(-13, '10:15'),
      dueDate: day(-10),
      dueTime: '17:00',
      completedDate: day(-11),
      history: [
        { title: 'Approved by Tan', tone: 'good', at: at(-11, '16:40') },
        { title: 'Signed off by Lim', at: at(-11, '14:12') },
        { title: 'Acknowledged by Lim', at: at(-12, '09:10') },
        { title: 'Defect reported by Tan', at: at(-13, '10:15') },
      ],
    },
  ]
}
