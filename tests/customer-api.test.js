import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({ token: 'contract-test-token', headerName: 'X-CSRF-TOKEN' })
import assert from 'node:assert/strict'
import { customerPayload, listCustomers, listQuotes, saveCustomerRecord, saveQuoteRecord } from '../src/features/customers/CustomerApi.js'

const calls = []
let responses = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  const next = responses.shift()
  return { ok: next.status < 400, status: next.status, json: async () => next.body }
}
responses = [
  { status: 200, body: { content: [{ id: 1, type: 'Individual' }], totalPages: 2 } },
  { status: 200, body: { content: [{ id: 2, type: 'Corporate' }], totalPages: 2 } },
]
assert.equal((await listCustomers()).length, 2)
assert.match(calls.at(-1).url, /page=1/)
const payload = customerPayload('Corporate', { name: 'Test Company', billingEmail: 'test@example.com', billingPhone: '123456789', waitingRatePerHour: '70' })
assert.equal(payload.email, 'test@example.com')
assert.equal(payload.waitingRatePerHour, 70)
responses = [{ status: 200, body: { id: 8, name: 'Saved' } }]
await saveCustomerRecord('Individual', { id: 8, name: 'Saved', phone: '123456789', email: 'test@example.com' })
assert.equal(calls.at(-1).options.method, 'PUT')

responses = [{ status: 200, body: { content: [{ id: 'q1', effectiveTo: null, notes: null, evidenceUrl: '/api/quotes/q1/evidence' }], totalPages: 1 } }]
assert.equal((await listQuotes())[0].effectiveTo, '')
responses = [{ status: 200, body: { id: 'server-id', status: 'Draft', version: 3 } }]
const saved = await saveQuoteRecord({ id: 'client-id', customerKey: 'corporate:2', status: 'Draft', taxPercent: '15', issueDate: '', routes: [], monthly: [], services: [], extras: {} }, false)
assert.equal(saved.id, 'server-id')
assert.equal(calls.at(-1).url, '/api/customers/2/quotes')
assert.equal(JSON.parse(calls.at(-1).options.body).issueDate, null)
assert.equal(JSON.parse(calls.at(-1).options.body).id, undefined)
responses = [{ status: 409, body: { detail: 'Quote dates overlap.' } }]
await assert.rejects(() => saveQuoteRecord({ id: 'q1', status: 'Approved', approval: { by: 'Tester', date: '2026-10-05', method: 'Email', note: 'Ref' } }, true), /Quote dates overlap/)
assert.equal(calls.at(-1).url, '/api/quotes/q1/approve')
console.log('Customer API integration tests passed')
