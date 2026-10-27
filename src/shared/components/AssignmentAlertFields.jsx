import { pickupChanged, suggestedAssignmentAlert } from '../lib/assignmentAlert.js'
import { rentalDate, formatRentalDateTime } from '../lib/rentalTime.js'
import './AssignmentAlertFields.css'

export default function AssignmentAlertFields({ form, initial, onChange }) {
  const changed = pickupChanged(initial, form.pickupAt)
  const reviewed = form.assignmentAlertReviewedForPickup === form.pickupAt
  const overdue = form.assignmentAlertAt && rentalDate(form.assignmentAlertAt) <= new Date()
  return <section className="assignment-alert-settings" aria-label="Assignment alert settings">
    <label htmlFor="assignment-alert-at">Assignment alert date & time (KSA) <span aria-hidden="true">*</span></label>
    <div className="assignment-alert-input-row"><input id="assignment-alert-at" required type="datetime-local" max={form.pickupAt || undefined} value={form.assignmentAlertAt} aria-describedby="assignment-alert-help" onChange={event => onChange('assignmentAlertAt', event.target.value)} /><button type="button" className="booking-secondary" onClick={() => onChange('assignmentAlertAt', suggestedAssignmentAlert(form.pickupAt))}>Use 1 hour before pickup</button></div>
    <p id="assignment-alert-help">Saudi Arabia time (KSA, UTC+03:00). Set this early enough for travel and preparation. Alerts apply only while the vehicle or required driver is unassigned.</p>
    {overdue && <p role="status">This time has passed. If assignment is incomplete, the alert will be raised immediately after saving.</p>}
    {changed && <div className="assignment-alert-review" role="group" aria-label="Review alert after pickup change"><strong>Pickup rescheduled — review the assignment alert</strong><p>New pickup: {formatRentalDateTime(form.pickupAt)}. Adjust the alert or explicitly keep {formatRentalDateTime(form.assignmentAlertAt)}.</p><label className="booking-check-field"><input type="checkbox" checked={reviewed} onChange={event => onChange('assignmentAlertReviewedForPickup', event.target.checked ? form.pickupAt : '')} /><span>I reviewed the assignment alert for this pickup time.</span></label></div>}
  </section>
}
