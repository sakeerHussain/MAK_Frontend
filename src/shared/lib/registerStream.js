import { rentalDate, rentalDay, shiftRentalDays, RENTAL_TIME_ZONE } from './rentalTime.js'
// The rental endpoints currently return complete collections. This window only
// limits rendered rows; totals, filtering and exports continue to use all rows.
export const REGISTER_BATCH_SIZE = 20

export function nextWindowSize(current, total, batchSize = REGISTER_BATCH_SIZE) {
  return Math.min(total, Math.max(0, current) + batchSize)
}

export function groupingField(sort) {
  return { 'Pickup soonest': 'pickupAt', 'Return soonest': 'returnAt', 'Newest booked': 'bookedAt' }[sort] || null
}

const localDay = value => rentalDay(value) || 'undated'

export function dateGroupLabel(value, now = new Date()) {
  if (localDay(value) === 'undated') return 'Date unavailable'
  const date = rentalDate(value)
  const tomorrow = shiftRentalDays(now,1)
  const yesterday = shiftRentalDays(now,-1)
  const relative = localDay(date) === localDay(now) ? 'Today' : localDay(date) === localDay(tomorrow) ? 'Tomorrow' : localDay(date) === localDay(yesterday) ? 'Yesterday' : ''
  return `${new Intl.DateTimeFormat('en-GB', { timeZone: RENTAL_TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(date)}${relative ? ` · ${relative}` : ''}`
}

// Consecutive groups preserve the caller's actual sort order. Priority and value
// sorts deliberately stay flat rather than moving urgent rows below date bands.
export function streamEntries(rows, sort, now = new Date()) {
  const field = groupingField(sort)
  if (!field) return rows.map((row) => ({ kind: 'record', row, key: `row-${row.id}` }))
  const entries = []
  let previousDay
  for (const row of rows) {
    const day = localDay(row[field])
    if (day !== previousDay) entries.push({ kind: 'date', key: `date-${day}`, label: dateGroupLabel(row[field], now), basis: field === 'pickupAt' ? 'Pickup' : field === 'returnAt' ? 'Return' : 'Booked on' })
    entries.push({ kind: 'record', row, key: `row-${row.id}` })
    previousDay = day
  }
  return entries
}
