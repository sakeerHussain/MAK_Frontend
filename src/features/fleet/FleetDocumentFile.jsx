import { useState } from 'react'
import { IconDownload, IconExternalLink } from '@tabler/icons-react'
import { vehicleDocumentKind, vehicleDocumentLinks } from './FleetDocuments.js'
import './FleetDocumentFile.css'

export function FleetDocumentThumbnail({ record, label }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const kind = vehicleDocumentKind(record)
  if (kind === 'image' && record.previewUrl && failedUrl !== record.previewUrl) {
    return <img className="fleet-file-thumbnail" src={record.previewUrl} alt={`${label} document preview`} onError={() => setFailedUrl(record.previewUrl)} />
  }
  const caption = kind === 'pdf' ? 'PDF' : kind === 'image' ? 'Image' : 'File'
  return <span className="fleet-file-badge" role="img" aria-label={`${label} ${caption} document${failedUrl ? ' — thumbnail unavailable' : ''}`}>{caption}</span>
}

export function FleetDocumentLinks({ record, label }) {
  const links = vehicleDocumentLinks(record)
  if (!links) return null
  return <span className="fleet-file-links">
    <a href={links.open} target="_blank" rel="noopener noreferrer" data-permission="fleet.read" aria-label={`Open ${label} document (new tab)`}><IconExternalLink size={14} aria-hidden="true" />Open<span className="fleet-file-sr-only"> in new tab</span></a>
    <a href={links.download} download={record.name} data-permission="fleet.read" aria-label={`Download ${label} document`}><IconDownload size={14} aria-hidden="true" />Download</a>
  </span>
}
