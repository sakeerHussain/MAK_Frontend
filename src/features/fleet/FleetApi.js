import { sessionFetch } from '../../shared/lib/sessionFetch.js'
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const VEHICLES = `${API_BASE}/vehicles`

async function request(path, options = {}) {
  let response
  try { response = await sessionFetch(path, options) }
  catch { throw new Error('Cannot reach the backend. Start Spring Boot on port 8080 and try again.') }
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    const validation = problem?.errors && Object.entries(problem.errors).map(([field, message]) => `${field}: ${message}`).join('; ')
    throw new Error(validation || problem?.detail || problem?.message || `Request failed (${response.status}).`)
  }
  if (response.status === 204) return null
  return response.json()
}

function json(method, body) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

function fileUrl(path) {
  return path?.replace(/^\/api(?=\/)/, API_BASE) || null
}

export function mapVehicle(record) {
  const details = record.details || {}
  const image = (item) => ({ ...item, previewUrl: fileUrl(item.url) })
  return {
    ...details, id: record.id, owner: record.owner, documents: record.documents,
    rate: details.dailyRate, carImages: (record.carImages || []).map(image),
    documentRecords: (record.documentRecords || []).map(image),
  }
}

const optionalNumbers = ['hourlyRate', 'monthlyRate', 'serviceIntervalKm', 'lastServiceKm', 'currentOdometerKm',
  'oilIntervalKm', 'lastOilKm', 'tyreIntervalKm', 'lastTyreKm', 'brakeIntervalKm', 'lastBrakeKm']
const fields = ['make', 'model', 'registration', 'year', 'color', 'vehicleId', 'doorNo', 'chassisNo',
  'type', 'seats', 'transmission', 'fuelType', 'featureTags', 'hourlyRate', 'dailyRate', 'monthlyRate',
  'rateCurrency', 'ownership', 'vendor', 'status', 'custodian', 'onSite', 'listedForBooking',
  'showOnPublicSite', 'serviceIntervalKm', 'lastServiceKm', 'currentOdometerKm', 'oilIntervalKm',
  'lastOilKm', 'tyreIntervalKm', 'lastTyreKm', 'brakeIntervalKm', 'lastBrakeKm',
  'registrationExpiryDate', 'insuranceExpiryDate', 'inspectionExpiryDate']

export function vehiclePayload(car) {
  const source = { ...car, rateCurrency: car.rateCurrency || 'SAR' }
  const result = Object.fromEntries(fields.map((field) => [field, source[field] ?? null]))
  for (const field of ['year', 'seats', 'dailyRate']) {
    result[field] = result[field] === '' || result[field] == null ? null : Number(result[field])
  }
  for (const field of ['registrationExpiryDate', 'insuranceExpiryDate', 'inspectionExpiryDate']) result[field] = result[field] || null
  result.featureTags = Array.isArray(result.featureTags)
    ? result.featureTags : String(result.featureTags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
  optionalNumbers.forEach((field) => { result[field] = result[field] === '' || result[field] == null ? null : Number(result[field]) })
  for (const field of ['onSite', 'listedForBooking', 'showOnPublicSite']) result[field] = Boolean(result[field])
  return result
}

export async function listVehicles() {
  const vehicles = []
  let page = 0
  let totalPages
  do {
    const data = await request(`${VEHICLES}?page=${page}&size=100`)
    vehicles.push(...data.content.map(mapVehicle))
    totalPages = data.totalPages
    page += 1
  } while (page < totalPages)
  return vehicles
}

export function getFleetUtilization(period, signal) {
  return request(`${VEHICLES}/utilization?${new URLSearchParams({ period })}`, { signal })
}

export async function getVehicle(id) { return mapVehicle(await request(`${VEHICLES}/${id}`)) }
export async function createVehicle(car) { return mapVehicle(await request(VEHICLES, json('POST', vehiclePayload(car)))) }
export async function updateVehicle(id, car) { return mapVehicle(await request(`${VEHICLES}/${id}`, json('PUT', vehiclePayload(car)))) }
export async function updateVehicleStatus(id, status) { return mapVehicle(await request(`${VEHICLES}/${id}/status`, json('PATCH', { status }))) }
export async function deleteVehicleFile(id, fileId) { await request(`${VEHICLES}/${id}/files/${fileId}`, { method: 'DELETE' }) }

async function upload(path, file) {
  const body = new FormData()
  body.append('file', file)
  return request(path, { method: 'POST', body })
}

export async function uploadVehicleImage(id, file) { return upload(`${VEHICLES}/${id}/images`, file) }
export async function uploadVehicleDocument(id, type, expiryDate, file) {
  const query = new URLSearchParams({ type })
  if (expiryDate) query.set('expiryDate', expiryDate)
  return upload(`${VEHICLES}/${id}/documents?${query}`, file)
}

export async function saveVehicleFiles(id, draft, previous) {
  const kept = new Set([...(draft.carImages || []), ...(draft.documentRecords || [])].map((item) => item.id).filter(Boolean))
  const replacementTypes = new Set((draft.documentRecords || []).filter((item) => item.file).map((item) => item.type))
  const removedImages = (previous?.carImages || []).filter((item) => item.id && !kept.has(item.id))
  const removedDocuments = (previous?.documentRecords || []).filter((item) => item.id && !kept.has(item.id) && !replacementTypes.has(item.type))
  for (const item of removedImages) await deleteVehicleFile(id, item.id)
  for (const item of draft.carImages || []) if (item.file) await uploadVehicleImage(id, item.file)
  for (const item of draft.documentRecords || []) if (item.file) await uploadVehicleDocument(id, item.type, item.expiryDate, item.file)
  for (const item of removedDocuments) await deleteVehicleFile(id, item.id)
  return getVehicle(id)
}

// Unlike ordinary form booleans, a missing on-site answer in an import draft stays unknown.
export function vehicleDraftPayload(car) {
  const payload = vehiclePayload(car)
  Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null })
  payload.onSite = car.onSite === '' || car.onSite == null ? null : Boolean(car.onSite)
  payload.status = 'Inactive'; payload.listedForBooking = false; payload.showOnPublicSite = false
  return payload
}
export function listVehicleImportDrafts() { return request(`${VEHICLES}/import-drafts`) }
export function saveVehicleImportDrafts(cars) { return request(`${VEHICLES}/import-drafts`, json('POST', cars.map(car => ({ details: vehicleDraftPayload(car) })))) }
export function updateVehicleImportDraft(draft, car) { return request(`${VEHICLES}/import-drafts/${draft.id}`, json('PUT', { details: vehicleDraftPayload(car), version: draft.version })) }
export async function completeVehicleImportDraft(draft, car) { return mapVehicle(await request(`${VEHICLES}/import-drafts/${draft.id}/complete`, json('POST', { details: vehiclePayload(car), version: draft.version }))) }
export function discardVehicleImportDraft(draft) { return request(`${VEHICLES}/import-drafts/${draft.id}?version=${draft.version}`, { method: 'DELETE' }) }

export async function importVehicles(cars) { return request(`${VEHICLES}/import`, json('POST', cars.map(vehiclePayload))) }
