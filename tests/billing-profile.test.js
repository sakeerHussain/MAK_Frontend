import test from 'node:test'
import assert from 'node:assert/strict'
import {applyBillingProfile,blankMakProfile,missingBillingDetails} from '../src/features/invoices/BillingProfileData.js'
import {invoiceDraftFromSources} from '../src/features/invoices/InvoiceData.js'
import {invoiceHtml} from '../src/features/invoices/InvoiceExport.js'
const profile={version:7,issuer:{name:'Test Seller',street:'Test Road',city:'Riyadh',country:'Saudi Arabia'},account:{accountName:'Test Account',bankName:'Test Bank',accountNumber:'TEST-ONLY-100'},paymentContact:'Test Accounts',paymentInstructions:'Test payment instruction'}
test('new drafts copy seller, bank and payment contact without sharing mutable objects',()=>{
 const booking={id:1,bookingId:'BK-1',status:'Completed',customerName:'Customer',totalAmount:100,receivedAmount:0,returnAt:'2026-10-01T10:00:00+03:00'}
 const invoice=invoiceDraftFromSources([{kind:'Individual',id:1}],[booking],[],[],profile)
 assert.equal(invoice.issuer.name,'Test Seller');assert.equal(invoice.account.bankName,'Test Bank');assert.equal(invoice.paymentContact,'Test Accounts');assert.equal(invoice.billingProfileVersion,7)
 profile.issuer.name='Changed Test Seller';assert.equal(invoice.issuer.name,'Test Seller');profile.issuer.name='Test Seller'
 assert.equal(missingBillingDetails(invoice).length,0);assert.ok(invoiceHtml(invoice).includes('Test payment instruction'))
})
test('refreshing a draft replaces only seller/payment fields and readiness is explicit',()=>{
 const invoice=applyBillingProfile({lines:[{unitPrice:123}],billTo:{name:'Buyer'},dueDate:'2026-12-01'},profile)
 assert.equal(invoice.lines[0].unitPrice,123);assert.equal(invoice.billTo.name,'Buyer');assert.equal(invoice.dueDate,'2026-12-01')
 assert.ok(missingBillingDetails(blankMakProfile()).includes('Seller street'))
 assert.equal(missingBillingDetails({...invoice,account:{},paymentInstructions:'Pay at collection by agreement'}).length,0)
 assert.ok(missingBillingDetails({...invoice,account:{},paymentInstructions:''}).length>0)
})
