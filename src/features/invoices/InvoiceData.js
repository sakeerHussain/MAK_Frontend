import { dayKey, netPaid, shiftDays } from '../bookings/BookingData.js'
import { billableWaitingMinutes, tripCharges, tripStops } from '../corporate-trips/CorporateData.js'

export const roundAmount = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
export const invoiceKey = (kind, id) => `${kind}:${id}`
export const sourceIsBilled = (invoices, kind, id, excludeId = null) => invoices.some((invoice) => invoice.id !== excludeId && invoice.status !== 'Voided' && invoice.sources.some((source) => invoiceKey(source.kind, source.id) === invoiceKey(kind, id)))

export function lineAmounts(line) {
  const gross = roundAmount(Number(line.quantity || 0) * Number(line.unitPrice || 0))
  const discount = roundAmount(gross * Number(line.discountPercent || 0) / 100)
  const net = roundAmount(gross - discount)
  const tax = roundAmount(net * Number(line.taxPercent || 0) / 100)
  return { gross, discount, net, tax, total: roundAmount(net + tax) }
}

export function invoiceTotals(invoice) {
  const amounts = invoice.lines.map(lineAmounts)
  const subtotal = roundAmount(amounts.reduce((sum, line) => sum + line.net, 0))
  const tax = roundAmount(amounts.reduce((sum, line) => sum + line.tax, 0))
  const total = roundAmount(subtotal + tax)
  const paid = roundAmount((invoice.payments || []).reduce((sum, payment) => sum + (payment.kind === 'Refund' ? -1 : 1) * Number(payment.amount || 0), 0))
  return { subtotal, tax, total, totalAmountDue: total, paid, balance: Math.max(0, roundAmount(total - paid)) }
}

export function invoiceTaxSummary(invoice) {
  const grouped = new Map()
  for (const line of invoice.lines) {
    const rate = Number(line.taxPercent || 0)
    const amounts = lineAmounts(line)
    const current = grouped.get(rate) || { rate, taxable: 0, tax: 0 }
    grouped.set(rate, { rate, taxable: roundAmount(current.taxable + amounts.net), tax: roundAmount(current.tax + amounts.tax) })
  }
  return [...grouped.values()].sort((a, b) => a.rate - b.rate)
}

export function invoicePaymentStatus(invoice, now = new Date()) {
  if (invoice.status === 'Draft') return 'Draft'
  if (invoice.status === 'Voided') return 'Voided'
  const { balance, paid } = invoiceTotals(invoice)
  if (balance === 0) return 'Paid'
  if (invoice.dueDate && invoice.dueDate < dayKey(now)) return 'Overdue'
  return paid > 0 ? 'Partially Paid' : 'Unpaid'
}

export function validateInvoice(invoice, forIssue = false) {
  if (!invoice.sources.length || !invoice.lines.length) return 'Add a completed booking or trip and at least one line item.'
  for (const line of invoice.lines) {
    const quantity = Number(line.quantity)
    const unitPrice = Number(line.unitPrice)
    const discountPercent = Number(line.discountPercent || 0)
    const taxPercent = Number(line.taxPercent || 0)
    if (!line.description.trim() || !line.unit.trim() || String(line.quantity).trim() === '' || String(line.unitPrice).trim() === '' || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100 || !Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) return 'Complete each line with a description, positive quantity, valid price, discount, and tax.'
  }
  if (invoiceTotals(invoice).total <= 0) return 'Invoice total must be greater than zero.'
  if (invoiceTotals(invoice).paid > invoiceTotals(invoice).total) return 'Applied payments exceed the invoice total.'
  if (forIssue) {
    if (!invoice.issuer?.name?.trim() || !(invoice.issuer?.street ?? invoice.issuer?.address ?? '').trim()) return 'Enter the seller name and street.'
    if (!invoice.billTo.name.trim() || !invoice.billTo.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoice.billTo.email.trim())) return 'Enter the bill-to name and a valid billing email.'
    if (invoice.kind === 'Corporate' && (!(invoice.billTo.street ?? invoice.billTo.address ?? '').trim() || !invoice.billTo.city.trim() || !invoice.billTo.country.trim())) return 'Complete the corporate buyer street, city, and country.'
    if (!invoice.dueDate || invoice.dueDate < dayKey(new Date())) return 'Select a due date of today or later.'
  }
  return ''
}

const sourceDate = (record) => dayKey(record.actualReturnAt || record.returnAt)
const newLine = (sourceRef, description, quantity, unit, unitPrice, taxPercent = 0) => ({
  id: crypto.randomUUID(), sourceRef, description, quantity, unit, unitPrice, discountPercent: 0, taxPercent,
})

