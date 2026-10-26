import { rentalDate } from '../../shared/lib/rentalTime.js'
import { dayKey, localDateTime, shiftDays } from '../bookings/BookingData.js'

export const CORPORATE_STATUSES = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled']
export const CORPORATE_BILLING_STATUSES = ['Unbilled', 'Invoiced', 'Paid']

export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
export const tripStops = (trip) => trip.stops?.length >= 2 ? trip.stops : [
  { id: 'pickup', location: trip.pickupLocation || '', waitingMinutes: 0 },
  { id: 'dropoff', location: trip.destination || '', waitingMinutes: 0 },
]
export const tripPassengers = (trip) => trip.passengers?.length ? trip.passengers : [
  { id: 'lead', name: trip.contactName || '', phone: trip.contactPhone || '' },
]
export const waitingMinutes = (stops) => stops.reduce((sum, stop) => sum + Number(stop.waitingMinutes || 0), 0)
export const billableWaitingMinutes = (stops, includedWaitingMinutes = 0, waitingBillingIncrementMinutes = 1) => {
  const included = Number(includedWaitingMinutes || 0)
  const increment = Number(waitingBillingIncrementMinutes || 1)
  if (!Number.isFinite(included) || !Number.isFinite(increment) || increment <= 0) return 0
  const excess = Math.max(0, waitingMinutes(stops) - included)
  return Math.ceil(excess / increment) * increment
}
export function tripCharges({ unitPrice, quantity, waitingRatePerHour, includedWaitingMinutes, waitingBillingIncrementMinutes, stops, taxPercent }) {
  const base = roundMoney(Number(unitPrice || 0) * Number(quantity || 0))
  const waiting = roundMoney(billableWaitingMinutes(stops, includedWaitingMinutes, waitingBillingIncrementMinutes) * Number(waitingRatePerHour || 0) / 60)
  const subtotal = roundMoney(base + waiting)
  const taxAmount = roundMoney(subtotal * Number(taxPercent || 0) / 100)
  return { base, waiting, subtotal, taxAmount, totalAmount: roundMoney(subtotal + taxAmount) }
}

const overlaps = (aStart, aEnd, bStart, bEnd) => rentalDate(aStart) < rentalDate(bEnd) && rentalDate(aEnd) > rentalDate(bStart)
export function resourceConflict(kind, id, pickupAt, returnAt, currentTripId, trips, bookings) {
  if (!id) return false
  const field = kind === 'vehicle' ? 'vehicleId' : 'driverId'
  return [...trips.filter((trip) => trip.id !== currentTripId), ...bookings].some((record) =>
    record[field] === Number(id) && !['Completed', 'Cancelled'].includes(record.status) && overlaps(pickupAt, returnAt, record.pickupAt, record.returnAt))
}

export function corporatePriority(trip, now = new Date()) {
  const today = dayKey(now)
  if (trip.status === 'Active' && rentalDate(trip.returnAt) < now) return { score: 100, label: 'Overdue return', tone: 'danger' }
  if (trip.status === 'Confirmed' && dayKey(trip.pickupAt) <= today && (!trip.vehicleId || (trip.serviceMode === 'With driver' && !trip.driverId))) return { score: 95, label: 'Assignment needed', tone: 'danger' }
  if (trip.status === 'Confirmed' && dayKey(trip.pickupAt) <= today) return { score: 90, label: 'Handover pending', tone: 'warning' }
  if (trip.status === 'Pending' && dayKey(trip.pickupAt) <= today) return { score: 85, label: 'Confirm urgently', tone: 'danger' }
  if (trip.status === 'Active' && dayKey(trip.returnAt) === today) return { score: 80, label: 'Return today', tone: 'warning' }
  if (trip.status === 'Pending') return { score: 70, label: 'Needs approval', tone: 'warning' }
  if (trip.status === 'Confirmed' && dayKey(trip.pickupAt) === dayKey(shiftDays(now, 1))) return { score: 60, label: 'Pickup tomorrow', tone: 'info' }
  if (trip.status === 'Active') return { score: 50, label: 'On trip', tone: 'info' }
  if (trip.status === 'Confirmed') return { score: 40, label: 'Upcoming', tone: 'info' }
  if (trip.status === 'Completed' && trip.billingStatus !== 'Paid') return { score: 30, label: 'Billing follow-up', tone: 'info' }
  if (trip.status === 'Completed') return { score: 10, label: 'Completed', tone: 'muted' }
  return { score: 0, label: 'Cancelled', tone: 'muted' }
}

