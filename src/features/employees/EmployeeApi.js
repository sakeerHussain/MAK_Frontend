import { apiRequest, apiMultipart, apiFileUrl } from '../../shared/lib/apiRequest.js'
import { blankEmployee } from './EmployeeData.js'

const fields = Object.keys(blankEmployee()).filter((key) => !['photo', 'documents', 'payrollCount'].includes(key))
const numbers = ['hourlyRate', 'dailyRate', 'monthlySalary', 'yearsExperience']
const dates = ['iqamaExpiry', 'joinedOn', 'passportExpiry', 'contractExpiry', 'licenceExpiry', 'insuranceExpiry']
export function employeePayload(employee) {
  const payload = Object.fromEntries(fields.map((key) => [key, employee[key] ?? null]))
  for (const key of numbers) payload[key] = payload[key] === '' || payload[key] == null ? null : Number(payload[key])
  for (const key of dates) payload[key] = payload[key] || null
  return payload
}
export function mapEmployee(record) {
  const details = Object.fromEntries(Object.entries(record.details).map(([key, value]) => [key, value ?? '']))
  const file = (item) => item && ({ ...item, url: apiFileUrl(item.url), previewUrl: apiFileUrl(item.url) })
  return { ...blankEmployee(), ...details, id: record.id, photo: file(record.photo), documents: (record.documents || []).map(file), payrollCount: record.payrollCount }
}
export async function listEmployees() {
  const records = []; let page = 0; let totalPages
  do {
    const response = await apiRequest(`/employees?page=${page}&size=100`)
    records.push(...response.content.map(mapEmployee)); totalPages = response.totalPages; page += 1
  } while (page < totalPages)
  return records
}
export async function saveEmployeeRecord(employee) {
  const body = new FormData()
  body.append('record', new Blob([JSON.stringify(employeePayload(employee))], { type: 'application/json' }))
  if (employee.photo?.file) body.append('photo', employee.photo.file)
  const documents = (employee.documents || []).map((item, index) => {
    const uploadKey = `document${index}`
    if (item.file) body.append(uploadKey, item.file)
    return { id: item.id || null, type: item.type, expiryDate: item.expiryDate || null, uploadKey: item.file ? uploadKey : null }
  })
  body.append('attachments', new Blob([JSON.stringify({ photo: employee.photo?.id || null, documents })], { type: 'application/json' }))
  return mapEmployee(await apiMultipart(`/employees${employee.id ? `/${employee.id}` : ''}/save`, employee.id ? 'PUT' : 'POST', body))
}
export async function updateEmployeeStatus(id, status) { return mapEmployee(await apiRequest(`/employees/${id}/status`, 'PATCH', { status })) }
export const archiveEmployee = (id) => apiRequest(`/employees/${id}`, 'DELETE')
export const importEmployees = (employees) => apiRequest('/employees/import', 'POST', employees.map(employeePayload))
