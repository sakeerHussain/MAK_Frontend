export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

export function detailDocument(title, reference, sections) {
  const content = sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><table>${section.rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? '—')}</td></tr>`).join('')}</table></section>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} ${escapeHtml(reference)}</title><style>body{max-width:840px;margin:40px auto;padding:0 25px;font:14px/1.5 Arial,sans-serif;color:#354052}header{display:flex;justify-content:space-between;gap:16px;padding-bottom:22px;border-bottom:3px solid #7b70ef}h1{margin:0;font-size:27px}h2{margin:24px 0 8px;font-size:15px;color:#4d5a70}small{color:#8491a2}table{width:100%;border-collapse:collapse}th,td{padding:9px 8px;border-bottom:1px solid #e9edf3;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}th{width:32%;color:#8491a2;font-weight:600}footer{margin:34px 0;color:#8794a5;font-size:11px}@media print{body{margin:15px auto}section{break-inside:avoid}}</style></head><body><header><div><small>RENTAL ADMIN</small><h1>${escapeHtml(title)}</h1><strong>${escapeHtml(reference)}</strong></div><small>Exported ${escapeHtml(new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date()))}<br>Currency: SAR</small></header>${content}<footer>Booking details from a frontend preview. This is not an invoice. Open this file in a browser to print or save it as a PDF.</footer></body></html>`
}

export function downloadHtml(filename, html) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const safeCsvCell = (value) => {
  const text = String(value ?? '')
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}
export const rowsToCsv = (headers, rows) => [headers, ...rows].map((row) => row.map(safeCsvCell).join(',')).join('\r\n')
