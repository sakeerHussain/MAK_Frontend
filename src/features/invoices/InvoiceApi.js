import { apiRequest as requestRental } from '../../shared/lib/apiRequest.js'

export const listInvoices = () => requestRental('/invoices')
export const saveInvoice = (record, issue) => requestRental(`/invoices${record.id ? `/${record.id}` : ''}?issue=${Boolean(issue)}`, record.id ? 'PUT' : 'POST', record)
export const issueInvoice = (id) => requestRental(`/invoices/${id}/issue`, 'POST')
export const invoicePayment = (id, payment) => requestRental(`/invoices/${id}/payments`, 'POST', payment)
