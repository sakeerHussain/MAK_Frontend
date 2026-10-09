import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({ token: 'contract-test-token', headerName: 'X-CSRF-TOKEN' })
import test from 'node:test'
import assert from 'node:assert/strict'
import { createVendor, listVendors, mapVendor, saveVendorAttachments, updateVendorStatus, vendorPayload } from '../src/features/vendors/VendorApi.js'

const record = (id) => ({ id, vendorId: `VEN-${String(id).padStart(3, '0')}`, vendorType: 'Business', name: 'Test Vendor',
  commission: 7.5, status: 'Active', creditTerms: 30, contractStart: null, contractEnd: null,
  contacts: [{ id: 'contact-0', name: 'Amina', mobile: '+966501234567', email: '' }],
  bank: { currency: 'SAR' }, attachments: [{ id: 9, type: 'Company Profile', name: 'profile.pdf', url: `/api/vendors/${id}/files/9` }], referenceCount: 0 })
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })

test('loads paged vendors and maps persistent attachments', async () => {
  const previous = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url) => { calls.push(url); return response({ content: [record(calls.length)], totalPages: 2 }) }
  try {
    const vendors = await listVendors()
    assert.equal(vendors.length, 2)
    assert.equal(vendors[0].creditTerms, '30')
    assert.equal(vendors[0].attachments[0].url, '/api/vendors/1/files/9')
    assert.deepEqual(calls, ['/api/vendors?page=0&size=100', '/api/vendors?page=1&size=100'])
  } finally { globalThis.fetch = previous }
})

test('creates vendor with ordered contacts and bank fields, excluding browser files', async () => {
  const previous = globalThis.fetch
  let captured
  globalThis.fetch = async (url, options) => { captured = { url, options }; return response(record(4), 201) }
  try {
    const draft = { vendorType: 'Business', name: ' Test Vendor ', commission: '7.50', status: 'Active', creditTerms: '30',
      contacts: [{ name: 'Amina', mobile: '+966501234567', email: '' }, { name: 'Omar', mobile: '+966501234568', email: '' }],
      bank: { beneficiaryName: 'Test', currency: 'SAR' }, attachments: [{ file: new Blob(['x']) }] }
    const created = await createVendor(draft)
    const sent = JSON.parse(captured.options.body)
    assert.equal(captured.url, '/api/vendors')
    assert.equal(sent.name, 'Test Vendor')
    assert.equal(sent.contacts[1].name, 'Omar')
    assert.equal(sent.creditTerms, 30)
    assert.equal(sent.bank.beneficiaryName, 'Test')
    assert.equal('attachments' in sent, false)
    assert.equal(created.id, 4)
    assert.equal(vendorPayload(draft).commission, 7.5)
  } finally { globalThis.fetch = previous }
})

test('replaces attachments, deletes removed types, and updates status', async () => {
  const previous = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    return response(url.includes('/status') ? { ...record(4), status: 'Inactive' } : url.endsWith('/vendors/4') ? record(4) : { id: 10 })
  }
  try {
    const file = new Blob(['%PDF-test'], { type: 'application/pdf' })
    await saveVendorAttachments(4, { attachments: [{ type: 'Company Profile', file }] }, record(4))
    assert.equal(calls[0].url, '/api/vendors/4/attachments?type=Company+Profile')
    assert.equal(await calls[0].options.body.get('file').text(), '%PDF-test')
    assert.equal(calls.some((call) => call.options.method === 'DELETE'), false)
    await saveVendorAttachments(4, { attachments: [] }, record(4))
    assert.equal(calls.some((call) => call.url === '/api/vendors/4/files/9' && call.options.method === 'DELETE'), true)
    assert.equal((await updateVendorStatus(4, 'Inactive')).status, 'Inactive')
    assert.deepEqual(JSON.parse(calls.at(-1).options.body), { status: 'Inactive' })
    assert.equal(mapVendor(record(4)).referenceCount, 0)
  } finally { globalThis.fetch = previous }
})
