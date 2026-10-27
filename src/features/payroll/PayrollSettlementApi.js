import { apiMultipart, apiRequest } from '../../shared/lib/apiRequest.js'

export const approvePayroll = (id, version, reviewNote) => apiRequest(`/payroll/drafts/${id}/approve`, 'POST', { version, reviewNote, reviewed: true })
export const reopenPayroll = (id, version, reason) => apiRequest(`/payroll/drafts/${id}/reopen`, 'POST', { version, reason })
export const reversePayrollPayment = (id, paymentId, version, reason) => apiRequest(`/payroll/drafts/${id}/payments/${paymentId}/reverse`, 'POST', { version, reason })
export function recordPayrollPayment(id, data, receipt) {
  const body = new FormData()
  body.append('record', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  if (receipt) body.append('receipt', receipt)
  return apiMultipart(`/payroll/drafts/${id}/payments`, 'POST', body)
}
export function attachPayrollReceipt(id, paymentId, version, receipt) {
  const body = new FormData()
  body.append('version', version); body.append('receipt', receipt)
  return apiMultipart(`/payroll/drafts/${id}/payments/${paymentId}/receipt`, 'POST', body)
}
