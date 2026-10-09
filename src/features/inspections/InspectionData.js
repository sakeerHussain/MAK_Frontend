export const INSPECTION_TYPES = ['Pre-trip', 'Post-trip', 'Routine', 'Damage assessment']
export const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']
export const FUEL_LEVELS = [0, 25, 50, 75, 100]

const todayLocal = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const blankInspection = () => ({
  id: null, inspectionId: '', vehicleId: '', type: 'Pre-trip', condition: 'Good',
  inspectionDate: todayLocal(), inspector: '', odometerKm: '', fuelLevel: 100,
  bookingId: '', notes: '', photos: [],
})

export function nextInspectionId(inspections) {
  const next = Math.max(0, ...inspections.map((inspection) => Number(inspection.inspectionId?.match(/\d+/)?.[0]) || 0)) + 1
  return `INS-${String(next).padStart(4, '0')}`
}

export function validateInspection(inspection, vehicles, bookings) {
  if (!vehicles.some((vehicle) => vehicle.id === Number(inspection.vehicleId))) return 'Select a car from Fleet.'
  if (!INSPECTION_TYPES.includes(inspection.type)) return 'Choose a valid inspection type.'
  if (!CONDITIONS.includes(inspection.condition)) return 'Choose a valid condition.'
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(inspection.inspectionDate || '') ? new Date(`${inspection.inspectionDate}T12:00:00Z`) : null
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== inspection.inspectionDate) return 'Enter a valid inspection date.'
  if (!inspection.inspector?.trim()) return 'Enter the inspector name.'
  if (inspection.odometerKm === '' || inspection.odometerKm === null || !Number.isSafeInteger(Number(inspection.odometerKm)) || Number(inspection.odometerKm) < 0) return 'Enter an odometer reading in whole kilometres.'
  if (!FUEL_LEVELS.includes(Number(inspection.fuelLevel))) return 'Choose a valid fuel level.'
  if (inspection.bookingId !== '' && inspection.bookingId !== null && inspection.bookingId !== undefined) {
    const booking = bookings.find((item) => item.id === Number(inspection.bookingId))
    if (!booking || Number(booking.vehicleId) !== Number(inspection.vehicleId)) return 'Choose a booking assigned to this car.'
  }
  if (!Array.isArray(inspection.photos) || inspection.photos.length > 10 || inspection.photos.some((photo) => !photo.name || !photo.previewUrl)) return 'Add up to 10 valid inspection photos.'
  return ''
}
