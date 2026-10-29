import test from 'node:test'
import assert from 'node:assert/strict'
import { blankCustomer, prepareCustomerForm, requireCorporateCustomer } from '../src/features/customers/CustomerEditorData.js'
import { saveCorporateTripForCustomer } from '../src/features/corporate-trips/CorporateTripApi.js'
import { saveCustomerRecord } from '../src/features/customers/CustomerApi.js'
import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({token:'test-csrf',headerName:'X-CSRF-TOKEN'})
const corporate={id:7,type:'Corporate',name:'MAK Test Company',status:'Active',billingPhone:'0500000001',billingEmail:'billing@example.invalid'}
test('shared customer form normalizes billing fields and defaults identically for both entry points',()=>{
 const d=prepareCustomerForm('Corporate',{...blankCustomer('Corporate'),name:'  New   Company ',billingPhone:' 0500000001 ',billingEmail:' BILLING@EXAMPLE.COM ',waitingRatePerHour:'12.50',includedWaitingMinutes:'5',waitingBillingIncrementMinutes:'15'})
 assert.equal(d.name,'New Company');assert.equal(d.billingEmail,'billing@example.com');assert.equal(d.billingPhone,'0500000001');assert.equal(d.waitingRatePerHour,12.5);assert.equal(d.billingCountry,'Saudi Arabia')
 assert.throws(()=>prepareCustomerForm('Corporate',{...d,name:'MAK   TEST Company'},[corporate]),/already exists/)
 assert.doesNotThrow(()=>prepareCustomerForm('Corporate',{...d,id:7,name:corporate.name},[corporate],corporate))
})
test('shared form rejects missing contacts, malformed emails and invalid waiting defaults',()=>{
 const d={...blankCustomer('Corporate'),name:'New',billingPhone:'0500000001',billingEmail:'billing@example.com'}
 for(const bad of [{name:''},{billingPhone:''},{billingEmail:'bad'},{waitingRatePerHour:-1},{waitingRatePerHour:'abc'},{waitingRatePerHour:1.234},{includedWaitingMinutes:1.5},{waitingBillingIncrementMinutes:0}])assert.throws(()=>prepareCustomerForm('Corporate',{...d,...bad}))
 assert.equal(prepareCustomerForm('Individual',{name:' Person ',phone:' 0500000001 ',email:' PERSON@EXAMPLE.COM '}).email,'person@example.com')
})
test('trip selection requires an existing active corporate customer ID',()=>{
 assert.equal(requireCorporateCustomer([corporate],'7').id,7)
 for(const id of [null,'',0,'New Company',99])assert.throws(()=>requireCorporateCustomer([corporate],id),/Select an existing/)
 assert.throws(()=>requireCorporateCustomer([{...corporate,status:'Inactive'}],7),/inactive/)
 assert.throws(()=>requireCorporateCustomer([{...corporate,type:'Individual'}],7),/Select an existing/)
})
test('saving a trip never creates a customer implicitly and uses the selected master record',async()=>{
 const previous=globalThis.fetch;const calls=[]
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({id:20,...JSON.parse(options.body)})}}
 try {
  assert.throws(()=>saveCorporateTripForCustomer({companyName:'New Name'},[corporate]),/Select an existing/)
  assert.throws(()=>saveCorporateTripForCustomer({companyId:7},[{...corporate,status:'Inactive'}]),/inactive/)
  assert.equal(calls.length,0)
  const result=await saveCorporateTripForCustomer({companyId:7,companyName:'Untrusted Typed Name',contactName:'Trip Contact'},[corporate])
  assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/corporate-trips');assert.equal(result.companyId,7);assert.equal(result.companyName,corporate.name);assert.equal(result.contactName,'Trip Contact')
  await saveCorporateTripForCustomer({id:20,companyId:7},[corporate]);assert.equal(calls[1].options.method,'PUT');assert.equal(calls[1].url,'/api/corporate-trips/20')
 }finally{globalThis.fetch=previous}
})
test('explicit quick-create saves a Corporate customer, then its returned ID can be used for a trip',async()=>{
 const previous=globalThis.fetch;const calls=[]
 globalThis.fetch=async(url,options)=>{const data=JSON.parse(options.body);calls.push({url,data});return {ok:true,status:200,json:async()=>url==='/api/customers'?{...data,id:8,billingEmail:data.email,billingPhone:data.phone}:{...data,id:30}}}
 try {
  const saved=await saveCustomerRecord('Corporate',prepareCustomerForm('Corporate',{...blankCustomer('Corporate'),name:'Created Account',billingPhone:'0500000001',billingEmail:'billing@example.com'}))
  const trip=await saveCorporateTripForCustomer({companyId:saved.id},[saved])
  assert.equal(calls[0].url,'/api/customers');assert.equal(calls[0].data.type,'Corporate');assert.equal(calls[1].url,'/api/corporate-trips');assert.equal(trip.companyId,8)
 }finally{globalThis.fetch=previous}
})
