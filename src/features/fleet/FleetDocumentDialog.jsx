import { DOCUMENT_TYPES } from './FleetData.js'
import FleetUploadField from './FleetUploadField.jsx'

export default function FleetDocumentDialog({ vehicle, documentType, setDocumentType, expiryDate, setExpiryDate, documentFile, setDocumentFile, documentError, chooseDocument, onCancel, onSave, busy = false }) {
  return <div className="fleet-simple-dialog fleet-document-dialog">
    <p>Attach an Istimara, Insurance, Fahas, or Others document for <strong>{vehicle.registration}</strong>. Images and PDFs are accepted. The indicator is Complete when Istimara, Insurance, and Fahas are present and unexpired.</p>
    <div className="fleet-form-grid"><label>Document Type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label>Expiry Date (if applicable)<input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></label></div>
    <div className="fleet-document-picker"><FleetUploadField title="Choose document image or PDF" hint="Drag a file here or browse your device · PNG, JPG, WebP, PDF · 5 MB max" accept=".png,.jpg,.jpeg,.webp,.pdf" onFiles={chooseDocument} icon="document" /></div>
    {documentFile && <div className="fleet-document-selected">{documentFile.previewUrl ? <img src={documentFile.previewUrl} alt="Selected document preview" /> : <span className="fleet-document-file-icon">PDF</span>}<span><strong>{documentFile.name}</strong><small>Ready to attach as {documentType}</small></span><button type="button" onClick={() => setDocumentFile(null)}>Remove</button></div>}
    {documentError && <p className="fleet-form-error" role="alert">{documentError}</p>}
    <div className="fleet-dialog-actions"><button type="button" className="fleet-secondary-button" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="fleet-primary-button" disabled={!documentFile || busy} onClick={onSave}>{busy ? 'Uploading…' : 'Attach Document'}</button></div>
  </div>
}
