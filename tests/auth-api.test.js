import assert from 'node:assert/strict'
import { sessionFetch, clearCsrfToken } from '../src/shared/lib/sessionFetch.js'
import { loginAccount, signupAccount, currentAccount, logoutAccount, updateUserAccess } from '../src/features/auth/AuthApi.js'
import { canReadPage, canWritePage, isWriteAction } from '../src/features/auth/permissions.js'
const calls = []
let next = { user: { id: 1, name: 'Admin', role: 'Admin', permissions: ['users.manage'] } }
globalThis.fetch = async (url, options = {}) => {
 calls.push({ url, ...options })
 return { ok: true, status: 200, json: async () => url.endsWith('/csrf') ? { token: `token${calls.length}`, headerName: 'X-CSRF-TOKEN' } : next }
}
clearCsrfToken()
await signupAccount({ name: 'User', email: 'user@example.com', password: 'Password123!test', terms: true })
assert.equal(calls[0].url, '/api/auth/csrf')
assert.equal(calls[0].credentials, 'include')
assert.equal(calls[1].headers['X-CSRF-TOKEN'], 'token1')
assert.equal(calls[1].credentials, 'include')
assert.equal(calls[1].method, 'POST')
assert.equal(JSON.parse(calls[1].body).terms, true)
await loginAccount({ email: 'user@example.com', password: 'Password123!test' })
assert.equal(calls.at(-1).headers['X-CSRF-TOKEN'], 'token1')
await updateUserAccess(2, { role: 'Viewer', status: 'Active' })
assert.equal(calls.at(-2).url, '/api/auth/csrf')
assert.equal(calls.at(-1).url, '/api/users/2/access')
assert.equal(calls.at(-1).method, 'PATCH')
await currentAccount()
assert.equal(calls.at(-1).headers, undefined)
await logoutAccount()
assert.equal(calls.at(-1).url, '/api/auth/logout')
const user = { permissions: ['fleet.read', 'bookings.read', 'invoices.read', 'invoices.write'] }
assert.equal(canReadPage(user, 'Fleet'), true)
assert.equal(canWritePage(user, 'Fleet'), false)
assert.equal(canWritePage(user, 'Invoices'), true)
assert.equal(canReadPage(user, 'Staff & Users'), false)
assert.equal(canReadPage(user, 'Payroll'), false)
assert.equal(canReadPage({ permissions: ['payroll.read'] }, 'Payroll'), true)
assert.equal(canReadPage({ permissions: ['dashboard.read'] }, 'Payroll'), false)
for (const action of ['Add Car', 'Edit INS-1', 'Upload Documents', 'Save Access', 'Issue Invoice', 'Record Payment', 'Cancel Booking', 'Assign Vehicle']) assert.equal(isWriteAction(action), true)
for (const action of ['View Profile', 'Download Invoice', 'Export Bookings', 'Cancel', 'Back to dashboard']) assert.equal(isWriteAction(action), false)
let expired = false
globalThis.window = { dispatchEvent(event) { expired = event.type === 'auth-expired' } }
globalThis.fetch = async () => ({ status: 401, ok: false })
await sessionFetch('/api/vehicles')
assert.equal(expired, true)
delete globalThis.window
next = null
console.log('Authentication transport and permission tests passed')
