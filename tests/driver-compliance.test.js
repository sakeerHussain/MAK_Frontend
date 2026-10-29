import test from 'node:test'
import assert from 'node:assert/strict'
import { driverCompliance, driverDocumentStatus, driverBookingIssue, driverOptionalWarnings } from '../src/features/drivers/DriverData.js'
const now = new Date('2026-10-28T21:30:00Z') // Oct 29 in KSA
const docs = (expiryDate='2026-12-31') => ['Iqama','License copy'].map(type => ({type,name:type+'.pdf',expiryDate}))
test('KSA expiry day remains valid; yesterday expires', () => {
 assert.equal(driverCompliance({documents:docs('2026-10-28')},now),'Expired')
 assert.equal(driverDocumentStatus(docs('2026-10-28')[0],now),'Expired')
 assert.equal(driverCompliance({documents:docs('2026-10-29')},now),'Complete')
})
test('only required copies affect compliance; renewed copies override stale profile dates', () => {
 const d={documents:docs(),iqamaExpiry:'2020-01-01',licenceExpiry:'2020-01-01',insuranceExpiry:'2020-01-01'}
 assert.equal(driverCompliance(d,now),'Complete')
 assert.equal(driverOptionalWarnings(d,now)[0].type,'Insurance')
 assert.equal(driverCompliance({iqamaExpiry:'2028-01-01',licenceExpiry:'2028-01-01'},now),'Missing')
})
test('assignment still requires active driver and both copies valid through final KSA day', () => {
 const d={status:'Active',documents:docs('2026-11-01')}
 assert.equal(driverBookingIssue(d,'2026-11-01T23:59',now),'')
 assert.match(driverBookingIssue(d,'2026-11-02T00:00',now),/valid through/)
 assert.match(driverBookingIssue({...d,documents:[]},'2026-11-01T00:00',now),/Missing Iqama/)
 assert.match(driverBookingIssue({...d,status:'Inactive'},'2026-11-01T00:00',now),/inactive/)
})
test('expired optional profile, uploaded documents and certificates are warnings, never booking blocks', () => {
 const d={status:'Active',documents:[...docs(),{type:'Medical',name:'medical.pdf',expiryDate:'2020-01-01'}],insuranceExpiry:'2020-01-01',passportExpiry:'2020-01-01',contractExpiry:'2020-01-01',certifications:[{name:'Training',expiryDate:'2020-01-01'}]}
 assert.equal(driverCompliance(d,now),'Complete')
 assert.equal(driverBookingIssue(d,'2026-11-01T00:00',now),'')
 assert.equal(driverOptionalWarnings(d,now).length,5)
})
test('undated optional copies retain expiry warnings or show a missing-date warning', () => {
 const d={status:'Active',documents:[...docs(),{type:'Passport copy',name:'passport.pdf'}],passportExpiry:'2020-01-01'}
 assert.equal(driverCompliance(d,now),'Complete')
 assert.equal(driverBookingIssue(d,'2026-11-01T00:00',now),'')
 assert.match(driverOptionalWarnings(d,now)[0].message,/expired/)
 assert.match(driverOptionalWarnings({...d,passportExpiry:''},now)[0].message,/expiry date needed/)
})
test('renewed optional copy clears its stale warning; expired renewed copy adds a warning', () => {
 const d={documents:[...docs(),{type:'Contract copy',name:'contract.pdf',expiryDate:'2026-11-30'}],contractExpiry:'2020-01-01'}
 assert.deepEqual(driverOptionalWarnings(d,now),[])
 assert.equal(driverOptionalWarnings({...d,documents:[...docs(),{type:'Contract copy',name:'contract.pdf',expiryDate:'2020-01-01'}]},now).length,1)
 assert.equal(driverCompliance({...d,documents:docs('2026-10-28')},now),'Expired')
})
