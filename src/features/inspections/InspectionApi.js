import { apiRequest, apiMultipart, apiFileUrl } from '../../shared/lib/apiRequest.js'

export function mapInspection(record) {
  return { ...record, bookingId: record.bookingId ?? '', notes: record.notes || '', photos: record.photos.map((photo) => ({ ...photo, previewUrl: apiFileUrl(photo.url), url: apiFileUrl(photo.url) })) }
}
export async function listInspections() { return (await apiRequest('/inspections')).map(mapInspection) }
export async function saveInspectionRecord(inspection) {
  const body = new FormData()
  const photos = inspection.photos.map((photo, index) => {
    if (!photo.file) return { id: photo.id }
    const uploadKey = `photo${index}`
    body.append(uploadKey, photo.file, photo.name)
    return { uploadKey }
  })
  const record = {
    vehicleId: Number(inspection.vehicleId), type: inspection.type, condition: inspection.condition,
    inspectionDate: inspection.inspectionDate, inspector: inspection.inspector.trim(),
    odometerKm: Number(inspection.odometerKm), fuelLevel: Number(inspection.fuelLevel),
    bookingId: inspection.bookingId ? Number(inspection.bookingId) : null,
    notes: inspection.notes.trim(), photos,
  }
  body.append('record', new Blob([JSON.stringify(record)], { type: 'application/json' }))
  return mapInspection(await apiMultipart(`/inspections${inspection.id ? `/${inspection.id}` : ''}`, inspection.id ? 'PUT' : 'POST', body))
}
