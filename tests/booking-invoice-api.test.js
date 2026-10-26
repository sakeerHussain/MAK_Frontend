import { setCsrfToken } from '../src/shared/lib/sessionFetch.js'
setCsrfToken({ token: 'contract-test-token', headerName: 'X-CSRF-TOKEN' })
import assert from 'node:assert/strict'
import { listBookings, saveBookingRecord, assignBooking, bookingPayment } from '../src/features/bookings/BookingApi.js'
import { listCorporateTrips, saveCorporateTrip, corporateStatus } from '../src/features/corporate-trips/CorporateTripApi.js'
import { getBillingProfile, saveBillingProfile, issueCreditNote, discardInvoice, listInvoices, saveInvoice, issueInvoice, invoicePayment } from '../src/features/invoices/InvoiceApi.js'
import { balanceDue, paymentStatus } from '../src/features/bookings/BookingData.js'

const requests = []
globalThis.fetch = async (url, options) => {
  requests.push({ url, ...options, data: options.body ? JSON.parse(options.body) : undefined })
  return { ok: true, status: 200, json: async () => ({ id: 7 }) }
}
await listBookings()
await listCorporateTrips()
await listInvoices()
assert.deepEqual(requests.slice(0, 3).map((request) => request.url), ['/api/bookings', '/api/corporate-trips', '/api/invoices'])
await saveBookingRecord({ bookingType: 'Advance', status: 'Confirmed', customerEmail: 'test@example.com', vehicleId: null, driverId: null })
assert.equal(requests.at(-1).method, 'POST')
assert.equal(requests.at(-1).data.vehicleId, null)
await saveBookingRecord({ id: 7, notes: 'Updated' })
assert.equal(requests.at(-1).url, '/api/bookings/7')
assert.equal(requests.at(-1).method, 'PUT')
await assignBooking(7, { vehicleId: 4, driverId: 2, status: 'Active' })
assert.equal(requests.at(-1).data.handedOver, true)
await bookingPayment(7, 'Refund', 20)
assert.deepEqual(requests.at(-1).data, { kind: 'Refund', amount: 20 })
await saveCorporateTrip({ companyId: 3, stops: [{ location: 'Al Khobar' }, { location: 'Dammam' }] })
assert.equal(requests.at(-1).url, '/api/corporate-trips')
await corporateStatus(7, 'Completed')
assert.equal(requests.at(-1).method, 'PATCH')
await saveInvoice({ currency: 'SAR', sources: [{ kind: 'Individual', id: 7 }] }, true)
assert.equal(requests.at(-1).url, '/api/invoices?issue=true')
await issueInvoice(7)
assert.equal(requests.at(-1).url, '/api/invoices/7/issue')
await getBillingProfile()
assert.equal(requests.at(-1).url,'/api/invoices/billing-profile')
await saveBillingProfile({version:1,issuer:{name:'Test Seller'}})
assert.equal(requests.at(-1).method,'PUT')
assert.equal(requests.at(-1).data.version,1)
await issueCreditNote(7,{requestId:'contract-credit',reason:'Rental reduced',lines:[{lineIndex:0,amount:20}]})
assert.equal(requests.at(-1).url,'/api/invoices/7/credit-notes')
assert.equal(requests.at(-1).method,'POST')
assert.equal(requests.at(-1).data.lines[0].amount,20)
await discardInvoice(7)
assert.equal(requests.at(-1).url, '/api/invoices/7/discard')
assert.equal(requests.at(-1).method, 'POST')
await invoicePayment(7, { kind: 'Payment', amount: 50, date: '2026-10-05', method: 'Cash' })
assert.equal(requests.at(-1).data.method, 'Cash')
assert.equal(balanceDue({ status: 'Completed', totalAmount: 100, invoicedAmount: 150, receivedAmount: 120 }), 30)
assert.equal(paymentStatus({ totalAmount: 100, invoicedAmount: 150, receivedAmount: 120 }), 'Partially Paid')
globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ detail: 'Assignment conflict.' }) })
await assert.rejects(() => assignBooking(7, { vehicleId: 4 }), /Assignment conflict/)
console.log('Booking and invoice API integration tests passed')
