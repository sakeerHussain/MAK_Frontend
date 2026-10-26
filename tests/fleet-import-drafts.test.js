import test from 'node:test'
import assert from 'node:assert/strict'
import { IMPORT_COLUMNS, validateImport } from '../src/features/fleet/FleetImport.js'
import { vehicleFormValues } from '../src/features/fleet/FleetData.js'
import { vehicleDraftPayload, saveVehicleImportDrafts, updateVehicleImportDraft, completeVehicleImportDraft, discardVehicleImportDraft } from '../src/features/fleet/FleetApi.js'
import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({ token: 'draft-test-token', headerName: 'X-CSRF-TOKEN' })
const values = { Make: 'Test', Model: 'Imported model', 'Vehicle ID': 'DRAFT-1', 'Registration Number': 'DRAFT-REG-1', 'Insurance Expiry Date': '2020-07-31' }
const rows = (extra = {}) => [IMPORT_COLUMNS, IMPORT_COLUMNS.map(column => ({...values,...extra})[column] ?? '')]

test('incomplete imports can be saved as drafts while unknown details stay null', () => {
  const [row] = validateImport(rows(), [])
  assert.equal(row.canSaveDraft, true)
  const payload = vehicleDraftPayload(row.draftCar)
  for (const field of ['year','type','seats','transmission','fuelType','dailyRate','ownership','onSite']) assert.equal(payload[field],null,field)
  assert.equal(payload.status,'Inactive'); assert.equal(payload.listedForBooking,false); assert.equal(payload.showOnPublicSite,false)
  assert.equal(payload.insuranceExpiryDate,'2020-07-31')
  assert.ok(row.errors.length)
})

test('invalid supplied values and duplicates cannot pass through the draft action', () => {
  for (const extra of [{ 'Insurance Expiry Date':'4/6/2026' }, { Seats:0 }, { Type:'Truck' }, { 'Daily Rate (SAR)':0 }, { Make:'' }]) assert.equal(validateImport(rows(extra),[])[0].canSaveDraft,false)
  assert.equal(validateImport(rows(),[{registration:'DRAFT-REG-1'}])[0].canSaveDraft,false)
})

test('completion form does not replace unknown values with new-vehicle defaults', () => {
  const form = vehicleFormValues({ make:'Test', model:'Imported', serviceIntervalKm:null, lastServiceKm:null, chassisNo:null }, true)
  for (const field of ['year','type','seats','transmission','fuelType','dailyRate','ownership','serviceIntervalKm','lastServiceKm','chassisNo']) assert.equal(form[field],'',field)
  assert.equal(form.onSite,null)
  assert.equal(vehicleFormValues().type,'Sedan')
})

test('draft APIs send separate requests, preserve nulls and carry concurrency versions', async () => {
  const previous = globalThis.fetch, calls=[]
  globalThis.fetch = async (url,options) => {
    calls.push({url,options})
    return {ok:true,status:options.method==='DELETE'?204:200,json:async()=>({id:99,details:{make:'Test',model:'Imported',dailyRate:500},rows:[],successful:1,failed:0})}
  }
  const draft={id:20,version:3}, car=validateImport(rows(),[])[0].draftCar
  try {
    await saveVehicleImportDrafts([car]); await updateVehicleImportDraft(draft,car)
    await completeVehicleImportDraft(draft,{...car,year:2026,type:'Bus',seats:35,transmission:'Manual',fuelType:'Diesel',dailyRate:500,ownership:'Owned',onSite:true})
    await discardVehicleImportDraft(draft)
    assert.equal(calls[0].url,'/api/vehicles/import-drafts')
    assert.equal(JSON.parse(calls[0].options.body)[0].details.onSite,null)
    assert.equal(JSON.parse(calls[1].options.body).version,3)
    assert.equal(calls[2].url,'/api/vehicles/import-drafts/20/complete')
    assert.equal(JSON.parse(calls[2].options.body).details.seats,35)
    assert.equal(calls[3].url,'/api/vehicles/import-drafts/20?version=3')
    assert.equal(calls[3].options.method,'DELETE')
  } finally { globalThis.fetch=previous }
})
