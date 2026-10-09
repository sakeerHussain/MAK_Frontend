import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({ token: 'contract-test-token', headerName: 'X-CSRF-TOKEN' })
import assert from 'node:assert/strict'
import { listInspections, mapInspection, saveInspectionRecord } from '../src/features/inspections/InspectionApi.js'

const record = { id: 7, inspectionId: 'INS-0007', vehicleId: 2, type: 'Post-trip', condition: 'Good', inspectionDate: '2026-10-06', inspector: 'Inspector', odometerKm: 13000, fuelLevel: 75, bookingId: null, notes: null, photos: [{ id: 'stored.png', name: 'front.png', url: '/api/inspections/7/photos/stored.png' }] }
assert.equal(mapInspection(record).bookingId, '')
assert.equal(mapInspection(record).notes, '')
assert.equal(mapInspection(record).photos[0].previewUrl, '/api/inspections/7/photos/stored.png')
const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, ...options })
  return { ok: true, status: 200, json: async () => options.method === 'GET' ? [record] : record }
}
assert.equal((await listInspections())[0].inspectionId, 'INS-0007')
const file = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
await saveInspectionRecord({ ...record, id: null, inspector: ' Inspector ', notes: ' Checked ', odometerKm: '13000', photos: [{ id: 'local-preview', file, name: 'front.png', previewUrl: 'data:fake' }] })
let request = calls.at(-1)
assert.equal(request.url, '/api/inspections')
assert.equal(request.method, 'POST')
assert.equal(request.headers['X-CSRF-TOKEN'], 'contract-test-token')
assert.equal(request.headers['Content-Type'], undefined)
assert.ok(request.body.get('photo0') instanceof Blob)
let sent = JSON.parse(await request.body.get('record').text())
assert.deepEqual(sent.photos, [{ uploadKey: 'photo0' }])
assert.equal(sent.inspector, 'Inspector')
assert.equal(sent.odometerKm, 13000)
assert.equal(sent.bookingId, null)
assert.equal('inspectionId' in sent, false)
assert.equal('id' in sent, false)
assert.equal(JSON.stringify(sent).includes('data:fake'), false)
await saveInspectionRecord({ ...mapInspection(record), bookingId: '9' })
request = calls.at(-1)
assert.equal(request.url, '/api/inspections/7')
assert.equal(request.method, 'PUT')
sent = JSON.parse(await request.body.get('record').text())
assert.deepEqual(sent.photos, [{ id: 'stored.png' }])
assert.equal(sent.bookingId, 9)
assert.equal(request.body.get('photo0'), null)
await saveInspectionRecord({ ...mapInspection(record), photos: [] })
assert.deepEqual(JSON.parse(await calls.at(-1).body.get('record').text()).photos, [])
globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ detail: 'Choose a booking assigned to this car.' }) })
await assert.rejects(saveInspectionRecord(mapInspection(record)), /assigned to this car/)
globalThis.fetch = async () => { throw new Error('offline') }
await assert.rejects(listInspections(), /Cannot reach the backend/)
console.log('Inspection API integration tests passed')
