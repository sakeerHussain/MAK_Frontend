import assert from 'node:assert/strict'
import { loadDashboard } from '../src/features/dashboard/DashboardApi.js'
let request
const live = { activeRentals: 3, activity: [] }
globalThis.fetch = async (url, options) => { request = { url, options }; return { ok:true, status:200, json:async()=>live } }
assert.deepEqual(await loadDashboard(30), live)
assert.equal(request.url, '/api/dashboard?days=30')
assert.equal(request.options.credentials, 'include')
globalThis.fetch = async () => ({ ok:false,status:403,json:async()=>({detail:'Access denied'}) })
await assert.rejects(loadDashboard(), /Access denied/)
console.log('Dashboard authenticated API tests passed')
