import test from 'node:test'
import assert from 'node:assert/strict'
import {invoiceDraftFromSources,invoiceTotals,validateInvoice} from '../src/features/invoices/InvoiceData.js'
import {chargeReviewError} from '../src/features/invoices/BookingChargeImport.js'
const booking={id:7,bookingId:'BK-7',status:'Completed',customerName:'Guest',customerEmail:'guest@example.com',totalAmount:299,receivedAmount:30,refundedAmount:0,returnAt:'2026-10-20T09:00:00+03:00'}
const create=patch=>invoiceDraftFromSources([{kind:'Individual',id:7}],[{...booking,...patch}],[],[])
test('manual charge lines preserve rental units, priced extras, discounts and per-line tax',()=>{
 const draft=create({taxPercent:15,chargeLines:[{description:'Rental',quantity:2,unit:'Day',unitPrice:100},{description:'Extra km',quantity:30,unit:'km',unitPrice:2}]})
 assert.equal(draft.lines.length,2);assert.equal(draft.lines[0].quantity,2);assert.equal(draft.lines[1].quantity,30)
 assert.equal(invoiceTotals(draft).tax,39);assert.equal(invoiceTotals(draft).total,299)
 assert.match(chargeReviewError(draft),/Confirm/);draft.bookingChargeReview.confirmed=true;assert.equal(chargeReviewError(draft),'')
 const mixed=create({totalAmount:222,chargeLines:[{description:'Rental',quantity:2,unit:'Day',unitPrice:100,discountPercent:10,taxPercent:15},{description:'Extra',quantity:1,unit:'Service',unitPrice:15,taxPercent:0}]})
 assert.equal(invoiceTotals(mixed).total,222);assert.equal(invoiceTotals(mixed).tax,27)
})
test('legacy rates do not invent duration, extra prices or a VAT percentage',()=>{
 const draft=create({unitPrice:100,rateUnit:'Day',extraKm:30,overtimeHours:2,extraDriver:true})
 assert.equal(draft.lines.length,1);assert.equal(draft.lines[0].quantity,1);assert.equal(draft.lines[0].unitPrice,100);assert.equal(draft.lines[0].taxPercent,'')
 assert.match(draft.bookingChargeReview.recordedExtras,/30 extra km.*2 overtime hours.*Additional driver/)
 assert.match(chargeReviewError(draft),/tax rate/)
 draft.lines[0].taxPercent=15;assert.match(chargeReviewError(draft),/Reconcile/)
 draft.lines[0].quantity=2;draft.lines.push({id:'extra',sourceRef:'BK-7',description:'Extra km',unit:'km',quantity:30,unitPrice:2,taxPercent:15})
 draft.bookingChargeReview.confirmed=true;assert.equal(chargeReviewError(draft),'');assert.equal(invoiceTotals(draft).total,299)
})
test('known total-only tax is extracted rather than added twice, and zero tax remains explicit',()=>{
 const taxed=create({totalAmount:115,taxPercent:15});assert.equal(taxed.lines[0].unitPrice,100);assert.equal(invoiceTotals(taxed).total,115)
 const zero=create({totalAmount:100,taxPercent:0});assert.equal(zero.lines[0].taxPercent,0);zero.bookingChargeReview.confirmed=true;assert.equal(chargeReviewError(zero),'')
 const unknown=create({totalAmount:100});assert.equal(unknown.lines[0].taxPercent,'');assert.match(validateInvoice(unknown,true),/tax rate/)
 assert.equal(validateInvoice(unknown,false),'')
})
test('approved quote lines keep their existing import policy',()=>{
 const draft=create({quoteSnapshot:{taxPercent:15,lines:[{description:'Quoted rental',unit:'Trip',quantity:1,unitPrice:260}]}})
 assert.equal(draft.bookingChargeReview,undefined);assert.equal(invoiceTotals(draft).total,299)
})
test('cent rounding reconciles without creating a fake adjustment line',()=>{
 const draft=create({totalAmount:0.06,taxPercent:15,chargeLines:[{description:'Rental',unit:'Trip',quantity:1,unitPrice:0.03},{description:'Extra',unit:'Service',quantity:1,unitPrice:0.03}]})
 draft.bookingChargeReview.confirmed=true;assert.equal(invoiceTotals(draft).total,0.06);assert.equal(chargeReviewError(draft),'');assert.equal(draft.lines.length,2)
})
