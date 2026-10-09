import { apiRequest } from '../../shared/lib/apiRequest.js'
import { clearCsrfToken } from '../../shared/lib/sessionFetch.js'
export const authConfiguration = () => apiRequest('/auth/config')
export const currentAccount = () => apiRequest('/auth/me')
export const signupAccount = (record) => apiRequest('/auth/signup', 'POST', record)
export async function loginAccount(record) { const result = await apiRequest('/auth/login', 'POST', record); clearCsrfToken(); return result }
export async function logoutAccount() { await apiRequest('/auth/logout', 'POST'); clearCsrfToken() }
export const forgotPassword = (email) => apiRequest('/auth/forgot-password', 'POST', { email })
export const resetPassword = (token, password) => apiRequest('/auth/reset-password', 'POST', { token, password })
export const listUsers = () => apiRequest('/users')
export const listRoles = () => apiRequest('/users/roles')
export const updateUserAccess = (id, record) => apiRequest(`/users/${id}/access`, 'PATCH', record)
export const listSecurityAudit = () => apiRequest('/security-audit')
