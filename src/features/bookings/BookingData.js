import { assignmentIsDue } from '../../shared/lib/assignmentAlert.js'
import { rentalDate, rentalDay, rentalDateTime, shiftRentalDays, formatRentalDateTime } from '../../shared/lib/rentalTime.js'
export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled']
export const PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Paid', 'Partially Refunded', 'Refunded']

export const dayKey = rentalDay
export const shiftDays = shiftRentalDays
export const localDateTime = rentalDateTime
export const formatDateTime = formatRentalDateTime

export const sar = (value) => `SAR ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function paymentStatus(booking) {
  const received = Number(booking.receivedAmount || 0)
  const refunded = Number(booking.refundedAmount || 0)
  if (refunded > 0 && refunded >= received) return 'Refunded'
  if (refunded > 0) return 'Partially Refunded'
  if (received >= Number(booking.invoicedAmount ?? booking.totalAmount ?? 0) && received > 0) return 'Paid'
  if (received > 0) return 'Partially Paid'
  return 'Unpaid'
}

export const netPaid = (booking) => Math.max(0, Number(booking.receivedAmount || 0) - Number(booking.refundedAmount || 0))
export const balanceDue = (booking) => booking.status === 'Cancelled' ? 0 : Math.max(0, Number(booking.invoicedAmount ?? booking.totalAmount ?? 0) - netPaid(booking))
export const isOverdue = (booking, now = new Date()) => booking.status === 'Active' && rentalDate(booking.returnAt).getTime() < now.getTime()

export function bookingPriority(booking, now = new Date()) {
  const today = dayKey(now)
  if (booking.status === 'Confirmed' && assignmentIsDue(booking, now) && (!booking.vehicleId || (booking.driverMode !== 'Self-drive' && !booking.driverId))) return { score: 96, label: 'Assignment alert due', tone: 'danger' }
  if (isOverdue(booking, now)) return { score: 100, label: 'Overdue return', tone: 'danger' }
  if (booking.status === 'Confirmed' && booking.bookingType === 'Advance' && !booking.vehicleId && dayKey(booking.pickupAt) <= today) return { score: 95, label: booking.driverMode === 'Self-drive' ? 'Assign vehicle' : 'Assign vehicle & driver', tone: 'danger' }
  if (booking.status === 'Confirmed' && dayKey(booking.pickupAt) <= today) return { score: 90, label: 'Handover pending', tone: 'warning' }
  if (booking.status === 'Active' && dayKey(booking.returnAt) === today) return { score: 80, label: 'Return today', tone: 'warning' }
  if (booking.status === 'Pending') return { score: 70, label: 'Needs confirmation', tone: 'warning' }
  if (booking.status === 'Confirmed' && dayKey(booking.pickupAt) === dayKey(shiftDays(now, 1))) return { score: 60, label: 'Pickup tomorrow', tone: 'info' }
  if (booking.status === 'Active') return { score: 50, label: 'On rent', tone: 'info' }
  if (booking.status === 'Confirmed') return { score: 40, label: 'Upcoming', tone: 'info' }
  if (booking.status === 'Completed') return { score: 10, label: 'Completed', tone: 'muted' }
  return { score: 0, label: 'Cancelled', tone: 'muted' }
}

export function periodBounds(preset, customStart, customEnd, now = new Date()) {
  const today = dayKey(now)
  const [year, month, day] = today.split('-').map(Number)
  const calendar = (offset, date) => new Date(Date.UTC(year, month-1+offset, date, 9))
  const monthStart = calendar(0,1)
  let start, end = today, previousStart = '', previousEnd = ''
  if (preset === 'Today') {
    start = today
    previousStart = previousEnd = dayKey(shiftDays(now, -1))
  } else if (preset === 'Last 7 days') {
    start = dayKey(shiftDays(now, -6))
    previousStart = dayKey(shiftDays(now, -13))
    previousEnd = dayKey(shiftDays(now, -7))
  } else if (preset === 'Last 30 days') {
    start = dayKey(shiftDays(now, -29))
    previousStart = dayKey(shiftDays(now, -59))
    previousEnd = dayKey(shiftDays(now, -30))
  } else if (preset === 'This month') {
    start = dayKey(monthStart)
    previousStart = dayKey(calendar(-1,1))
    previousEnd = dayKey(calendar(-1,Math.min(day, calendar(0,0).getUTCDate())))
  } else if (preset === 'Last month') {
    start = dayKey(calendar(-1,1))
    end = dayKey(calendar(0,0))
    previousStart = dayKey(calendar(-2,1))
    previousEnd = dayKey(calendar(-1,0))
  } else if (preset === 'Custom range') {
    start = customStart
    end = customEnd
    if (start && end && start <= end) {
      const days = Math.round((rentalDate(`${end}T12:00`).getTime() - rentalDate(`${start}T12:00`).getTime()) / 86400000) + 1
      previousStart = dayKey(shiftDays(rentalDate(`${start}T12:00`), -days))
      previousEnd = dayKey(shiftDays(rentalDate(`${start}T12:00`), -1))
    }
  } else {
    start = ''
    end = ''
  }
  return { start, end, previousStart, previousEnd, valid: !start || !end || start <= end }
}

export const inDateRange = (value, start, end) => {
  const day = dayKey(value)
  return Boolean(day) && (!start || day >= start) && (!end || day <= end)
}

export function makeDemoBookings() {
  const now = new Date()
  const at = (offset, hour, minute = 0) => {
    const date = shiftDays(now, offset)
    date.setHours(hour, minute, 0, 0)
    return localDateTime(date)
  }
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 12, 11)
  const beforePreviousMonth = new Date(now.getFullYear(), now.getMonth() - 2, 20, 11)
  const rows = [
    ['BK-2048', 'Olivia Martin', '+966 50 145 2290', 1, 1, -3, -1, 'Active', 1280, 900, 0, -6, 10, 18],
    ['BK-2049', 'James Wilson', '+966 55 284 3110', 2, null, 0, 3, 'Confirmed', 920, 320, 0, -2, 18, 14],
    ['BK-2050', 'Sophia Lee', '+966 54 390 8122', 3, 2, -2, 0, 'Active', 1860, 1860, 0, -5, 9, 23],
    ['BK-2051', 'Noah Brown', '+966 56 401 2251', 4, null, 0, 2, 'Pending', 760, 0, 0, 0, 20, 15],
    ['BK-2052', 'Aisha Rahman', '+966 58 512 6037', 5, 3, 1, 5, 'Confirmed', 2350, 700, 0, -1, 11, 18],
    ['BK-2053', 'Omar Nasser', '+966 59 620 1941', 6, null, -12, -8, 'Completed', 1650, 1650, 0, -16, 9, 17],
    ['BK-2054', 'Fatima Ali', '+966 53 774 0808', 7, null, -5, 0, 'Cancelled', 490, 490, 490, -7, 10, 18],
    ['BK-2055', 'Daniel Harris', '+966 57 811 9940', 8, 4, 7, 10, 'Confirmed', 1480, 1480, 0, -1, 8, 17],
    ['BK-2056', 'Mariam Saleh', '+966 52 914 5544', 9, null, -1, 3, 'Active', 2100, 1200, 0, -3, 9, 21],
    ['BK-2057', 'Hassan Malik', '+966 50 032 7002', 10, 5, 2, 4, 'Pending', 1080, 0, 0, 0, 16, 11],
    ['BK-2058', 'Lina Haddad', '+966 55 120 5501', 11, null, -35, -32, 'Completed', 1340, 1340, 0, -40, 10, 14],
    ['BK-2059', 'Yusuf Ali', '+966 54 240 9700', 12, null, -34, -30, 'Cancelled', 640, 640, 250, -38, 11, 14],
    ['BK-2060', 'Priya Menon', '+966 56 340 2233', 1, null, 0, 1, 'Confirmed', 530, 530, 0, -1, 16, 12],
    ['BK-2061', 'Bilal Qureshi', '+966 58 650 3200', 2, 6, -5, -2, 'Active', 1770, 1770, 0, -8, 8, 17],
  ]
  return rows.map(([bookingId, customerName, customerPhone, vehicleId, driverId, pickupOffset, returnOffset, status, totalAmount, receivedAmount, refundedAmount, bookedOffset, pickupHour, returnHour], index) => ({
    id: index + 1, bookingId, customerName, customerPhone,
    customerEmail: `${customerName.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.$/, '')}@example.com`,
    emailNotifications: true,
    bookingType: ['Pending', 'Confirmed'].includes(status) ? 'Advance' : 'Quick',
    requestedType: ['Sedan', 'SUV', 'Van', 'Electric', 'Luxury'][index % 5],
    vehicleId: ['Pending', 'Confirmed'].includes(status) ? null : vehicleId,
    driverMode: ['Pending', 'Confirmed'].includes(status) ? index % 3 === 0 ? 'Self-drive' : 'Unassigned' : driverId ? 'Assigned' : 'Self-drive',
    driverId: ['Pending', 'Confirmed'].includes(status) ? null : driverId,
    pickupAt: at(pickupOffset, pickupHour), returnAt: at(returnOffset, returnHour),
    pickupLocation: ['King Khalid International Airport', 'Riyadh City Office', 'Olaya Pickup Point'][index % 3],
    destination: ['Riyadh City Office', 'King Khalid International Airport', 'King Abdullah Financial District'][index % 3],
    rateUnit: 'Day', unitPrice: Math.round(totalAmount / Math.max(1, returnOffset - pickupOffset)),
    bookedAt: index === 10 || index === 11 ? localDateTime(previousMonth) : index === 5 ? localDateTime(beforePreviousMonth) : at(bookedOffset, 11),
    totalAmount, receivedAmount, refundedAmount, status,
    handedOverAt: status === 'Active' || status === 'Completed' ? at(pickupOffset, pickupHour) : '',
    notes: '',
  }))
}
