import test from 'node:test'
import process from 'node:process'
import assert from 'node:assert/strict'
import { billingDateRange, invoiceDaysUntil, invoicePaymentStatus, invoiceDraftFromSources } from '../src/features/invoices/InvoiceData.js'
import { invoiceMetadataRows } from '../src/features/invoices/InvoicePresentation.js'
import { invoiceHtml } from '../src/features/invoices/InvoiceExport.js'
import { dayKey } from '../src/features/bookings/BookingData.js'

for (const zone of ['Asia/Calcutta', 'America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']) {
  test(`Finance dates remain KSA calendar dates in ${zone}`, () => {
    const previous = process.env.TZ
    process.env.TZ = zone
    try {
      assert.deepEqual(billingDateRange('This month', new Date('2026-10-25T08:00:00Z')), ['2026-10-01','2026-10-25'])
      const monthBoundary = new Date('2026-10-31T22:30:00Z')
      assert.deepEqual(billingDateRange('This month', monthBoundary), ['2026-11-01','2026-11-01'])
      assert.deepEqual(billingDateRange('Last month', monthBoundary), ['2026-10-01','2026-10-31'])
      assert.deepEqual(billingDateRange('Last month', new Date('2026-12-31T21:30:00Z')), ['2026-12-01','2026-12-31'])
      assert.deepEqual(billingDateRange('Last month', new Date('2024-02-29T21:30:00Z')), ['2024-02-01','2024-02-29'])
      assert.deepEqual(billingDateRange('Last 30 days', new Date('2026-03-20T21:30:00Z')), ['2026-02-20','2026-03-21'])
      assert.deepEqual(billingDateRange('All time', monthBoundary), ['', ''])
      assert.deepEqual(billingDateRange('Custom', monthBoundary), ['', ''])
      assert.equal(invoiceDaysUntil('2026-03-09', new Date('2026-03-06T22:00:00Z')), 2)
      const invoice = { id:1, status:'Issued', issuedAt:'2026-10-31T22:30:00Z', dueDate:'2026-11-01', lines:[{quantity:1,unitPrice:100}],payments:[], sources:[],issuer:{},billTo:{},notes:'' }
      assert.equal(invoicePaymentStatus(invoice, monthBoundary),'Unpaid')
      assert.equal(invoicePaymentStatus(invoice, new Date('2026-11-01T21:00:00Z')),'Overdue')
      assert.equal(invoiceMetadataRows(invoice).find(([label]) => label === 'Invoice Issue Date')[1], '2026-11-01')
      assert.ok(invoiceHtml(invoice).includes('2026-11-01'))
      // Date-only fields stay unchanged; timestamps use the KSA date in table/CSV paths.
      assert.equal(dayKey('2026-11-01'), '2026-11-01')
      assert.equal(dayKey(invoice.issuedAt), '2026-11-01')
      const booking={id:1,bookingId:'BK-1',status:'Completed',customerName:'Audit',totalAmount:100,receivedAmount:0,returnAt:invoice.issuedAt}
      const draft=invoiceDraftFromSources([{kind:'Individual',id:1}],[booking],[],[])
      assert.equal(draft.sources[0].serviceDate,'2026-11-01')
    } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
  })
}
