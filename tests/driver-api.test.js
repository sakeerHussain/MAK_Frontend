import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({ token: 'contract-test-token', headerName: 'X-CSRF-TOKEN' })
import test from 'node:test'
import assert from 'node:assert/strict'
import { addDriverCertification, createDriver, driverPayload, listDrivers, mapDriver, updateDriverStatus } from '../src/features/drivers/DriverApi.js'

const record = (id) => ({ id, details: { employeeId: `DRV-${id}`, name: 'Amina Malik', phone: '+966 50 123 4567', status: 'Active', category: 'Chauffeur', designation: 'Driver', employmentType: 'Full-time', dailyRate: 180, joinedOn: null }, photo: { id: 9, name: 'amina.png', url: `/api/drivers/${id}/files/9` }, documents: [{ id: 10, kind: 'DOCUMENT', type: 'Iqama', name: 'iqama.pdf', expiryDate: '2028-01-01', url: `/api/drivers/${id}/files/10` }], certifications: [{ id: 11, kind: 'CERTIFICATION', name: 'Defensive Driving', fileName: null, url: null }], bookingCount: 0, paymentCount: 0 })
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })

test('loads paged drivers and maps profile attachments', async () => {
  const previous = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url) => { calls.push(url); return response({ content: [record(calls.length)], totalPages: 2 }) }
  try {
    const drivers = await listDrivers()
    assert.equal(drivers.length, 2)
    assert.equal(drivers[0].photo.previewUrl, '/api/drivers/1/files/9')
    assert.equal(drivers[0].documents[0].type, 'Iqama')
    assert.equal(drivers[0].certifications[0].name, 'Defensive Driving')
    assert.deepEqual(calls, ['/api/drivers?page=0&size=100', '/api/drivers?page=1&size=100'])
  } finally { globalThis.fetch = previous }
})

test('sends driver form fields without browser-only attachment data', async () => {
  const previous = globalThis.fetch
  let captured
  globalThis.fetch = async (url, options) => { captured = { url, options }; return response(record(7), 201) }
  try {
    const draft = { employeeId: 'DRV-7', name: 'Amina Malik', phone: '+966 50 123 4567', category: 'Chauffeur', designation: 'Driver', employmentType: 'Full-time', status: 'Active', dailyRate: '180.00', hourlyRate: '', joinedOn: '', photo: { name: 'amina.png' }, documents: [] }
    const created = await createDriver(draft)
    const sent = JSON.parse(captured.options.body)
    assert.equal(captured.url, '/api/drivers')
    assert.equal(sent.dailyRate, 180)
    assert.equal(sent.hourlyRate, null)
    assert.equal(sent.joinedOn, null)
    assert.equal('photo' in sent, false)
    assert.equal(created.id, 7)
    assert.equal(driverPayload(draft).employeeId, 'DRV-7')
  } finally { globalThis.fetch = previous }
})

test('sends metadata-only certifications and status updates', async () => {
  const previous = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return response(url.includes('/certifications') ? { id: 2, name: 'First Aid' } : { ...record(4), details: { ...record(4).details, status: 'Inactive' } })
  }
  try {
    await addDriverCertification(4, { name: 'First Aid', issueDate: '2026-01-01' })
    assert.equal(calls[0].url, '/api/drivers/4/certifications')
    assert.equal(calls[0].options.body.get('name'), 'First Aid')
    assert.equal(calls[0].options.body.has('file'), false)
    assert.equal((await updateDriverStatus(4, 'Inactive')).status, 'Inactive')
    assert.deepEqual(JSON.parse(calls[1].options.body), { status: 'Inactive' })
  } finally { globalThis.fetch = previous }
  assert.equal(mapDriver(record(4)).bookingCount, 0)
})