export function invoiceDraftFromSources(sources, bookings, trips, companies) {
  if (!sources.length) throw new Error('Choose at least one completed booking or trip.')
  const corporate = sources[0].kind === 'Corporate'
  if (sources.some((source) => source.kind !== sources[0].kind)) throw new Error('Individual and corporate records need separate invoices.')
  const records = sources.map((source) => {
    const record = (corporate ? trips : bookings).find((item) => item.id === source.id)
    if (!record || record.status !== 'Completed') throw new Error('Only completed records can be invoiced.')
    return record
  })
  if (!corporate && records.length !== 1) throw new Error('Create one invoice per individual booking.')
  if (corporate && records.some((record) => record.companyName !== records[0].companyName)) throw new Error('Corporate trips on one invoice must belong to the same company.')
  const company = corporate ? companies.find((item) => item.id === records[0].companyId || item.name === records[0].companyName) : null
  const billTo = corporate ? {
    name: company?.name || records[0].companyName, contactName: company?.billingContactName || '', email: company?.billingEmail || '', phone: company?.billingPhone || '',
    address: company?.billingAddress || '', street: company?.billingAddress || '', buildingNumber: '', additionalNumber: '', district: '', city: company?.billingCity || '', country: company?.billingCountry || '', postalCode: '', taxNumber: company?.taxNumber || '', registrationNumber: company?.registrationNumber || '', otherId: company?.registrationNumber || '',
  } : {
    name: records[0].customerName, contactName: '', email: records[0].customerEmail || '', phone: records[0].customerPhone || '',
    address: '', street: '', buildingNumber: '', additionalNumber: '', district: '', city: '', country: '', postalCode: '', taxNumber: '', registrationNumber: '', otherId: '',
  }
  const lines = records.flatMap((record) => {
    const reference = corporate ? record.tripId : record.bookingId
    if (record.quoteSnapshot?.lines?.length) return record.quoteSnapshot.lines.map((line) => newLine(reference, `${line.description} · ${reference}`, Number(line.quantity), line.unit, Number(line.unitPrice), Number(record.quoteSnapshot.taxPercent || 0)))
    if (!corporate) return [newLine(reference, `Vehicle rental and services · ${reference}`, 1, 'Trip', record.totalAmount)]
    const charges = tripCharges(record)
    const result = [newLine(reference, `Corporate trip · ${reference} · ${record.pickupLocation} to ${record.destination}`, Number(record.quantity || 1), record.rateUnit || 'Trip', Number(record.unitPrice || 0), Number(record.taxPercent || 0))]
    if (charges.waiting > 0) result.push(newLine(reference, `Billable waiting · ${billableWaitingMinutes(tripStops(record), record.includedWaitingMinutes, record.waitingBillingIncrementMinutes)} minutes`, 1, 'Service', charges.waiting, Number(record.taxPercent || 0)))
    return result
  })
  const openingPayment = !corporate && netPaid(records[0]) > 0 ? [{ id: crypto.randomUUID(), kind: 'Payment', amount: netPaid(records[0]), date: dayKey(new Date()), method: 'Opening balance', reference: `Recorded on ${records[0].bookingId}` }] : []
  return {
    id: null, invoiceNumber: '', status: 'Draft', kind: corporate ? 'Corporate' : 'Individual', createdAt: new Date().toISOString(), issuedAt: '',
    dueDate: dayKey(shiftDays(new Date(), corporate ? 30 : 7)), currency: 'SAR', companyId: company?.id || null,
    poNumber: '', transactionType: corporate ? 'Corporate Trip' : 'Vehicle Rental',
    issuer: { name: 'Rental Admin Preview', address: '', street: '', buildingNumber: '', additionalNumber: '', district: '', city: '', country: '', postalCode: '', phone: '', taxNumber: '', otherId: '' },
    sources: records.map((record) => ({ kind: corporate ? 'Corporate' : 'Individual', id: record.id, reference: corporate ? record.tripId : record.bookingId, serviceDate: sourceDate(record) })),
    billTo, lines, paymentTerms: corporate ? company?.paymentTerms || '' : '', notes: '', paymentContact: corporate ? company?.billingContactName || '' : records[0].customerName,
    account: { accountName: '', bankName: '', branchName: '', accountNumber: '', iban: '' }, payments: openingPayment,
  }
}

export function makeDemoInvoices(bookings, trips, companies) {
  const individual = bookings.find((booking) => booking.bookingId === 'BK-2053')
  const corporate = trips.find((trip) => trip.tripId === 'CT-3010')
  const paid = individual ? { ...invoiceDraftFromSources([{ kind: 'Individual', id: individual.id }], bookings, trips, companies), id: 1, invoiceNumber: 'INV-1001', status: 'Issued', issuedAt: new Date().toISOString(), issuer: { name: 'Rental Admin Preview', address: 'Sample office, Riyadh', street: 'Sample office', buildingNumber: '', additionalNumber: '', district: '', city: 'Riyadh', country: 'Saudi Arabia', postalCode: '', phone: '', taxNumber: '', otherId: '' } } : null
  const draft = corporate ? { ...invoiceDraftFromSources([{ kind: 'Corporate', id: corporate.id }], bookings, trips, companies), id: 2 } : null
  return [paid, draft].filter(Boolean)
}
