import assert from 'node:assert/strict'
import { activeQuoteFor, customerRows, effectiveQuoteStatus, emptyQuote, previewRouteCsv, pricePreview, quoteExpiresSoon, quoteIssues, routeTemplateCsv } from '../src/features/customers/CustomerData.js'
import { invoiceDraftFromSources } from '../src/features/invoices/InvoiceData.js'
import { quoteHtml } from '../src/features/customers/QuoteExport.js'

const key = 'corporate:12'
const today = new Date().toISOString().slice(0, 10)
const quote = {
  ...emptyQuote(key), status: 'Approved', offerValidUntil: '2099-01-01', effectiveFrom: '2020-01-01', effectiveTo: '2099-12-31',
  routes: [
    { id: 'route-one', from: 'Al Khobar', via: 'Dammam, Jubail', to: 'Riyadh', vehicle: 'SUV', amount: 800 },
    { id: 'route-two', from: 'Al Khobar', via: '', to: 'Riyadh', vehicle: 'SUV', amount: 700 },
  ],
  monthly: [{ id: 'month-one', vehicle: 'Toyota Coaster', amount: 20000, includedKm: 1000, includedTrips: 30 }],
  services: [{ id: 'service-one', name: 'Local trip', unit: 'Trip', amount: 80 }],
  extras: { extraKmRate: 2, overtimeRate: 70, extraDriverRate: 500, extraDriverThresholdKm: 750 },
}

assert.deepEqual(quoteIssues(quote), [])
assert.equal(effectiveQuoteStatus(quote, today), 'Active')
assert.equal(activeQuoteFor([quote], key, today)?.id, quote.id)
assert.equal(activeQuoteFor([quote, { ...quote, id: 'overlap' }], key, today), null, 'overlapping approved quotes must not silently select one')
assert.equal(quoteExpiresSoon({ ...quote, effectiveTo: '2026-10-20' }, '2026-10-05'), true)
assert.equal(quoteExpiresSoon({ ...quote, effectiveTo: '2026-12-20' }, '2026-10-05'), false)
assert.equal(pricePreview(quote, { kind: 'Fixed route', from: 'Al Khobar', to: 'Riyadh', vehicle: 'SUV' }).match?.id, 'route-two')
assert.equal(pricePreview(quote, { kind: 'Fixed route', from: 'Riyadh', to: 'Al Khobar', vehicle: 'SUV' }).match, null, 'routes are directed')
assert.equal(pricePreview(quote, { kind: 'Fixed route', from: 'Al Khobar', via: 'Dammam, Jubail', to: 'Riyadh', vehicle: 'SUV' }).match?.id, 'route-one')
assert.equal(pricePreview(quote, { kind: 'Fixed route', from: 'Al Khobar', via: 'Jubail, Dammam', to: 'Riyadh', vehicle: 'SUV' }).match, null, 'stop order matters')
const priced = pricePreview(quote, { kind: 'Fixed route', from: 'Al Khobar', to: 'Riyadh', vehicle: 'SUV', extraKm: 10, overtimeHours: 2, extraDriver: true, oneWayKm: 760 })
assert.equal(priced.subtotal, 1360)
assert.equal(priced.tax, 204)
assert.equal(priced.total, 1564)
assert.equal(pricePreview(quote, { kind: 'Fixed route', from: 'Al Khobar', to: 'Riyadh', vehicle: 'SUV', extraDriver: true, oneWayKm: 750 }).lines.some((line) => line.description === 'Additional driver'), false)
assert.equal(pricePreview(quote, { kind: 'Monthly', vehicle: 'Toyota Coaster' }).subtotal, 20000)
assert.equal(pricePreview({ ...quote, routes: [{ id: 'blank', from: '', via: '', to: '', vehicle: '', amount: '' }] }, { kind: 'Fixed route', from: '', to: '', vehicle: '' }).match, null)
const imported = previewRouteCsv(`${routeTemplateCsv}Al Khobar,,Riyadh,SUV,700\r\nAl Khobar,,Dammam,SUV,-5\r\n`, quote.routes)
assert.equal(imported.length, 4)
assert.equal(imported[0].error, 'Duplicate route (in this quote or CSV)')
assert.equal(imported[1].error, 'Duplicate route (in this quote or CSV)')
assert.equal(imported[2].error, 'Duplicate route (in this quote or CSV)')
assert.match(imported[3].error, /positive charge/)
assert.equal(previewRouteCsv('origin,via_stops,destination,vehicle_class,fixed_charge_sar\nJeddah,,Makkah,Van,150')[0].error, '')
assert.throws(() => previewRouteCsv('wrong,header\na,b'), /Expected CSV columns/)

const individuals = [{ id: 1, name: 'Aisha', phone: '123', email: 'a@b.co', status: 'Active' }]
const companies = [{ id: 12, name: 'Al Noor', billingContactName: 'Omar', billingPhone: '456', billingEmail: 'o@b.co' }]
const rows = customerRows(individuals, companies, [{ id: 1, customerPhone: '123' }], [{ id: 2, companyName: 'Al Noor' }], [quote])
assert.equal(rows.length, 2)
assert.equal(rows.find((row) => row.key === key)?.activity, 1)

const completed = { id: 7, bookingId: 'BK-7', status: 'Completed', customerName: 'Aisha', customerPhone: '123', customerEmail: 'a@b.co', pickupAt: '2026-10-01', totalAmount: priced.total, receivedAmount: 0, refundedAmount: 0, quoteSnapshot: { ...priced, taxPercent: 15, number: quote.number } }
const invoice = invoiceDraftFromSources([{ kind: 'Individual', id: 7 }], [completed], [], [])
assert.equal(invoice.lines.length, 4)
assert.equal(invoice.lines[0].unitPrice, 700)
assert.equal(invoice.lines[1].description.includes('extra distance'), true)
assert.equal(quoteHtml({ name: '<Company>', contact: '', phone: '', email: '' }, quote).includes('&lt;Company&gt;'), true)

console.log('Customer quote and invoice tests passed')
