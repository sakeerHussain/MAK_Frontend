const shown = (value) => String(value ?? '').trim() || '—'

export const invoiceMetadataRows = (invoice) => [
  ['Invoice #', invoice.invoiceNumber || (invoice.id ? `DRAFT-${invoice.id}` : 'Assigned when issued')],
  ['Invoice Issue Date', invoice.issuedAt?.slice(0, 10) || 'Not issued'],
  ['Due Date', shown(invoice.dueDate)],
  ['Terms', shown(invoice.paymentTerms)],
  ['P.O. #', shown(invoice.poNumber)],
  ['Transaction Type', shown(invoice.transactionType || (invoice.kind === 'Corporate' ? 'Corporate Trip' : 'Vehicle Rental'))],
]

export const invoicePartyRows = (party = {}, kind) => [
  [`${kind} Name`, shown(party.name)],
  [`${kind} Building Number`, shown(party.buildingNumber)],
  [`${kind} Street`, shown(party.street ?? party.address)],
  [`${kind} Additional Number`, shown(party.additionalNumber)],
  [`${kind} District`, shown(party.district)],
  [`${kind} City`, shown(party.city)],
  [`${kind} Country`, shown(party.country)],
  [`${kind} ZIP/Postal Code`, shown(party.postalCode)],
  [`${kind} Phone`, shown(party.phone)],
  [`${kind} VAT Number`, shown(party.taxNumber)],
  [`Other ${kind} ID`, shown(party.otherId ?? party.registrationNumber)],
]

export const invoiceAccountRows = (account = {}) => [
  ['Account Name', shown(account.accountName)],
  ['Bank Name', shown(account.bankName)],
  ['Branch Name', shown(account.branchName)],
  ['Account Number', shown(account.accountNumber)],
  ['IBAN No.', shown(account.iban)],
]
