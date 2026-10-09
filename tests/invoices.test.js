import test from 'node:test'
import assert from 'node:assert/strict'
import { invoiceDraftFromSources, invoicePaymentStatus, invoiceTaxSummary, invoiceTotals, lineAmounts, sourceIsBilled, validateInvoice } from '../src/features/invoices/InvoiceData.js'
import { invoiceHtml } from '../src/features/invoices/InvoiceExport.js'

const booking = {
  id: 7, bookingId: 'BK-7', status: 'Completed', customerName: 'Aisha', customerEmail: 'aisha@example.com',
  customerPhone: '500000000', totalAmount: 115, receivedAmount: 15, refundedAmount: 0, returnAt: '2026-10-01T10:00',
}
const draft = () => invoiceDraftFromSources([{ kind: 'Individual', id: 7 }], [booking], [], [])

test('line discounts and tax produce the payable total', () => {
  assert.deepEqual(lineAmounts({ quantity: 2, unitPrice: 100, discountPercent: 10, taxPercent: 15 }), { gross: 200, discount: 20, net: 180, tax: 27, total: 207 })
})

test('completed individual booking creates a linked draft with opening payment', () => {
  const invoice = draft()
  assert.equal(invoice.sources[0].reference, 'BK-7')
  assert.equal(invoiceTotals(invoice).balance, 100)
  assert.equal(sourceIsBilled([{ ...invoice, id: 99 }], 'Individual', 7), true)
  assert.throws(() => invoiceDraftFromSources([{ kind: 'Individual', id: 8 }], [booking], [], []), /Only completed/)
})

test('blank unit price is rejected before conversion to a number', () => {
  const invoice = draft()
  invoice.lines[0].unitPrice = ''
  assert.match(validateInvoice(invoice), /Complete each line/)
})

test('payment status follows balance and due date', () => {
  const invoice = { ...draft(), status: 'Issued', dueDate: '2026-10-10' }
  assert.equal(invoicePaymentStatus(invoice, new Date('2026-10-04T12:00:00')), 'Partially Paid')
  assert.equal(invoicePaymentStatus(invoice, new Date('2026-10-11T12:00:00')), 'Overdue')
  invoice.payments.push({ id: 'p2', kind: 'Payment', amount: 100 })
  assert.equal(invoicePaymentStatus(invoice, new Date('2026-10-11T12:00:00')), 'Paid')
})

test('export escapes entered invoice text', () => {
  const invoice = draft()
  invoice.lines[0].description = '<script>alert(1)</script>'
  const html = invoiceHtml(invoice)
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(!html.includes('<script>alert(1)</script>'))
})

test('tax summary groups taxable amounts and VAT by rate', () => {
  const invoice = draft()
  invoice.lines = [
    { id: 'one', description: 'Rental', unit: 'Trip', quantity: 2, unitPrice: 100, discountPercent: 10, taxPercent: 15 },
    { id: 'two', description: 'Extra', unit: 'Service', quantity: 1, unitPrice: 20, discountPercent: 0, taxPercent: 15 },
    { id: 'three', description: 'Zero rated', unit: 'Service', quantity: 1, unitPrice: 5, discountPercent: 0, taxPercent: 0 },
  ]
  assert.deepEqual(invoiceTaxSummary(invoice), [{ rate: 0, taxable: 5, tax: 0 }, { rate: 15, taxable: 200, tax: 30 }])
  assert.equal(invoiceTotals(invoice).totalAmountDue, 235)
})

test('download includes metadata, parties, tax summary, payment and account fields', () => {
  const invoice = draft()
  invoice.poNumber = 'PO-42'
  invoice.issuer = { ...invoice.issuer, street: 'Main Road', taxNumber: 'VAT-123' }
  invoice.billTo = { ...invoice.billTo, buildingNumber: '12', otherId: 'BUY-7' }
  invoice.account = { accountName: 'Rental Admin', bankName: 'Example Bank', branchName: 'Riyadh', accountNumber: '1234', iban: 'SA001234' }
  const html = invoiceHtml(invoice)
  for (const text of ['P.O. #', 'PO-42', 'Seller Building Number', 'VAT-123', 'Buyer Building Number', 'BUY-7', 'Tax Summary', 'Total Taxable Amount', 'Contact Person', 'Account Name', 'IBAN No.', 'SA001234']) assert.ok(html.includes(text), text)
})
