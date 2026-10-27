export function ksaToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = key => parts.find(p => p.type === key).value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export const payrollDate = value => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Riyadh' }).format(new Date(`${value}T12:00:00+03:00`)) : '—'
export const payrollInstant = value => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }).format(new Date(value)) + ' KSA' : '—'
export function settlementSummary(records) {
  const sum = (key, predicate = () => true) => records.filter(predicate).reduce((total, r) => total + Math.round(Number(r[key] || 0) * 100), 0) / 100
  return { approvedNet: sum('approvedNetCash', r => Boolean(r.approvalId)), paid: sum('paid'), outstanding: sum('outstanding', r => Boolean(r.approvalId)), drafts: records.filter(r => !r.approvalId).length }
}
export function receiptError(file) {
  if (!file) return ''
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) return 'Choose a non-empty receipt up to 5 MB.'
  if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'Choose a PDF, PNG, JPG or WebP receipt.'
  return ''
}
