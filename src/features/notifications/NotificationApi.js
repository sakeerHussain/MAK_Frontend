import { apiRequest } from '../../shared/lib/apiRequest.js'
const base = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
export const notificationStreamUrl = `${base}/notifications/stream`
export const listNotifications = (filters = {}) => apiRequest(`/notifications?${new URLSearchParams(Object.entries(filters).filter(([,value]) => value !== '' && value != null))}`)
export const notificationSummary = () => apiRequest('/notifications/summary')
export const readNotification = id => apiRequest(`/notifications/${id}/read`, 'POST')
export const acknowledgeNotification = id => apiRequest(`/notifications/${id}/acknowledge`, 'POST')
export const readAllNotifications = () => apiRequest('/notifications/read-all', 'POST')
