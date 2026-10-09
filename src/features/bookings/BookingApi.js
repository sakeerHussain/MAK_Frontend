import { apiRequest as request } from '../../shared/lib/apiRequest.js'

export const listBookings = () => request('/bookings')
export const saveBookingRecord = (record) => request(`/bookings${record.id ? `/${record.id}` : ''}`, record.id ? 'PUT' : 'POST', record)
export const bookingStatus = (id, status, changes = {}) => request(`/bookings/${id}/status`, 'PATCH', { ...changes, status })
export const assignBooking = (id, changes) => request(`/bookings/${id}/assignment`, 'PATCH', { ...changes, handedOver: changes.status === 'Active' })
export const bookingPayment = (id, kind, amount) => request(`/bookings/${id}/payments`, 'POST', { kind, amount })
