import { apiRequest as requestRental } from '../../shared/lib/apiRequest.js'

export const getBillingProfile = () => requestRental('/invoices/billing-profile')
export const saveBillingProfile = (profile) => requestRental('/invoices/billing-profile','PUT',profile)
export const listInvoices = () => requestRental('/invoices')
export const saveInvoice = (record, issue) => requestRental(`/invoices${record.id ? `/${record.id}` : ''}?issue=${Boolean(issue)}`, record.id ? 'PUT' : 'POST', record)
export const issueCreditNote = (id, credit) => requestRental(`/invoices/${id}/credit-notes`, 'POST', credit)
export const discardInvoice = (id) => requestRental(`/invoices/${id}/discard`, 'POST')
export const issueInvoice = (id) => requestRental(`/invoices/${id}/issue`, 'POST')
export const invoicePayment = (id, payment) => requestRental(`/invoices/${id}/payments`, 'POST', payment)
