import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import { vehicleFormValues, CUSTODIANS, DOCUMENT_TYPES, FUEL_OPTIONS, STATUS_OPTIONS, TRANSMISSION_OPTIONS, TYPE_OPTIONS, documentStatus } from './FleetData.js'
import { prepareUpload } from '../../shared/lib/upload.js'
import FleetUploadField from './FleetUploadField.jsx'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'

const schedule = [
  ['Service', 'serviceIntervalKm', 'lastServiceKm'],
  ['Oil', 'oilIntervalKm', 'lastOilKm'],
  ['Tyre', 'tyreIntervalKm', 'lastTyreKm'],
  ['Brake', 'brakeIntervalKm', 'lastBrakeKm'],
]
const numericFields = ['year', 'seats', 'hourlyRate', 'dailyRate', 'monthlyRate', 'currentOdometerKm', ...schedule.flatMap((item) => item.slice(1))]

export default function FleetCarForm({ initial, vehicles, vendors = [], maintenanceLocked = false, fromImportDraft = false, onSaveImportDraft, onCancel, onSave }) {
  const [form, setForm] = useState(() => vehicleFormValues(initial, fromImportDraft))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [documentDraft, setDocumentDraft] = useState({ type: 'Istimara', expiryDate: '', file: null })
  const vendorChoices = [...new Set([...vendors.filter((vendor) => vendor.status === 'Active').map((vendor) => vendor.name), form.vendor].filter(Boolean))]
  const set = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setError('') }
  const addCarImages = async (files) => {
    setUploadError(null)
    if ((form.carImages || []).length + files.length > 8) { setUploadError({ section: 'images', message: 'Add up to 8 car images.' }); return }
    try {
      const images = await Promise.all(files.map(async (file) => ({ ...(await prepareUpload(file, 'image')), file })))
      setForm((current) => ({ ...current, carImages: [...(current.carImages || []), ...images] }))
    } catch (reason) { setUploadError({ section: 'images', message: reason.message }) }
  }
  const chooseDocument = async (files) => {
    setUploadError(null)
    try {
      const file = { ...(await prepareUpload(files[0], 'document')), file: files[0] }
      setDocumentDraft((current) => ({ ...current, file }))
    } catch (reason) { setUploadError({ section: 'documents', message: reason.message }) }
  }
  const addDocument = () => {
    if (!documentDraft.file) return
    if (documentDraft.type !== 'Others' && !documentDraft.expiryDate) { setUploadError({ section: 'documents', message: 'Enter an expiry date for this document.' }); return }
    setForm((current) => ({ ...current, documentRecords: [...(current.documentRecords || []).filter((item) => item.type !== documentDraft.type), { type: documentDraft.type, ...documentDraft.file, expiryDate: documentDraft.expiryDate }] }))
    setDocumentDraft({ type: 'Istimara', expiryDate: '', file: null })
  }
  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    const registration = form.registration.trim().toUpperCase()
    const vehicleId = form.vehicleId.trim().toUpperCase()
    if (vehicles.some((item) => item.id !== initial?.id && item.registration?.trim().toUpperCase() === registration)) { setError('Registration number already exists.'); return }
    if (vehicles.some((item) => item.id !== initial?.id && item.vehicleId?.trim().toUpperCase() === vehicleId)) { setError('Vehicle ID already exists.'); return }
    if (form.ownership === 'Vendor' && !form.vendor) { setError('Select a vendor for vendor-owned cars.'); return }
    if (schedule.some(([, interval]) => form[interval] !== '' && Number(form[interval]) <= 0)) { setError('Maintenance intervals must be greater than zero.'); return }
    if (schedule.some(([, interval]) => form[interval] !== '') && form.currentOdometerKm === '') { setError('Enter the current odometer to calculate maintenance due.'); return }
    if (schedule.some(([, interval, last]) => form[interval] && form[last] === '')) { setError('Enter the last odometer reading for every maintenance interval.'); return }
    if (schedule.some(([, , last]) => form[last] !== '' && Number(form[last]) > Number(form.currentOdometerKm))) { setError('A last maintenance reading cannot exceed the current odometer.'); return }
    const car = { ...form, registration, vehicleId, make: form.make.trim(), model: form.model.trim(), chassisNo: String(form.chassisNo || '').trim(), vendor: form.ownership === 'Vendor' ? form.vendor : '', owner: form.ownership === 'Vendor' ? form.vendor : form.ownership === 'Leased' ? 'Leased Fleet' : 'Company Fleet', featureTags: form.featureTags.split(',').map((tag) => tag.trim()).filter(Boolean) }
    numericFields.forEach((name) => { car[name] = form[name] === '' ? null : Number(form[name]) })
    car.rate = car.dailyRate || car.hourlyRate || car.monthlyRate || 0
    car.documents = documentStatus({ ...car, documents: undefined })
    setSaving(true); setError('')
    try { await onSave(car) }
    catch (reason) { setError(reason.message || 'Could not save this vehicle.') }
    finally { setSaving(false) }
  }
  const saveImportDraft = async () => {
    if (saving) return
    setSaving(true); setError('')
    try { await onSaveImportDraft(form) }
    catch (reason) { setError(reason.message || 'Could not save this import draft.') }
    finally { setSaving(false) }
  }
  const input = (label, name, options = {}) => <label key={name}><FormFieldCaption required={Boolean(options.required)}>{label}</FormFieldCaption><input value={form[name] ?? ''} onChange={(event) => set(name, event.target.value)} {...options} /></label>
  const number = (label, name, options = {}) => input(label, name, { type: 'number', min: '0', step: '1', ...options })
  const select = (label, name, options, required = false) => <label key={name}><FormFieldCaption required={required}>{label}</FormFieldCaption><select required={required} disabled={name === 'status' && maintenanceLocked} value={form[name] || ''} onChange={(event) => set(name, event.target.value)}>{!form[name] && <option value="">Select {label.toLowerCase()}</option>}{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>{name === 'status' && maintenanceLocked && <small>Complete or cancel open maintenance jobs before changing vehicle status.</small>}</label>
  const check = (label, name) => <label className="fleet-check" key={name}><input type="checkbox" checked={Boolean(form[name])} onChange={(event) => set(name, event.target.checked)} /><span>{label}</span></label>
  return <form data-permission-scope={fromImportDraft ? 'fleet.create' : initial ? 'fleet.edit' : 'fleet.create'} className="fleet-form fleet-car-form" onSubmit={save}>
    <section className="fleet-form-section"><h3>Basic Details</h3><div className="fleet-form-grid">
      {input('Make', 'make', { required: true, placeholder: 'Toyota' })}
      {input('Model', 'model', { required: true, placeholder: 'Camry' })}
      {input('Registration Number', 'registration', { required: true, placeholder: 'RNT-1421' })}
      {number('Year of Registration', 'year', { required: true, min: '1980', max: String(new Date().getFullYear() + 1) })}
      {input('Color', 'color', { placeholder: 'Silver' })}
      {input('Vehicle ID', 'vehicleId', { required: true, placeholder: 'VH-1421' })}
      {input('Door No.', 'doorNo', { placeholder: 'D-24' })}
      {input('Chassis No.', 'chassisNo', { placeholder: 'VIN or chassis number' })}
    </div></section>
    {!fromImportDraft && <section className="fleet-form-section"><h3>Car Images <span>{(form.carImages || []).length} / 8</span></h3>
      <p className="fleet-form-help">Add clear exterior and interior photos. PNG, JPG, or WebP, up to 5 MB each.</p>
      {(form.carImages || []).length > 0 && <div className="fleet-image-grid">{form.carImages.map((image, index) => <div className="fleet-image-tile" key={`${image.name}-${index}`}><img src={image.previewUrl} alt={`Car photo ${index + 1}: ${image.name}`} /><button type="button" aria-label={`Remove car image ${image.name}`} onClick={() => setForm((current) => ({ ...current, carImages: current.carImages.filter((_, itemIndex) => itemIndex !== index) }))}>×</button><span>{image.name}</span></div>)}</div>}
      <FleetUploadField title="Add car images" hint="Drag images here or browse your device" accept=".png,.jpg,.jpeg,.webp" multiple onFiles={addCarImages} />
      {uploadError?.section === 'images' && <p className="fleet-form-error" role="alert">{uploadError.message}</p>}
    </section>}
    <section className="fleet-form-section"><h3>Classifications</h3><div className="fleet-form-grid">
      {select('Type', 'type', TYPE_OPTIONS, true)}
      {number('Seats', 'seats', { required: true, min: '1', max: '60' })}
      {select('Transmission', 'transmission', TRANSMISSION_OPTIONS, true)}
      {select('Fuel Type', 'fuelType', FUEL_OPTIONS, true)}
      <label className="fleet-field-wide">Feature Tags<input value={form.featureTags} onChange={(event) => set('featureTags', event.target.value)} placeholder="GPS, Bluetooth, Child seat" /><small>Separate tags with commas.</small></label>
    </div></section>
    <section className="fleet-form-section"><h3>Rates <span>{form.rateCurrency}</span></h3><p className="fleet-form-help">Currency changes do not convert amounts. Enter the agreed rates in the selected currency.</p><div className="fleet-form-grid fleet-rate-grid">{select('Rate Currency', 'rateCurrency', [...new Set(['SAR', form.rateCurrency].filter(Boolean))])}
      {number(`Hourly Rate (${form.rateCurrency} / hour)`, 'hourlyRate', { step: '0.01', placeholder: '12.00' })}
      {number(`Daily Rate (${form.rateCurrency} / day)`, 'dailyRate', { step: '0.01', required: true, placeholder: '72.00' })}
      {number(`Monthly Rate (${form.rateCurrency} / month)`, 'monthlyRate', { step: '0.01', placeholder: '1800.00' })}
    </div></section>
    <section className="fleet-form-section"><h3>Ownership & Availability</h3><div className="fleet-form-grid">
      {select('Ownership', 'ownership', ['Owned', 'Leased', 'Vendor'], true)}
      {form.ownership === 'Vendor' && select('Vendor', 'vendor', ['', ...vendorChoices], true)}
      {select('Status', 'status', STATUS_OPTIONS)}
      {select('Custodian', 'custodian', CUSTODIANS)}
    </div><div className="fleet-checks">{fromImportDraft ? <label>On-site?<select required value={form.onSite == null ? '' : form.onSite ? 'Yes' : 'No'} onChange={event => set('onSite', event.target.value === '' ? null : event.target.value === 'Yes')}><option value="">Confirm on-site status</option><option>Yes</option><option>No</option></select></label> : check('On-site?', 'onSite')}</div></section>
    <section className="fleet-form-section"><h3>Booking & Visibility</h3><div className="fleet-checks">{check('Listed for Booking', 'listedForBooking')}{check('Show on Public Site', 'showOnPublicSite')}</div></section>
    <section className="fleet-form-section"><h3>Maintenance Schedule</h3><div className="fleet-form-grid">{number('Current Odometer (km)', 'currentOdometerKm', { placeholder: '30000' })}</div>
      <div className="fleet-schedule"><div className="fleet-schedule-head"><span>Item</span><span>Interval (km)</span><span>Last reading (km)</span><span>Next due</span></div>
        {schedule.map(([label, interval, last]) => {
          const next = form[interval] !== '' && form[last] !== '' ? Number(form[interval]) + Number(form[last]) : null
          const remaining = next === null || form.currentOdometerKm === '' ? null : next - Number(form.currentOdometerKm)
          return <div className="fleet-schedule-row" key={label}><strong>{label}</strong><input aria-label={`${label} interval (km)`} type="number" min="0" value={form[interval] ?? ''} onChange={(event) => set(interval, event.target.value)} /><input aria-label={`${label} last reading (km)`} type="number" min="0" value={form[last] ?? ''} onChange={(event) => set(last, event.target.value)} /><span className={remaining !== null && remaining <= 0 ? 'fleet-due' : ''}>{next === null ? '—' : `${next.toLocaleString()} km`}{remaining !== null && <small>{remaining <= 0 ? `Due / overdue ${Math.abs(remaining).toLocaleString()} km` : `${remaining.toLocaleString()} km remaining`}</small>}</span></div>
        })}</div>
    </section>
    <section className="fleet-form-section"><h3>Compliance expiry dates</h3><p className="fleet-form-help">Record dates from the vehicle register even when files are not yet available. An attached document's expiry date takes priority. Current Istimara, Insurance and Fahas files are still required for handover.</p><div className="fleet-form-grid">
      {input('Registration Expiry Date (Istimara)', 'registrationExpiryDate', { type: 'date' })}
      {input('Insurance Expiry Date', 'insuranceExpiryDate', { type: 'date' })}
      {input('Inspection Expiry Date (Fahas)', 'inspectionExpiryDate', { type: 'date' })}
    </div></section>
    {!fromImportDraft && <section className="fleet-form-section"><h3>Documents</h3><p className="fleet-form-help">Istimara, Insurance, and Fahas are needed for a Complete indicator and require expiry dates. Add images or PDFs; attached files are saved to the backend.</p>
      {(form.documentRecords || []).length > 0 && <ul className="fleet-document-list">{form.documentRecords.map((record) => <li key={record.type}><span className="fleet-document-item">{record.previewUrl ? <img src={record.previewUrl} alt={`${record.type} preview`} /> : <span className="fleet-document-file-icon">PDF</span>}<span><strong>{record.type}</strong><small>{record.name}{record.expiryDate && ` · Expires ${record.expiryDate}`}</small></span></span><button type="button" onClick={() => setForm((current) => ({ ...current, documentRecords: current.documentRecords.filter((item) => item.type !== record.type), documents: undefined }))}>Remove</button></li>)}</ul>}
      <div className="fleet-form-grid"><label>Document Type<select value={documentDraft.type} onChange={(event) => setDocumentDraft({ ...documentDraft, type: event.target.value })}>{DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label>Expiry Date (if applicable)<input type="date" value={documentDraft.expiryDate} onChange={(event) => setDocumentDraft({ ...documentDraft, expiryDate: event.target.value })} /></label></div>
      <div className="fleet-document-picker"><FleetUploadField title="Choose document image or PDF" hint="Drag a file here or browse your device · PNG, JPG, WebP, PDF · 5 MB max" accept=".png,.jpg,.jpeg,.webp,.pdf" onFiles={chooseDocument} icon="document" /></div>
      {documentDraft.file && <div className="fleet-document-selected">{documentDraft.file.previewUrl ? <img src={documentDraft.file.previewUrl} alt="Selected document preview" /> : <span className="fleet-document-file-icon">PDF</span>}<span><strong>{documentDraft.file.name}</strong><small>Ready to attach as {documentDraft.type}</small></span><button type="button" onClick={() => setDocumentDraft((current) => ({ ...current, file: null }))}>Remove</button></div>}
      <button className="fleet-secondary-button fleet-attach-button" type="button" disabled={!documentDraft.file} onClick={addDocument}><ActionIcon name="upload" size={16} /> Attach document</button>
      {uploadError?.section === 'documents' && <p className="fleet-form-error" role="alert">{uploadError.message}</p>}
    </section>}
    {error && <p className="fleet-form-error" role="alert">{error}</p>}
    <p className="fleet-form-note">{fromImportDraft ? 'Import drafts stay unavailable for booking. Adding to Fleet requires all mandatory details; upload document files afterwards.' : 'Saving this form updates the database and uploads attached files.'}</p>
    <div className="fleet-dialog-actions"><button type="button" className="fleet-secondary-button" disabled={saving} onClick={onCancel}>Cancel</button><>{fromImportDraft && <button type="button" className="fleet-secondary-button" data-permission="fleet.edit" disabled={saving} onClick={saveImportDraft}>{saving ? 'Saving…' : 'Save draft'}</button>}<button type="submit" className="fleet-primary-button" disabled={saving}><ActionIcon name="check" size={16} /> {saving ? 'Saving…' : fromImportDraft ? 'Complete & add to Fleet' : 'Save Car'}</button></></div>
  </form>
}
