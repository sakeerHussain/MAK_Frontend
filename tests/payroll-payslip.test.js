import test from 'node:test'
import assert from 'node:assert/strict'
import { downloadPayrollPayslip } from '../src/features/payroll/PayrollPayslipApi.js'

test('unapproved payroll cannot request a payslip', async () => {
  for (const record of [null, {}, {id:1,approvalId:null}]) await assert.rejects(downloadPayrollPayslip(record), /Approve payroll/)
})
test('approved payroll download requests a PDF and retains server reconciliation errors', async () => {
  const previous = globalThis.fetch
  globalThis.fetch = async url => { assert.equal(url,'/api/payroll/drafts/7/payslip'); return new Response(JSON.stringify({detail:'Approve this payroll again.'}),{status:409,headers:{'Content-Type':'application/problem+json'}}) }
  try { await assert.rejects(downloadPayrollPayslip({id:7,approvalId:2,period:'2026-07'}),/Approve this payroll again/) } finally { globalThis.fetch=previous }
})
test('approved payslip downloads with its payroll month and record ID', async () => {
  const previousFetch=globalThis.fetch, previousDocument=globalThis.document
  let clicked=false, removed=false
  const anchor={click(){clicked=true},remove(){removed=true}}
  globalThis.document={createElement:()=>anchor,body:{appendChild(){}}}
  globalThis.fetch=async (url,options)=>{
    assert.equal(url,'/api/payroll/drafts/7/payslip');assert.equal(options.credentials,'include')
    return new Response(new Blob(['%PDF-1.7'],{type:'application/pdf'}),{headers:{'Content-Type':'application/pdf'}})
  }
  try {
    await downloadPayrollPayslip({id:7,approvalId:2,period:'2026-07'})
    assert.equal(anchor.download,'MAK-payslip-2026-07-7.pdf');assert.equal(clicked,true);assert.equal(removed,true)
  } finally {globalThis.fetch=previousFetch;globalThis.document=previousDocument}
})
