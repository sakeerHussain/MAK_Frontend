import { useState } from 'react'

export default function FleetUploadField({ title, hint, accept, multiple = false, onFiles, icon = 'image' }) {
  const [dragging, setDragging] = useState(false)
  const receive = (files) => { if (files?.length) onFiles(Array.from(files)) }
  return <label className={`fleet-upload-zone ${dragging ? 'dragging' : ''}`}
    onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
    onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
    onDrop={(event) => { event.preventDefault(); setDragging(false); receive(event.dataTransfer.files) }}>
    <span className="fleet-upload-glyph" aria-hidden="true">{icon === 'image'
      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 3 3 3-4 5 6" /></svg>
      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h8l4 4v14H6z M14 3v5h4 M9 13h6 M9 17h6" /></svg>}</span>
    <strong>{title}</strong>
    <span className="fleet-upload-hint">{hint}</span>
    <span className="fleet-upload-browse">{multiple ? 'Browse images' : 'Browse file'}</span>
    <input className="fleet-upload-input" type="file" aria-label={title} accept={accept} multiple={multiple} onChange={(event) => { receive(event.target.files); event.target.value = '' }} />
  </label>
}
