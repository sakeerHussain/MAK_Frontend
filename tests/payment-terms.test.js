import test from 'node:test'
import assert from 'node:assert/strict'
import process from 'node:process'
import { paymentTermDays, normalizePaymentTerms, termsDueDate, initializeInvoiceSchedule, scheduleError } from '../src/features/invoices/PaymentTerms.js'
import { invoiceDraftFromSources } from '../src/features/invoices/InvoiceData.js'
import { invoiceMetadataRows } from '../src/features/invoices/InvoicePresentation.js'

test('common and legacy terms normalize without guessing custom agreements',()=>{
  for(const text of ['Net 60',' net60 days ','60 days']){assert.equal(paymentTermDays(text),60);assert.equal(normalizePaymentTerms(text),'Net 60')}
  assert.equal(paymentTermDays('Due on receipt'),0);assert.equal(normalizePaymentTerms('NET 0'),'Due on receipt')
  for(const text of ['End of month','','Net 999','-30','Net 1.5'])assert.equal(paymentTermDays(text),null)
})
for(const zone of ['Asia/Calcutta','America/Los_Angeles','Pacific/Kiritimati','UTC'])test(`Terms use the KSA issue calendar in ${zone}`,()=>{
  const old=process.env.TZ;process.env.TZ=zone
  try{
    const now=new Date('2026-10-31T21:30:00Z')
    assert.equal(termsDueDate('Net 60',now),'2026-12-31')
    assert.equal(termsDueDate('Due on receipt',now),'2026-11-01')
    assert.equal(termsDueDate('Net 30',new Date('2024-01-31T21:30:00Z')),'2024-03-02')
    assert.equal(scheduleError({kind:'Corporate',dueDateMode:'Terms',paymentTerms:'Net 60',dueDate:'2020-01-01'},now),'')
    assert.equal(initializeInvoiceSchedule({kind:'Corporate',paymentTerms:'Net 60'},now).dueDate,'2026-12-31')
  }finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old}
})
test('Net 60 company terms prefill and manual dates require a reason',()=>{
  const trip={id:4,tripId:'CT-4',companyId:8,companyName:'Example',status:'Completed',quantity:1,unitPrice:100,stops:[],returnAt:'2026-10-25T10:00:00+03:00'}
  const invoice=invoiceDraftFromSources([{kind:'Corporate',id:4}],[],[trip],[{id:8,name:'Example',paymentTerms:'Net 60'}])
  assert.equal(invoice.paymentTerms,'Net 60');assert.equal(invoice.dueDateMode,'Terms');assert.equal(invoice.dueDate,termsDueDate('Net 60'))
  const now=new Date('2026-10-25T12:00:00Z')
  const manual={kind:'Corporate',paymentTerms:'End of month',dueDateMode:'Manual',dueDate:'2026-10-31',dueDateOverrideReason:''}
  assert.match(scheduleError(manual,now),/reason/)
  manual.dueDateOverrideReason='Contract requires month-end settlement'
  assert.equal(scheduleError(manual,now),'');assert.equal(initializeInvoiceSchedule(manual,now).dueDate,'2026-10-31')
  assert.equal(initializeInvoiceSchedule({id:3,kind:'Corporate',dueDate:'2026-11-05'},now).dueDateMode,'Manual')
  assert.ok(invoiceMetadataRows(manual).some(([label,value])=>label==='Due Date Override Reason'&&value===manual.dueDateOverrideReason))
})
