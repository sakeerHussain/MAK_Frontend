import { requireCorporateCustomer } from '../customers/CustomerEditorData.js'
import { apiRequest as requestRental } from '../../shared/lib/apiRequest.js'

export const listCorporateTrips = () => requestRental('/corporate-trips')
export const saveCorporateTrip = (record) => requestRental(`/corporate-trips${record.id ? `/${record.id}` : ''}`, record.id ? 'PUT' : 'POST', record)
export const corporateStatus = (id, status, changes = {}) => requestRental(`/corporate-trips/${id}/status`, 'PATCH', { ...changes, status })
export const assignCorporateTrip = (id, changes) => requestRental(`/corporate-trips/${id}/assignment`, 'PATCH', { ...changes, handedOver: changes.status === 'Active' })

export function saveCorporateTripForCustomer(record, companies) {
  const company = requireCorporateCustomer(companies, record.companyId)
  return saveCorporateTrip({ ...record, companyId:company.id, companyName:company.name })
}
