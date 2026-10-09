import { sessionFetch } from '../../shared/lib/sessionFetch.js'
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const DRIVERS = `${API_BASE}/drivers`

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
const optionalNumbers = ['yearsExperience', 'hourlyRate', 'monthlyRate']
const dateFields = ['iqamaExpiry', 'joinedOn', 'passportExpiry', 'contractExpiry', 'licenceExpiry', 'insuranceExpiry']
const fields = ['employeeId', 'name', 'phone', 'email', 'category', 'nationality', 'designation', 'idNumber',
  'iqamaExpiry', 'yearsExperience', 'employmentType', 'vendor', 'status', 'companyId', 'joinedOn',
  'officialNumber', 'hourlyRate', 'dailyRate', 'monthlyRate', 'passportNumber', 'passportExpiry',
  'contractId', 'contractExpiry', 'licenceNumber', 'licenceExpiry', 'bloodGroup', 'insuranceNumber',
  'insuranceExpiry', 'emergencyKsa', 'emergencyHome', 'homeAddress']

export function driverPayload(driver) {
  const result = Object.fromEntries(fields.map((field) => [field, driver[field] ?? null]))
  optionalNumbers.forEach((field) => { result[field] = result[field] === '' || result[field] == null ? null : Number(result[field]) })
  dateFields.forEach((field) => { result[field] = result[field] || null })
  result.dailyRate = Number(result.dailyRate)
  return result
}

export function mapDriver(record) {
  const file = (item) => item && ({ ...item, previewUrl: fileUrl(item.url) })
  return {
    ...record.details, id: record.id, photo: file(record.photo),
    documents: (record.documents || []).map(file), certifications: (record.certifications || []).map(file),
    bookingCount: record.bookingCount, paymentCount: record.paymentCount,
  }
}

export async function listDrivers() {
  const drivers = []
  let page = 0
  let totalPages
  do {
    const data = await request(`${DRIVERS}?page=${page}&size=100`)
    drivers.push(...data.content.map(mapDriver))
    totalPages = data.totalPages
    page += 1
  } while (page < totalPages)
  return drivers
}

export async function getDriver(id) { return mapDriver(await request(`${DRIVERS}/${id}`)) }
export async function createDriver(driver) { return mapDriver(await request(DRIVERS, json('POST', driverPayload(driver)))) }
export async function updateDriver(id, driver) { return mapDriver(await request(`${DRIVERS}/${id}`, json('PUT', driverPayload(driver)))) }
export async function updateDriverStatus(id, status) { return mapDriver(await request(`${DRIVERS}/${id}/status`, json('PATCH', { status }))) }
export async function archiveDriver(id) { await request(`${DRIVERS}/${id}`, { method: 'DELETE' }) }
export async function deleteDriverFile(id, fileId) { await request(`${DRIVERS}/${id}/files/${fileId}`, { method: 'DELETE' }) }

async function upload(path, file) {
  const body = new FormData()
  body.append('file', file)
  return request(path, { method: 'POST', body })
}

export async function uploadDriverPhoto(id, file) { return upload(`${DRIVERS}/${id}/photo`, file) }
export async function uploadDriverDocument(id, type, expiryDate, file) {
  const query = new URLSearchParams({ type })
  if (expiryDate) query.set('expiryDate', expiryDate)
  return upload(`${DRIVERS}/${id}/documents?${query}`, file)
}

export async function addDriverCertification(id, certificate) {
  const body = new FormData()
  body.append('name', certificate.name)
  if (certificate.issueDate) body.append('issueDate', certificate.issueDate)
  if (certificate.expiryDate) body.append('expiryDate', certificate.expiryDate)
  if (certificate.file) body.append('file', certificate.file)
  return request(`${DRIVERS}/${id}/certifications`, { method: 'POST', body })
}

export async function updateDriverCertification(id, certificate) {
  return request(`${DRIVERS}/${id}/certifications/${certificate.id}`, json('PATCH', {
    name: certificate.name, issueDate: certificate.issueDate || null, expiryDate: certificate.expiryDate || null,
  }))
}

export async function saveDriverFiles(id, draft, previous) {
  if (draft.photo?.file) await uploadDriverPhoto(id, draft.photo.file)
  else if (!draft.photo && previous?.photo?.id) await deleteDriverFile(id, previous.photo.id)

  const keptDocumentIds = new Set((draft.documents || []).map((item) => item.id).filter(Boolean))
  const replacementTypes = new Set((draft.documents || []).filter((item) => item.file).map((item) => item.type))
  for (const item of draft.documents || []) if (item.file) await uploadDriverDocument(id, item.type, item.expiryDate, item.file)
  for (const item of previous?.documents || []) {
    if (item.id && !keptDocumentIds.has(item.id) && !replacementTypes.has(item.type)) await deleteDriverFile(id, item.id)
  }

  const keptCertificateIds = new Set((draft.certifications || []).filter((item) => item.id && !item.file).map((item) => item.id))
  for (const item of previous?.certifications || []) {
    if (item.id && !keptCertificateIds.has(item.id)) await deleteDriverFile(id, item.id)
  }
  for (const item of draft.certifications || []) {
    if (item.id && !item.file) await updateDriverCertification(id, item)
    else await addDriverCertification(id, item)
  }
  return getDriver(id)
}

export async function importDrivers(items) { return request(`${DRIVERS}/import`, json('POST', items.map(driverPayload))) }
