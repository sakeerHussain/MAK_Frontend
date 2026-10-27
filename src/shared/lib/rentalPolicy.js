import { rentalDay } from './rentalTime.js'
// Existing assignments remain manageable after unlisting; new selections require an explicit listing.
export function vehicleBookingCandidate(vehicle, assignedVehicleId) {
  if (!vehicle) return false
  const assigned = assignedVehicleId != null && String(vehicle.id) === String(assignedVehicleId)
  return assigned || (vehicle.status === 'Available' && vehicle.listedForBooking === true)
}
// Legacy records without a currency are unknown, never presumed to be SAR.
export const vehicleRateForUnit = (vehicle, unit) => vehicle?.rateCurrency === 'SAR' ? vehicle?.[{ Hour:'hourlyRate', Day:'dailyRate', Month:'monthlyRate' }[unit]] ?? '' : ''
export const COMPLIANCE_DATE_FIELDS = {
  Istimara: 'registrationExpiryDate', Insurance: 'insuranceExpiryDate', Fahas: 'inspectionExpiryDate',
}
// Uploaded documents are authoritative; register dates cover types without an attachment.
// A register date never stands in for a document file.
export function vehicleComplianceExpiries(vehicle) {
  const records = vehicle.documentRecords || []
  return [
    ...records.map((record) => record.expiryDate),
    ...Object.entries(COMPLIANCE_DATE_FIELDS)
      .filter(([type]) => !records.some((record) => record.type === type))
      .map(([, field]) => vehicle[field]),
  ].filter(Boolean)
}
export function vehicleReadiness(vehicle, now = new Date()) {
  if (!vehicle) return []
  const issues=[]
  if (!['Available','In Use'].includes(vehicle.status)) issues.push('Vehicle is unavailable')
  if (!vehicle.onSite) issues.push('Vehicle is off-site')
  const documents=vehicle.documentRecords || []
  const today=rentalDay(now)
  if (!['Istimara','Insurance','Fahas'].every(type => documents.some(d => d.type===type && (d.name || d.originalName) && d.expiryDate && d.expiryDate>=today))) issues.push('Istimara, Insurance and Fahas must be attached and current')
  if (vehicleComplianceExpiries(vehicle).some(date => date<today)) issues.push('A vehicle compliance expiry date has passed')
  return issues
}
export const paymentChoices = booking => ({cancelled:booking.status==='Cancelled', defaultKind:booking.status==='Cancelled'?'Refund':'Payment', refundable:Math.max(0,Number(booking.receivedAmount||0)-Number(booking.refundedAmount||0))})
