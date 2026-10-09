import test from 'node:test'
import assert from 'node:assert/strict'
import { blankInspection, CONDITIONS, FUEL_LEVELS, INSPECTION_TYPES, nextInspectionId, validateInspection } from '../src/features/inspections/InspectionData.js'

const vehicles = [{ id: 1, make: 'Toyota', model: 'Camry', registration: 'RNT-1001' }, { id: 2, make: 'Ford', model: 'Transit', registration: 'RNT-1002' }]
const bookings = [{ id: 7, bookingId: 'BK-2007', vehicleId: 1 }, { id: 8, bookingId: 'BK-2008', vehicleId: 2 }]
const inspection = (changes = {}) => ({ ...blankInspection(), vehicleId: 1, type: 'Pre-trip', condition: 'Good', inspectionDate: '2026-10-04', inspector: 'Samir Khan', odometerKm: 32500, fuelLevel: 75, ...changes })

test('inspection options and generated IDs are stable', () => {
  assert.deepEqual(INSPECTION_TYPES, ['Pre-trip', 'Post-trip', 'Routine', 'Damage assessment'])
  assert.deepEqual(CONDITIONS, ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'])
  assert.deepEqual(FUEL_LEVELS, [0, 25, 50, 75, 100])
  assert.equal(nextInspectionId([{ inspectionId: 'INS-0012' }]), 'INS-0013')
})

test('an inspection saves with or without a booking for its car', () => {
  assert.equal(validateInspection(inspection(), vehicles, bookings), '')
  assert.equal(validateInspection(inspection({ bookingId: 7 }), vehicles, bookings), '')
  assert.match(validateInspection(inspection({ bookingId: 8 }), vehicles, bookings), /assigned to this car/)
})

test('required readings, date, and linked car are validated', () => {
  assert.match(validateInspection(inspection({ vehicleId: 99 }), vehicles, bookings), /Select a car/)
  assert.match(validateInspection(inspection({ inspectionDate: '2026-02-31' }), vehicles, bookings), /valid inspection date/)
  assert.match(validateInspection(inspection({ inspector: ' ' }), vehicles, bookings), /inspector name/)
  assert.match(validateInspection(inspection({ odometerKm: '12.5' }), vehicles, bookings), /whole kilometres/)
  assert.match(validateInspection(inspection({ fuelLevel: 33 }), vehicles, bookings), /valid fuel level/)
})

test('photo evidence accepts ten valid images and rejects malformed or excess files', () => {
  const photo = { id: 'a', name: 'front.jpg', previewUrl: 'data:image/jpeg;base64,AA==' }
  assert.equal(validateInspection(inspection({ photos: Array.from({ length: 10 }, (_, index) => ({ ...photo, id: String(index) })) }), vehicles, bookings), '')
  assert.match(validateInspection(inspection({ photos: Array(11).fill(photo) }), vehicles, bookings), /up to 10/)
  assert.match(validateInspection(inspection({ photos: [{ id: 'bad', name: 'front.jpg' }] }), vehicles, bookings), /valid inspection photos/)
})
