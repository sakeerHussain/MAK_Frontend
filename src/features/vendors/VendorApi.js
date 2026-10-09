import { sessionFetch } from '../../shared/lib/sessionFetch.js'
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const VENDORS = `${API_BASE}/vendors`

async function request(path, options = {}) {
  let response
  try { response = await sessionFetch(path, options) }
  catch { throw new Error('Cannot reach the backend. Start Spring Boot and try again.') }
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.detail || problem?.message || `Request failed (${response.status}).`)
  }
  if (response.status === 204) return null
  return response.json()
}

const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const fileUrl = (path) => path?.replace(/^\/api(?=\/)/, API_BASE) || null

export function vendorPayload(vendor) {
  const trim = (value) => String(value || '').trim()
  return {
    vendorType: vendor.vendorType, name: trim(vendor.name), crNumber: trim(vendor.crNumber),
    vatNumber: trim(vendor.vatNumber), nationalAddress: trim(vendor.nationalAddress),
    classification: vendor.classification || null, commission: Number(vendor.commission),
    status: vendor.status, creditTerms: Number(vendor.creditTerms),
    contractStart: vendor.contractStart || null, contractEnd: vendor.contractEnd || null,
    contacts: vendor.contacts.map((contact) => ({ name: trim(contact.name), mobile: trim(contact.mobile), email: trim(contact.email) })),
    bank: Object.fromEntries(Object.entries(vendor.bank).map(([key, value]) => [key, trim(value)])),
  }
}

export function mapVendor(record) {
  return {
    ...record, creditTerms: String(record.creditTerms), contractStart: record.contractStart || '',
    contractEnd: record.contractEnd || '', attachments: (record.attachments || []).map((item) => ({ ...item, url: fileUrl(item.url) })),
  }
}

export async function listVendors() {
  const vendors = []
  let page = 0
  let totalPages
  do {
    const data = await request(`${VENDORS}?page=${page}&size=100`)
    vendors.push(...data.content.map(mapVendor))
    totalPages = data.totalPages
    page += 1
  } while (page < totalPages)
  return vendors
}

export async function getVendor(id) { return mapVendor(await request(`${VENDORS}/${id}`)) }
export async function createVendor(vendor) { return mapVendor(await request(VENDORS, json('POST', vendorPayload(vendor)))) }
export async function updateVendor(id, vendor) { return mapVendor(await request(`${VENDORS}/${id}`, json('PUT', vendorPayload(vendor)))) }
export async function updateVendorStatus(id, status) { return mapVendor(await request(`${VENDORS}/${id}/status`, json('PATCH', { status }))) }
export async function archiveVendor(id) { await request(`${VENDORS}/${id}`, { method: 'DELETE' }) }
export async function deleteVendorAttachment(id, fileId) { await request(`${VENDORS}/${id}/files/${fileId}`, { method: 'DELETE' }) }

export async function uploadVendorAttachment(id, type, file) {
  const body = new FormData()
  body.append('file', file)
  return request(`${VENDORS}/${id}/attachments?${new URLSearchParams({ type })}`, { method: 'POST', body })
}

export async function saveVendorAttachments(id, draft, previous) {
  const retainedIds = new Set((draft.attachments || []).map((item) => item.id).filter(Boolean))
  const replacementTypes = new Set((draft.attachments || []).filter((item) => item.file).map((item) => item.type))
  for (const item of draft.attachments || []) if (item.file) await uploadVendorAttachment(id, item.type, item.file)
  for (const item of previous?.attachments || []) {
    if (item.id && !retainedIds.has(item.id) && !replacementTypes.has(item.type)) await deleteVendorAttachment(id, item.id)
  }
  return getVendor(id)
}
