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
export const listRoleDefinitions = () => apiRequest('/users/role-definitions')
export const saveRoleDefinition = role => apiRequest(`/users/role-definitions${role.id?`/${role.id}`:''}`,role.id?'PUT':'POST',{name:role.name,description:role.description,permissions:role.permissions,version:role.version})
export const listInvitations = () => apiRequest('/users/invitations')
export const inviteUser = data => apiRequest('/users/invitations','POST',data)
export const invitationAction = (id,action) => apiRequest(`/users/invitations/${id}/${action}`,'POST')
export const previewInvitation = token => apiRequest(`/auth/invitation?token=${encodeURIComponent(token)}`)
export const listSecurityAudit = () => apiRequest('/security-audit')
