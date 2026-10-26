import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupingField, nextWindowSize, streamEntries, dateGroupLabel } from '../src/shared/lib/registerStream.js'
import { bookingListCsv } from '../src/features/bookings/BookingExport.js'

test('progressive windows append up to the exact total, including empty and final partial batches', () => {
  assert.equal(nextWindowSize(20, 43), 40)
  assert.equal(nextWindowSize(40, 43), 43)
  assert.equal(nextWindowSize(43, 43), 43)
  assert.equal(nextWindowSize(20, 0), 0)
})
test('priority and value sorts keep their original order and never add date groups', () => {
  const rows = [{ id: 2, pickupAt: '2026-10-24T10:00' }, { id: 1, pickupAt: '2026-10-23T10:00' }]
  for (const sort of ['Priority first', 'Highest value']) {
    assert.equal(groupingField(sort), null)
    assert.deepEqual(streamEntries(rows, sort).map((entry) => entry.row.id), [2, 1])
  }
})
test('chronological streams group only on date boundaries, with no duplicate bands inside a growing batch', () => {
  const rows = Array.from({ length: 43 }, (_, id) => ({ id, pickupAt: id < 25 ? '2026-10-23T10:00' : '2026-10-24T10:00' }))
  const entries = streamEntries(rows.slice(0, 40), 'Pickup soonest', new Date('2026-10-23T12:00'))
  assert.equal(entries.filter((entry) => entry.kind === 'date').length, 2)
  assert.equal(entries.filter((entry) => entry.kind === 'record').length, 40)
  assert.equal(new Set(entries.map((entry) => entry.key)).size, entries.length)
  assert.match(entries[0].label, /Today$/)
  assert.match(entries[26].label, /Tomorrow$/)
})
test('return and booking-date groups follow their own sort fields rather than pickup date', () => {
  const rows = [{ id: 1, pickupAt: '2026-10-20T10:00', returnAt: '2026-10-23T12:00', bookedAt: '2026-10-01T10:00' }]
  assert.equal(streamEntries(rows, 'Return soonest')[0].basis, 'Return')
  assert.match(streamEntries(rows, 'Return soonest')[0].label, /23 Oct/)
  assert.equal(streamEntries(rows, 'Newest booked')[0].basis, 'Booked on')
  assert.match(streamEntries(rows, 'Newest booked')[0].label, /1 Oct/)
  assert.equal(dateGroupLabel(null), 'Date unavailable')
})
test('export accepts all filtered records independently of the displayed window', () => {
  const rows = Array.from({ length: 43 }, (_, id) => ({ id, bookingId: `BK-${id}`, customerName: 'Demo', pickupAt: '2026-10-23T10:00', returnAt: '2026-10-23T12:00', bookedAt: '2026-10-23T09:00', status: 'Confirmed', driverMode: 'Self-drive', totalAmount: 150 }))
  const csv = bookingListCsv(rows, [], [])
  assert.equal(csv.trim().split('\n').length, 44)
  assert.match(csv, /BK-42/)
})
