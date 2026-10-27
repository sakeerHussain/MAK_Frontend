import { apiFileUrl } from '../../shared/lib/apiRequest.js'

export function vehicleDocumentKind(record) {
  const mime = String(record?.contentType || record?.file?.type || '').split(';')[0].trim().toLowerCase()
  // Stored MIME takes precedence over a misleading filename; extension is for pending/legacy records only.
  if (mime) return mime === 'application/pdf' ? 'pdf' : ['image/png', 'image/jpeg', 'image/webp'].includes(mime) ? 'image' : 'file'
  const name = String(record?.name || '')
  return /\.pdf$/i.test(name) ? 'pdf' : /\.(png|jpe?g|webp)$/i.test(name) ? 'image' : 'file'
}

export function vehicleDocumentLinks(record) {
  // Pending files have not been saved and do not have authenticated server actions yet.
  if (!record?.id || !record.url) return null
  const url = apiFileUrl(record.url)
  return { open: url, download: `${url}${url.includes('?') ? '&' : '?'}download=true` }
}
