import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({ token: 'contract-test-token', headerName: 'X-CSRF-TOKEN' })
import assert from 'node:assert/strict'
import { employeePayload, mapEmployee, listEmployees, saveEmployeeRecord, updateEmployeeStatus, archiveEmployee, importEmployees } from '../src/features/employees/EmployeeApi.js'
import { blankEmployee } from '../src/features/employees/EmployeeData.js'
import { listMaintenanceJobs, saveMaintenanceJob } from '../src/features/maintenance/MaintenanceApi.js'
import { downloadReceipt } from '../src/features/maintenance/MaintenanceFiles.js'

const employee = { ...blankEmployee(), employeeId: 'EMP-10', name: 'Test Employee', phone: '+966500001010', jobTitle: 'Coordinator', monthlySalary: '6500', dailyRate: '200', manager: '', payrollCount: 999 }
const payload = employeePayload(employee)
assert.equal(payload.monthlySalary, 6500)
assert.equal(payload.hourlyRate, null)
assert.equal(payload.joinedOn, null)
assert.equal('payrollCount' in payload, false)
assert.equal('photo' in payload, false)
const record = { id: 10, details: { ...payload, manager: null, homeAddress: null }, photo: { id: 1, url: '/api/employees/10/files/1' }, documents: [{ id: 2, type: 'Contract copy', name: 'contract.pdf', url: '/api/employees/10/files/2' }], payrollCount: 0 }
assert.equal(mapEmployee(record).manager, '')
assert.equal(mapEmployee(record).photo.previewUrl, '/api/employees/10/files/1')
const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, ...options })
  return { ok: true, status: 200, json: async () => url.includes('?page=') ? { content: [record], totalPages: 1 } : record }
}
assert.equal((await listEmployees()).length, 1)
const image = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
await saveEmployeeRecord({ ...employee, photo: { file: image }, documents: [{ type: 'Contract copy', file: image, expiryDate: '2027-01-01' }] })
let request = calls.at(-1)
assert.equal(request.url, '/api/employees/save')
assert.equal(request.method, 'POST')
assert.equal(request.headers['X-CSRF-TOKEN'], 'contract-test-token')
assert.equal(request.headers['Content-Type'], undefined)
assert.ok(request.body.get('photo') instanceof Blob)
assert.ok(request.body.get('document0') instanceof Blob)
assert.equal(JSON.parse(await request.body.get('record').text()).monthlySalary, 6500)
assert.equal(JSON.parse(await request.body.get('attachments').text()).documents[0].uploadKey, 'document0')
await saveEmployeeRecord({ ...mapEmployee(record), photo: null, documents: [] })
request = calls.at(-1)
assert.equal(request.url, '/api/employees/10/save')
assert.equal(request.method, 'PUT')
assert.deepEqual(JSON.parse(await request.body.get('attachments').text()), { photo: null, documents: [] })
await updateEmployeeStatus(10, 'Inactive')
assert.equal(calls.at(-1).url, '/api/employees/10/status')
assert.deepEqual(JSON.parse(calls.at(-1).body), { status: 'Inactive' })
globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return { ok: true, status: 204 } }
await archiveEmployee(10)
assert.equal(calls.at(-1).method, 'DELETE')
globalThis.fetch = async (url, options) => { calls.push({ url, ...options }); return { ok: true, status: 200, json: async () => ({ successful: 1, failed: 0, rows: [] }) } }
await importEmployees([employee])
assert.equal(calls.at(-1).url, '/api/employees/import')
assert.equal(JSON.parse(calls.at(-1).body)[0].monthlySalary, 6500)

const job = { id: 5, jobId: 'MNT-0005', vehicleId: 2, workType: 'Maintenance Log', workItem: 'Oil & Filter Change', status: 'Open', expenseLines: [{ id: 'line-1', category: 'Spare Parts', amount: 75.25, description: 'Oil filter', receipt: { id: 'receipt-id', name: 'receipt.pdf', url: '/api/maintenance/5/expenses/line-1/receipt' } }] }
globalThis.fetch = async (url, options = {}) => { calls.push({ url, ...options }); return { ok: true, status: 200, json: async () => options.method && options.method !== 'GET' ? job : [job] } }
assert.equal((await listMaintenanceJobs())[0].expenseLines[0].receipt.url, '/api/maintenance/5/expenses/line-1/receipt')
await saveMaintenanceJob({ ...job, expenseLines: [{ ...job.expenseLines[0], receipt: { file: image, name: 'replacement.png', previewUrl: 'temporary' } }] })
request = calls.at(-1)
assert.equal(request.url, '/api/maintenance/5')
assert.equal(request.method, 'PUT')
assert.ok(request.body.get('receipt-line-1') instanceof Blob)
const sent = JSON.parse(await request.body.get('record').text())
assert.equal(sent.expenseLines[0].receipt, null)
assert.equal('file' in sent.expenseLines[0], false)
const link = { click() { this.clicked = true }, remove() {} }
globalThis.document = { createElement: () => link, body: { append() {} } }
downloadReceipt(job.expenseLines[0].receipt)
assert.equal(link.href, '/api/maintenance/5/expenses/line-1/receipt')
assert.equal(link.clicked, true)
globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ detail: 'Vehicle has an active rental.' }) })
await assert.rejects(() => saveMaintenanceJob(job), /active rental/)
console.log('Employee and maintenance API integration tests passed')
