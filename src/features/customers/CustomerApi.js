import { sessionFetch } from '../../shared/lib/sessionFetch.js'
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request(path, options = {}) {
  let response
  try { response = await sessionFetch(`${API_BASE}${path}`, options) }
  catch { throw new Error('Cannot reach the backend. Start Spring Boot and try again.') }
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.detail || `Request failed (${response.status}).`)
  }
  return response.status === 204 ? null : response.json()
}
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
async function pages(path) {
  const records = []
  let page = 0
  let totalPages
  do {
    const result = await request(`${path}?page=${page}&size=100`)
    records.push(...result.content)
    totalPages = result.totalPages
    page += 1
  } while (page < totalPages)
  return records
}
export const listCustomers = () => pages('/customers')
export const listQuotes = async () => (await pages('/quotes')).map(mapQuote)
export function customerPayload(type, record) {
  const corporate = type === 'Corporate'
  return { type, name: record.name, phone: corporate ? record.billingPhone : record.phone,
    email: corporate ? record.billingEmail : record.email, address: record.address || '', status: record.status || 'Active',
    registrationNumber: record.registrationNumber || '', taxNumber: record.taxNumber || '',
    billingContactName: record.billingContactName || '', billingAddress: record.billingAddress || '',
    billingCity: record.billingCity || '', billingCountry: record.billingCountry || '', paymentTerms: record.paymentTerms || '',
    waitingRatePerHour: Number(record.waitingRatePerHour || 0), includedWaitingMinutes: Number(record.includedWaitingMinutes || 0),
    waitingBillingIncrementMinutes: Number(record.waitingBillingIncrementMinutes || 15) }
}
export const saveCustomerRecord = (type, record) => request(`/customers${record.id ? `/${record.id}` : ''}`, json(record.id ? 'PUT' : 'POST', customerPayload(type, record)))
export const setCustomerStatus = (id, status) => request(`/customers/${id}/status`, json('PATCH', { status }))
export function mapQuote(record) {
  return { ...record, issueDate: record.issueDate || '', offerValidUntil: record.offerValidUntil || '',
    effectiveFrom: record.effectiveFrom || '', effectiveTo: record.effectiveTo || '', notes: record.notes || '',
    paymentTerms: record.paymentTerms || '', evidenceUrl: record.evidenceUrl?.replace(/^\/api(?=\/)/, API_BASE) || null }
}
export async function saveQuoteRecord(quote, existing) {
  let saved
  if (existing && quote.status === 'Approved') {
    if (quote.approval.file) {
      const body = new FormData(); body.append('file', quote.approval.file)
      await request(`/quotes/${quote.id}/evidence`, { method: 'POST', body })
    }
    const { by, date, method, note, fileName } = quote.approval
    saved = await request(`/quotes/${quote.id}/approve`, json('POST', { by, date, method, note, fileName }))
  } else if (existing && ['Rejected', 'Superseded'].includes(quote.status)) {
    saved = await request(`/quotes/${quote.id}/${quote.status === 'Rejected' ? 'reject' : 'supersede'}`, { method: 'POST' })
  } else {
    const payload = { number: quote.number, status: quote.status, taxPercent: Number(quote.taxPercent || 0),
      paymentTerms: quote.paymentTerms, notes: quote.notes, routes: quote.routes, monthly: quote.monthly,
      services: quote.services, extras: quote.extras,
      issueDate: quote.issueDate || null, offerValidUntil: quote.offerValidUntil || null,
      effectiveFrom: quote.effectiveFrom || null, effectiveTo: quote.effectiveTo || null }
    const id = Number(quote.customerKey.split(':')[1])
    saved = await request(existing ? `/quotes/${quote.id}` : `/customers/${id}/quotes`, json(existing ? 'PUT' : 'POST', payload))
  }
  return mapQuote(saved)
}
