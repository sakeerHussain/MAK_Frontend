import { rentalDate, rentalDateTime, rentalDay } from './rentalTime.js'

// Defaults are a starting point for staff, never an estimate of travel time.
export function suggestedAssignmentAlert(pickupAt) {
  const pickup = rentalDate(pickupAt)
  return Number.isNaN(pickup.getTime()) ? '' : rentalDateTime(new Date(pickup.getTime() - 60 * 60000))
}
export const pickupChanged = (initial, pickupAt) => Boolean(initial && rentalDate(initial.pickupAt).getTime() !== rentalDate(pickupAt).getTime())
export function assignmentAlertError(form, initial) {
  const alert = rentalDate(form.assignmentAlertAt)
  if (!form.assignmentAlertAt || Number.isNaN(alert.getTime())) return 'Enter a valid Assignment alert date & time in KSA time.'
  if (alert > rentalDate(form.pickupAt)) return 'Assignment alert must be at or before pickup (KSA time).'
  if (pickupChanged(initial, form.pickupAt) && form.assignmentAlertReviewedForPickup !== form.pickupAt) return 'Pickup changed. Review the Assignment alert date & time and confirm the review before saving.'
  return ''
}
export function canAssignRental(record, now = new Date()) {
  return record?.status === 'Confirmed' && (rentalDay(record.pickupAt) <= rentalDay(now) || Boolean(record.assignmentAlertAt && rentalDate(record.assignmentAlertAt) <= now))
}
export const assignmentIsDue = (record, now = new Date()) => Boolean(record.assignmentAlertAt && rentalDate(record.assignmentAlertAt) <= now)
