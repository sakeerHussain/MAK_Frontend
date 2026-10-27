import test from 'node:test'
import assert from 'node:assert/strict'
import { vehicleBookingCandidate } from '../src/shared/lib/rentalPolicy.js'

test('new assignments require an explicitly listed and available vehicle', () => {
  const car = { id: 1, status: 'Available', listedForBooking: true }
  assert.equal(vehicleBookingCandidate(car), true)
  for (const listedForBooking of [false, undefined, null, 'true']) {
    assert.equal(vehicleBookingCandidate({ ...car, listedForBooking }), false)
  }
  for (const status of ['Inactive', 'Under Maintenance', 'In Use']) {
    assert.equal(vehicleBookingCandidate({ ...car, status }), false)
  }
  assert.equal(vehicleBookingCandidate(undefined), false)
})

test('existing assignments remain visible after unlisting without exposing them to other bookings', () => {
  const car = { id: 42, status: 'In Use', listedForBooking: false }
  assert.equal(vehicleBookingCandidate(car, 42), true)
  assert.equal(vehicleBookingCandidate(car, '42'), true)
  assert.equal(vehicleBookingCandidate(car, 43), false)
  assert.equal(vehicleBookingCandidate(car), false)
})

test('quick and advance assignment candidate sets retain only their own unlisted vehicle', () => {
  const cars = [
    { id: 1, status: 'Available', listedForBooking: true },
    { id: 2, status: 'Available', listedForBooking: false },
    { id: 3, status: 'Inactive', listedForBooking: true },
  ]
  assert.deepEqual(cars.filter(car => vehicleBookingCandidate(car)).map(car => car.id), [1])
  assert.deepEqual(cars.filter(car => vehicleBookingCandidate(car, 2)).map(car => car.id), [1, 2])
})
