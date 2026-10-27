import assert from 'node:assert/strict'
import process from 'node:process'
import { suggestedAssignmentAlert, pickupChanged, assignmentAlertError, canAssignRental } from '../src/shared/lib/assignmentAlert.js'
import { rentalDate } from '../src/shared/lib/rentalTime.js'

for (const tz of ['Asia/Kolkata', 'America/New_York', 'UTC']) {
  process.env.TZ = tz
  assert.equal(suggestedAssignmentAlert('2026-11-02T00:30'), '2026-11-01T23:30')
  assert.equal(suggestedAssignmentAlert('2026-11-02T05:00:00Z'), '2026-11-02T07:00')
  assert.equal(rentalDate('2026-11-02T10:00').toISOString(), '2026-11-02T07:00:00.000Z')
}
const initial = { pickupAt: '2026-11-02T10:00:00' }
const form = { pickupAt: '2026-11-02T11:00', assignmentAlertAt: '2026-11-02T06:00', assignmentAlertReviewedForPickup: '' }
assert.equal(pickupChanged(initial, '2026-11-02T10:00'), false)
assert.match(assignmentAlertError(form, initial), /review/i)
assert.equal(assignmentAlertError({ ...form, assignmentAlertReviewedForPickup: form.pickupAt }, initial), '')
assert.match(assignmentAlertError({ ...form, pickupAt: '2026-11-02T12:00', assignmentAlertReviewedForPickup: form.pickupAt }, initial), /review/i)
assert.match(assignmentAlertError({ ...form, assignmentAlertAt: '2026-11-02T12:00' }, initial), /before pickup/)
assert.match(assignmentAlertError({ ...form, assignmentAlertAt: '' }, initial), /valid/)
assert.equal(assignmentAlertError({ ...form, assignmentAlertAt: '2020-01-01T08:00' }, null), '', 'Past deadlines raise immediately; they are not silently moved')
const record = { status: 'Confirmed', pickupAt: '2026-11-02T01:00', assignmentAlertAt: '2026-11-01T20:00' }
assert.equal(canAssignRental(record, rentalDate('2026-11-01T19:59')), false)
assert.equal(canAssignRental(record, rentalDate('2026-11-01T20:00')), true)
assert.equal(canAssignRental({ ...record, status: 'Pending' }, rentalDate('2026-11-01T20:01')), false)
assert.equal(canAssignRental({ status: 'Confirmed', pickupAt: record.pickupAt }, rentalDate('2026-11-02T00:00')), true)
assert.equal(canAssignRental({ status: 'Confirmed', pickupAt: record.pickupAt }, rentalDate('2026-11-01T23:59')), false)
console.log('Assignment alert: KSA scheduling, reschedule review, validation and early assignment passed.')
