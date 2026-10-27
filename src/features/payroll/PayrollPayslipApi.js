import { downloadApiFile } from '../../shared/lib/apiRequest.js'

export function downloadPayrollPayslip(record) {
  if (!record?.id || !record.approvalId) return Promise.reject(new Error('Approve payroll before downloading its payslip.'))
  return downloadApiFile(`/payroll/drafts/${record.id}/payslip`, `MAK-payslip-${record.period}-${record.id}.pdf`)
}
