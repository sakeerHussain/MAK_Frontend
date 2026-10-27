import { apiRequest } from '../../shared/lib/apiRequest.js'

export const loadPayroll = period => apiRequest(`/payroll?period=${encodeURIComponent(period)}`)
export const saveSalaryProfile = (id, data) => apiRequest(`/payroll/profiles${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', data)
export const preparePayrollDrafts = (period, payeeIds) => apiRequest('/payroll/drafts', 'POST', { period, payeeIds })
export const savePayrollDraft = (id, data) => apiRequest(`/payroll/drafts/${id}`, 'PUT', data)
export const discardPayrollDraft = (id, version) => apiRequest(`/payroll/drafts/${id}?version=${version}`, 'DELETE')
