import { apiRequest, apiMultipart, apiFileUrl } from '../../shared/lib/apiRequest.js'
export function mapMaintenanceJob(job) {
  return { ...job, garage: job.garage || '', notes: job.notes || '', expenseLines: job.expenseLines.map((line) => ({ ...line, receipt: line.receipt ? { ...line.receipt, url: apiFileUrl(line.receipt.url) } : null })) }
}
export async function listMaintenanceJobs() { return (await apiRequest('/maintenance')).map(mapMaintenanceJob) }
export async function saveMaintenanceJob(job) {
  const body = new FormData()
  const record = { ...job, expenseLines: job.expenseLines.map((line) => {
    if (line.receipt?.file) body.append(`receipt-${line.id}`, line.receipt.file)
    return { id: line.id, category: line.category, amount: line.amount, description: line.description, receipt: line.receipt?.id ? { id: line.receipt.id } : null }
  }) }
  body.append('record', new Blob([JSON.stringify(record)], { type: 'application/json' }))
  return mapMaintenanceJob(await apiMultipart(`/maintenance${job.id ? `/${job.id}` : ''}`, job.id ? 'PUT' : 'POST', body))
}
