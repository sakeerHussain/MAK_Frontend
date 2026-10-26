import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({ token: 'contract-test-token', headerName: 'X-CSRF-TOKEN' })
import test from 'node:test'
import assert from 'node:assert/strict'
import { createVehicle, listVehicles, mapVehicle, updateVehicleStatus, vehiclePayload } from '../src/features/fleet/FleetApi.js'

const record = (id) => ({ id, details: { make: 'Toyota', model: 'Camry', registration: `RNT-${id}`, vehicleId: `VH-${id}`, year: 2024, dailyRate: 72, rateCurrency: 'USD', status: 'Available', featureTags: ['GPS'] }, owner: 'Company Fleet', documents: 'Missing', carImages: [{ id: 10, name: 'front.png', url: `/api/vehicles/${id}/files/10` }], documentRecords: [] })
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })

test('maps paged API vehicles and persistent image URLs', async () => {
  const previous = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url) => { calls.push(url); return response({ content: [record(calls.length)], totalPages: 2 }) }
  try {
    const vehicles = await listVehicles()
    assert.equal(vehicles.length, 2)
    assert.equal(vehicles[0].registration, 'RNT-1')
    assert.equal(vehicles[0].carImages[0].previewUrl, '/api/vehicles/1/files/10')
    assert.deepEqual(calls, ['/api/vehicles?page=0&size=100', '/api/vehicles?page=1&size=100'])
  } finally { globalThis.fetch = previous }
})

test('sends form values in the backend request shape', async () => {
  const previous = globalThis.fetch
  let captured
  globalThis.fetch = async (url, options) => { captured = { url, options }; return response(record(7), 201) }
  try {
    const draft = { make: 'Toyota', model: 'Camry', registration: 'RNT-7', vehicleId: 'VH-7', year: '2024', seats: '5', dailyRate: '72.00', featureTags: 'GPS, Bluetooth', onSite: true, listedForBooking: true, showOnPublicSite: false, carImages: [{ name: 'preview.png' }] }
    const created = await createVehicle(draft)
    const sent = JSON.parse(captured.options.body)
    assert.equal(captured.url, '/api/vehicles')
    assert.equal(captured.options.method, 'POST')
    assert.equal(sent.rateCurrency, 'SAR')
    assert.equal(sent.dailyRate, 72)
    assert.deepEqual(sent.featureTags, ['GPS', 'Bluetooth'])
    assert.equal('carImages' in sent, false)
    assert.equal(created.id, 7)
    assert.equal(vehiclePayload(draft).year, 2024)
  } finally { globalThis.fetch = previous }
})

test('reports backend validation errors and maps status updates', async () => {
  const previous = globalThis.fetch
  globalThis.fetch = async () => response({ detail: 'Registration number already exists.' }, 409)
  try { await assert.rejects(createVehicle({}), /Registration number already exists/) }
  finally { globalThis.fetch = previous }
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/vehicles/3/status')
    assert.deepEqual(JSON.parse(options.body), { status: 'In Use' })
    return response({ ...record(3), details: { ...record(3).details, status: 'In Use' } })
  }
  try { assert.equal((await updateVehicleStatus(3, 'In Use')).status, 'In Use') }
  finally { globalThis.fetch = previous }
  assert.equal(mapVehicle(record(3)).documents, 'Missing')
})