export function makeDemoCorporateTrips() {
  const now = new Date()
  const at = (offset, hour, minute = 0) => {
    const date = shiftDays(now, offset)
    date.setHours(hour, minute, 0, 0)
    return localDateTime(date)
  }
  const rows = [
    ['CT-3001', 'Nexa Technologies', 'Aisha Rahman', 'SUV', 'With driver', 27, 7, -2, 0, 'Active', 'Unbilled', 2, 2450, -5],
    ['CT-3002', 'Al Noor Holdings', 'Omar Faris', 'Van', 'With driver', null, null, 0, 2, 'Confirmed', 'Unbilled', 6, 3100, -2],
    ['CT-3003', 'Desert Gate Energy', 'Sara Ibrahim', 'Sedan', 'With driver', null, null, 1, 3, 'Confirmed', 'Unbilled', 3, 1650, -1],
    ['CT-3004', 'Blue Crescent Group', 'Khalid Mansour', 'Luxury', 'With driver', null, null, 5, 6, 'Pending', 'Unbilled', 2, 2200, 0],
    ['CT-3005', 'Nexa Technologies', 'Rania Saleh', 'Sedan', 'Self-drive', 13, null, -8, -6, 'Completed', 'Invoiced', 1, 1080, -10],
    ['CT-3006', 'Al Noor Holdings', 'Fatima Ali', 'SUV', 'With driver', null, null, 7, 8, 'Cancelled', 'Unbilled', 2, 1300, -3],
    ['CT-3007', 'Gulf Meridian', 'Bilal Khan', 'Luxury', 'With driver', 33, 3, -4, -1, 'Active', 'Invoiced', 2, 4200, -6],
    ['CT-3008', 'Cedar Logistics', 'Mariam Yusuf', 'Van', 'Self-drive', null, null, 0, 1, 'Confirmed', 'Unbilled', 7, 1750, -1],
    ['CT-3009', 'Desert Gate Energy', 'Hassan Ali', 'Electric', 'With driver', null, null, 12, 14, 'Confirmed', 'Unbilled', 2, 2950, -2],
    ['CT-3010', 'Blue Crescent Group', 'Leila Ahmed', 'SUV', 'Self-drive', 39, null, -24, -22, 'Completed', 'Paid', 3, 1580, -27],
  ]
  return rows.map(([tripId, companyName, contactName, requestedType, serviceMode, vehicleId, driverId, pickupOffset, returnOffset, status, billingStatus, passengerCount, totalAmount, bookedOffset], index) => ({
    id: index + 1, tripId, companyName, contactName,
    contactEmail: `${contactName.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.$/, '')}@example.com`,
    contactPhone: `+966 5${index + 1} 210 ${String(3100 + index * 107)}`,
    emailNotifications: true,
    projectManager: ['Noura Ali', 'Faisal Ahmed', 'Maha Hassan'][index % 3],
    projectCode: `PRJ-${String(420 + index)}`, projectRemarks: '',
    bookingType: ['Active', 'Completed'].includes(status) ? 'Quick' : 'Advance',
    serviceMode, requestedType, vehicleId, driverId,
    pickupAt: at(pickupOffset, 9 + index % 5), returnAt: at(returnOffset, 16 + index % 4),
    pickupLocation: ['King Khalid International Airport', 'Riyadh Head Office', 'Olaya Business Centre'][index % 3],
    destination: ['Riyadh Head Office', 'King Abdullah Financial District', 'King Khalid International Airport'][index % 3],
    stops: [
      { id: `${tripId}-pickup`, location: ['King Khalid International Airport', 'Riyadh Head Office', 'Olaya Business Centre'][index % 3], waitingMinutes: 0 },
      { id: `${tripId}-dropoff`, location: ['Riyadh Head Office', 'King Abdullah Financial District', 'King Khalid International Airport'][index % 3], waitingMinutes: 0 },
    ],
    passengers: Array.from({ length: passengerCount }, (_, passengerIndex) => ({ id: `${tripId}-p${passengerIndex + 1}`, name: passengerIndex === 0 ? contactName : `Passenger ${passengerIndex + 1}`, phone: `+966 5${index + 1} 210 ${String(3100 + index * 107 + passengerIndex)}` })),
    passengerCount, rateUnit: 'Day', quantity: Math.max(1, returnOffset - pickupOffset),
    unitPrice: roundMoney(totalAmount / Math.max(1, returnOffset - pickupOffset)),
    waitingRatePerHour: 0, includedWaitingMinutes: 0, waitingBillingIncrementMinutes: 15, taxPercent: 0, subtotal: totalAmount, taxAmount: 0,
    totalAmount, billingStatus, status, bookedAt: at(bookedOffset, 11),
    handedOverAt: ['Active', 'Completed'].includes(status) ? at(pickupOffset, 9 + index % 5) : '',
    notes: '',
  }))
}
