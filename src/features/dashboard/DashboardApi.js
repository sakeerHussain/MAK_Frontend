import { apiRequest } from '../../shared/lib/apiRequest.js'
export const loadDashboard = (days = 7) => apiRequest(`/dashboard?days=${days}`)
