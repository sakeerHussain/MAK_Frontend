import test from 'node:test'
import assert from 'node:assert/strict'
import { getFleetUtilization } from '../src/features/fleet/FleetApi.js'
import { UTILIZATION_PERIODS, utilizationValue, utilizationHours } from '../src/features/fleet/FleetUtilization.js'

test('utilization API sends the selected period and cancellation signal with session credentials', async () => {
 const original=globalThis.fetch, signal=new AbortController().signal
 globalThis.fetch=async (url,options) => {assert.equal(url,'/api/vehicles/utilization?period=THIS_MONTH');assert.equal(options.signal,signal);assert.equal(options.credentials,'include');return {ok:true,status:200,json:async()=>({period:'THIS_MONTH',utilizationPercent:4.49})}}
 try {assert.equal((await getFleetUtilization('THIS_MONTH',signal)).utilizationPercent,4.49)} finally {globalThis.fetch=original}
})
test('no capacity is different from valid zero rental activity', () => {
 assert.equal(utilizationValue(null),'—');assert.equal(utilizationValue({utilizationPercent:null}),'—')
 assert.equal(utilizationValue({utilizationPercent:0}),'0.0%');assert.equal(utilizationValue({utilizationPercent:4.49}),'4.5%')
 assert.equal(utilizationValue({utilizationPercent:'invalid'}),'—');assert.equal(utilizationHours(7200),'2')
 assert.deepEqual(UTILIZATION_PERIODS.map(period=>period.value),['LAST_7_DAYS','LAST_30_DAYS','THIS_MONTH'])
})
test('utilization errors surface instead of being presented as zero percent', async () => {
 const original=globalThis.fetch
 globalThis.fetch=async()=>({ok:false,status:503,json:async()=>({detail:'Rental activity unavailable'})})
 try {await assert.rejects(getFleetUtilization('LAST_7_DAYS'),/Rental activity unavailable/)} finally {globalThis.fetch=original}
})
