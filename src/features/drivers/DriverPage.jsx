import { useMemo, useState } from 'react'
import { blankDriver, driverCompliance, DRIVER_CATEGORIES, DRIVER_DOCUMENT_TYPES, DRIVER_STATUSES, EMPLOYMENT_TYPES, REQUIRED_DRIVER_DOCUMENTS } from './DriverData.js'
import { prepareUpload } from '../../shared/lib/upload.js'
import DriverBulkUpload from './DriverBulkUpload.jsx'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { PersonnelChargesFields, PersonnelPersonalFields, PersonnelProfileCards, PersonnelRecordsFields } from '../../shared/components/PersonnelFields.jsx'
import { archiveDriver, createDriver, getDriver, importDrivers as importDriverRows, saveDriverFiles, updateDriver, updateDriverStatus, uploadDriverDocument } from './DriverApi.js'
import './DriverPage.css'

const paths = {
  plus: 'M12 4v16 M4 12h16', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M17 17l4 4',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01', close: 'M5 5l14 14 M19 5L5 19',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 17v3h16v-3', left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7', edit: 'M4 20l4-.8L20 7l-3-3L5 16z M14.5 6.5l3 3',
  power: 'M12 3v9 M6.3 6.3a8 8 0 1 0 11.4 0', trash: 'M4 7h16 M9 7V4h6v3 M7 7l1 14h8l1-14 M10 11v6 M14 11v6',
  document: 'M6 3h9l4 4v14H6z M15 3v5h4 M9 12h7 M9 16h7',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
}
function Icon({ name, size = 17 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg> }
const rate = (value) => `SAR ${Number(value || 0).toFixed(2)}`
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const docStatus = (record) => !record ? 'Missing' : record.expiryDate && record.expiryDate < new Date().toISOString().slice(0, 10) ? 'Expired' : record.expiryDate ? 'Valid' : 'Expiry needed'

function UploadZone({ title, file, onFile, multiple = false }) {
  return <label className="driver-upload-zone"><Icon name="upload" size={22} /><strong>{title}</strong><span>{file?.name || 'PNG, JPG, WebP, or PDF · max 5 MB per file'}</span><em>{multiple ? 'Browse files' : 'Browse file'}</em><input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" multiple={multiple} aria-label={title} onChange={(event) => { const files = Array.from(event.target.files || []); if (files.length) onFile(multiple ? files : files[0]); event.target.value = '' }} /></label>
}

function CertificateUpload({ file, onFile }) {
  return <label className="driver-cert-upload"><span className="driver-cert-upload-icon"><Icon name="upload" size={18} /></span><span className="driver-cert-upload-copy"><strong>{file?.name || 'Choose certificate file'}</strong><small>Optional · PNG, JPG, WebP, or PDF · max 5 MB</small></span><em>Browse</em><input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" aria-label="Upload certificate file" onChange={(event) => { if (event.target.files?.[0]) onFile(event.target.files[0]); event.target.value = '' }} /></label>
}

function DriverForm({ initial, drivers, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...blankDriver(), ...initial, documents: [...(initial?.documents || [])], certifications: [...(initial?.certifications || [])] }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [documentType, setDocumentType] = useState('Iqama')
  const [documentExpiry, setDocumentExpiry] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [certificateName, setCertificateName] = useState('')
  const [certificateIssueDate, setCertificateIssueDate] = useState('')
  const [certificateExpiryDate, setCertificateExpiryDate] = useState('')
  const [certificateFile, setCertificateFile] = useState(null)
  const [editingCertificateIndex, setEditingCertificateIndex] = useState(null)
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const choosePhoto = async (file) => {
    setError(''); setBusy(true)
    try { setField('photo', { ...(await prepareUpload(file, 'image')), file }) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  const chooseFile = async (file) => {
    setError(''); setBusy(true)
    try { setDocumentFile({ ...(await prepareUpload(file, 'document')), file }) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  const attachDocument = () => {
    setError('')
    if (!documentFile) { setError('Choose a document file before attaching it.'); return }
    if (REQUIRED_DRIVER_DOCUMENTS.includes(documentType) && !documentExpiry) { setError('Add an expiry date for Iqama and License copy.'); return }
    setForm((current) => ({ ...current, documents: [...current.documents.filter((item) => item.type !== documentType), { type: documentType, ...documentFile, expiryDate: documentExpiry }] }))
    setDocumentFile(null); setDocumentExpiry('')
  }
  const chooseCertificate = async (file) => {
    setError(''); setBusy(true)
    try { setCertificateFile({ ...(await prepareUpload(file, 'document')), file }) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  const resetCertificate = () => { setCertificateName(''); setCertificateIssueDate(''); setCertificateExpiryDate(''); setCertificateFile(null); setEditingCertificateIndex(null) }
  const buildCertificate = () => {
    const name = certificateName.trim()
    if (!name) { setError('Enter a certificate name.'); return null }
    if (certificateIssueDate && certificateExpiryDate && certificateExpiryDate < certificateIssueDate) { setError('Certificate expiry date must be on or after the issue date.'); return null }
    if (editingCertificateIndex === null && form.certifications.length >= 10) { setError('Add up to 10 certifications.'); return null }
    const previous = editingCertificateIndex === null ? null : form.certifications[editingCertificateIndex]
    return { id: previous?.id, name, issueDate: certificateIssueDate, expiryDate: certificateExpiryDate, fileName: certificateFile?.name || previous?.fileName || (previous?.size ? previous.name : ''), size: certificateFile?.size ?? previous?.size ?? null, previewUrl: certificateFile?.previewUrl ?? previous?.previewUrl ?? null, file: certificateFile?.file || null }
  }
  const attachCertificate = () => {
    setError('')
    const certificate = buildCertificate()
    if (!certificate) return
    setForm((current) => ({ ...current, certifications: editingCertificateIndex === null ? [...current.certifications, certificate] : current.certifications.map((item, index) => index === editingCertificateIndex ? certificate : item) }))
    resetCertificate()
  }
  const editCertificate = (record, index) => { setCertificateName(record.name || ''); setCertificateIssueDate(record.issueDate || ''); setCertificateExpiryDate(record.expiryDate || ''); setCertificateFile(null); setEditingCertificateIndex(index); setError('') }
  const save = async (event) => {
    event.preventDefault(); setError('')
    const employeeId = form.employeeId.trim().toUpperCase()
    if (!employeeId || !form.name.trim() || !form.phone.trim()) { setError('Employee ID, name, and phone are required.'); return }
    if (drivers.some((driver) => driver.employeeId.toUpperCase() === employeeId && driver.id !== initial?.id)) { setError('This Employee ID already exists.'); return }
    if (!form.designation.trim()) { setError('Enter a designation.'); return }
    if (form.employmentType === 'Vendor' && !form.vendor.trim()) { setError('Enter the vendor name.'); return }
    if (form.dailyRate === '' || !Number.isFinite(Number(form.dailyRate)) || Number(form.dailyRate) < 0) { setError('Enter a valid daily rate.'); return }
    if (['hourlyRate', 'monthlyRate', 'yearsExperience'].some((key) => form[key] !== '' && (!Number.isFinite(Number(form[key])) || Number(form[key]) < 0))) { setError('Enter non-negative charges and years of experience.'); return }
    if (documentFile && REQUIRED_DRIVER_DOCUMENTS.includes(documentType) && !documentExpiry) { setError('Add an expiry date for Iqama and License copy.'); return }
    const documents = documentFile ? [...form.documents.filter((item) => item.type !== documentType), { type: documentType, ...documentFile, expiryDate: documentExpiry }] : form.documents
    const hasPendingCertificate = certificateName.trim() || certificateIssueDate || certificateExpiryDate || certificateFile
    const certificate = hasPendingCertificate ? buildCertificate() : null
    if (hasPendingCertificate && !certificate) return
    const certifications = certificate ? editingCertificateIndex === null ? [...form.certifications, certificate] : form.certifications.map((item, index) => index === editingCertificateIndex ? certificate : item) : form.certifications
    setBusy(true)
    try { await onSave({ ...form, documents, certifications, employeeId, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), designation: form.designation.trim(), homeAddress: form.homeAddress.trim(), vendor: form.employmentType === 'Vendor' ? form.vendor.trim() : '', hourlyRate: form.hourlyRate === '' ? '' : Number(form.hourlyRate), dailyRate: Number(form.dailyRate), monthlyRate: form.monthlyRate === '' ? '' : Number(form.monthlyRate), yearsExperience: form.yearsExperience === '' ? '' : Number(form.yearsExperience) }) }
    catch (reason) { setError(reason.message || 'Could not save this driver.') }
    finally { setBusy(false) }
  }
  return <form className="driver-form" onSubmit={save} noValidate>
    <PersonnelPersonalFields form={form} setField={setField} kind="driver" onPhoto={choosePhoto} onRemovePhoto={() => setField('photo', null)} />
    <div className="driver-form-section"><h3>Category & Employment</h3><div className="driver-form-grid">
      <label>Category<select value={form.category} onChange={(event) => setField('category', event.target.value)}>{DRIVER_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Employment Type<select value={form.employmentType} onChange={(event) => setField('employmentType', event.target.value)}>{EMPLOYMENT_TYPES.map((option) => <option key={option}>{option}</option>)}</select></label>
      {form.employmentType === 'Vendor' && <label><FormFieldCaption required>Vendor</FormFieldCaption><input required value={form.vendor || ''} onChange={(event) => setField('vendor', event.target.value)} placeholder="Vendor name" /></label>}
      <label>Status<select value={form.status} onChange={(event) => setField('status', event.target.value)}>{DRIVER_STATUSES.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Company ID<input value={form.companyId || ''} onChange={(event) => setField('companyId', event.target.value)} placeholder="Company ID" /></label>
      <label>Date of Joining<input type="date" value={form.joinedOn || ''} onChange={(event) => setField('joinedOn', event.target.value)} /></label>
      <label>Official No.<input type="tel" value={form.officialNumber || ''} onChange={(event) => setField('officialNumber', event.target.value)} placeholder="Official contact number" /></label>
    </div></div>
    <PersonnelChargesFields form={form} setField={setField} kind="driver" />
    <PersonnelRecordsFields form={form} setField={setField} />
    <div className="driver-form-section"><h3>Compliance Documents</h3>
      <p className="driver-form-help">Choose a document type, expiry date where applicable, and one file. Iqama and License copy with expiry dates make compliance Complete. Home address Proof can be uploaded here as a separate document.</p>
      <div className="driver-single-document"><div className="driver-document-fields"><label>Document Type<select value={documentType} onChange={(event) => { setDocumentType(event.target.value); setDocumentFile(null); setDocumentExpiry('') }}>{DRIVER_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label><FormFieldCaption required={REQUIRED_DRIVER_DOCUMENTS.includes(documentType)}>Expiry Date</FormFieldCaption><input type="date" required={REQUIRED_DRIVER_DOCUMENTS.includes(documentType)} value={documentExpiry} onChange={(event) => setDocumentExpiry(event.target.value)} /></label></div><UploadZone title="Upload driver document" file={documentFile} onFile={chooseFile} /><button type="button" className="driver-secondary driver-attach-button" onClick={attachDocument} disabled={busy}>Attach Document</button></div>
      {form.documents.length > 0 && <div className="driver-attached-list"><strong>Attached documents</strong>{form.documents.map((record) => <div key={record.type}><span className="driver-doc-icon"><Icon name="document" /></span><span><b>{record.type}</b><small>{record.name}{record.expiryDate && ` · Expires ${record.expiryDate}`}</small></span><button type="button" onClick={() => setForm((current) => ({ ...current, documents: current.documents.filter((item) => item.type !== record.type) }))}>Remove</button></div>)}</div>}
    </div>
    <div className="driver-form-section"><h3>Certifications</h3><p className="driver-form-help">Enter the certificate details and optionally attach a file. You can add up to 10 certificates.</p><div className="driver-cert-editor"><div className="driver-cert-fields"><label><FormFieldCaption required>Certificate Name</FormFieldCaption><input required value={certificateName} onChange={(event) => setCertificateName(event.target.value)} placeholder="e.g. Defensive Driving" /></label><label>Issue Date<input type="date" value={certificateIssueDate} onChange={(event) => setCertificateIssueDate(event.target.value)} /></label><label>Expiry Date<input type="date" value={certificateExpiryDate} onChange={(event) => setCertificateExpiryDate(event.target.value)} min={certificateIssueDate || undefined} /></label></div><CertificateUpload file={certificateFile} onFile={chooseCertificate} /><div className="driver-cert-actions">{editingCertificateIndex !== null && <button type="button" className="driver-secondary" onClick={resetCertificate}>Cancel Edit</button>}<button type="button" className="driver-secondary" onClick={attachCertificate} disabled={busy}>{editingCertificateIndex === null ? 'Add Certificate' : 'Update Certificate'}</button></div></div>{form.certifications.length > 0 && <div className="driver-attached-list"><strong>Certifications</strong>{form.certifications.map((record, index) => <div key={`${record.name}-${index}`}><span className="driver-doc-icon"><Icon name="document" /></span><span><b>{record.name}</b><small>{record.issueDate ? `Issued ${record.issueDate}` : 'Issue date not set'}{record.expiryDate && ` · Expires ${record.expiryDate}`}{(record.fileName || record.size) && ` · ${record.fileName || record.name}`}</small></span><button type="button" onClick={() => editCertificate(record, index)}>Edit</button><button type="button" onClick={() => { setForm((current) => ({ ...current, certifications: current.certifications.filter((_, itemIndex) => itemIndex !== index) })); if (editingCertificateIndex === index) resetCertificate() }}>Remove</button></div>)}</div>}</div>
    {error && <p className="driver-form-error" role="alert">{error}</p>}
    <div className="driver-dialog-actions"><button type="button" className="driver-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" className="driver-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save Changes' : 'Save Driver'}</button></div>
  </form>
}

function DriverProfile({ driver, onBack, onEdit, onStatus, onDocuments }) {
  if (!driver) return <div className="driver-panel driver-not-found"><h2>Driver not found</h2><p>This driver is no longer in the list.</p><button type="button" onClick={onBack}>Back to Drivers</button></div>
  const compliance = driverCompliance(driver)
  return <div className="driver-profile"><button className="driver-back" type="button" onClick={onBack}><Icon name="left" size={16} /> Back to Drivers</button>
    <div className="driver-panel driver-profile-hero"><span className="driver-avatar large">{driver.photo?.previewUrl ? <img className="personnel-profile-avatar" src={driver.photo.previewUrl} alt={`${driver.name} profile`} /> : initials(driver.name)}</span><div className="driver-profile-identity"><span className="driver-kicker">DRIVER PROFILE</span><h2>{driver.name}</h2><p>{driver.employeeId} · {driver.category}</p><div className="driver-profile-badges"><span className={`driver-status ${driver.status.toLowerCase()}`}>{driver.status}</span><span className={`driver-compliance ${compliance.toLowerCase()}`}><i />{compliance} compliance</span></div></div><div className="driver-profile-actions"><button type="button" className="driver-primary" onClick={onEdit}><Icon name="edit" /> Edit Driver</button><button type="button" className="driver-secondary" onClick={onStatus}>{driver.status === 'Active' ? 'Deactivate' : 'Activate'}</button><button type="button" className="driver-secondary" onClick={onDocuments}>Upload Documents</button></div></div>
    <div className="driver-profile-grid"><PersonnelProfileCards record={driver} kind="driver" />
      <section className="driver-panel"><div className="driver-profile-card-title"><div><h3>Compliance Documents</h3><p>Iqama and License copy determine compliance; other documents are optional.</p></div><button type="button" onClick={onDocuments}>Upload</button></div><div className="driver-profile-docs">{DRIVER_DOCUMENT_TYPES.filter((type) => REQUIRED_DRIVER_DOCUMENTS.includes(type) || (driver.documents || []).some((item) => item.type === type || (type === 'Home address Proof' && item.type === 'Home Address Proof'))).map((type) => { const record = (driver.documents || []).find((item) => item.type === type || (type === 'Home address Proof' && item.type === 'Home Address Proof')); return <div key={type}><span className="driver-doc-icon"><Icon name="document" /></span><div><strong>{type}</strong><small>{record?.url ? <a href={record.url} target="_blank" rel="noreferrer">{record.name}</a> : record?.name || 'No file uploaded'}</small>{record?.expiryDate && <small>Expires {record.expiryDate}</small>}</div><em className={docStatus(record).toLowerCase().replace(' ', '-')}>{record && !record.name ? 'Missing' : docStatus(record)}</em></div> })}</div><div className="driver-profile-certifications"><h3>Certifications</h3>{driver.certifications?.length ? driver.certifications.map((record, index) => <div key={`${record.name}-${index}`}><Icon name="document" /><span><strong>{record.name}</strong><small>{record.issueDate ? `Issued ${record.issueDate}` : 'Issue date not set'}{record.expiryDate && ` · Expires ${record.expiryDate}`}</small>{(record.fileName || record.size) && <small>File: {record.url ? <a href={record.url} target="_blank" rel="noreferrer">{record.fileName || record.name}</a> : record.fileName || record.name}</small>}</span></div>) : <p>No certifications added.</p>}</div><div className="driver-history-note"><strong>Record history</strong><span>{driver.bookingCount} bookings · {driver.paymentCount} payments</span></div></section></div>
  </div>
}

export default function DriverPage({ drivers, setDrivers, loading = false, loadError = '', onReload, viewDriverId, onViewDriver, onBackDrivers }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [complianceFilter, setComplianceFilter] = useState('All compliance')
  const [pageSize, setPageSize] = useState(8)
  const [page, setPage] = useState(1)
  const [menu, setMenu] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [selected, setSelected] = useState(null)
  const [documentType, setDocumentType] = useState('Iqama')
  const [documentExpiry, setDocumentExpiry] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [documentError, setDocumentError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const profile = drivers.find((driver) => String(driver.id) === String(viewDriverId))
  const filtered = useMemo(() => drivers.filter((driver) => {
    const match = `${driver.employeeId} ${driver.name} ${driver.phone} ${driver.category}`.toLowerCase().includes(query.trim().toLowerCase())
    return match && (statusFilter === 'All statuses' || driver.status === statusFilter) && (categoryFilter === 'All categories' || driver.category === categoryFilter) && (complianceFilter === 'All compliance' || driverCompliance(driver) === complianceFilter)
  }), [drivers, query, statusFilter, categoryFilter, complianceFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const openDialog = (kind, driver = null) => { setSelected(driver); setDialog(kind); setMenu(null); setActionError(''); setDocumentType('Iqama'); setDocumentExpiry(''); setDocumentFile(null); setDocumentError('') }
  const closeDialog = () => { setDialog(null); setSelected(null); setDocumentFile(null); setDocumentError('') }
  const saveDriver = async (driver) => {
    const saved = dialog === 'add' ? await createDriver(driver) : await updateDriver(selected.id, driver)
    try {
      const complete = await saveDriverFiles(saved.id, driver, selected)
      setDrivers((current) => dialog === 'add' ? [complete, ...current] : current.map((item) => item.id === complete.id ? complete : item))
      if (dialog === 'add') setPage(1)
      closeDialog()
    } catch (reason) {
      const latest = await getDriver(saved.id).catch(() => saved)
      setDrivers((current) => dialog === 'add' ? [latest, ...current.filter((item) => item.id !== latest.id)] : current.map((item) => item.id === latest.id ? latest : item))
      closeDialog()
      setActionError(`Driver details were saved, but an attachment failed: ${reason.message}. Open Edit to retry.`)
    }
  }
  const importDrivers = async (items) => {
    const result = await importDriverRows(items)
    try { await onReload() }
    catch (reason) { setActionError(`Import completed, but the roster could not refresh: ${reason.message}`) }
    reset()
    return result
  }
  const toggleStatus = async (driver) => {
    if (!driver || busy) return
    setBusy(true); setActionError('')
    try {
      const updated = await updateDriverStatus(driver.id, driver.status === 'Active' ? 'Inactive' : 'Active')
      setDrivers((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMenu(null)
      return true
    } catch (reason) { setActionError(reason.message); return false }
    finally { setBusy(false) }
  }
  const chooseDocument = async (file) => { setDocumentError(''); try { setDocumentFile({ ...(await prepareUpload(file, 'document')), file }) } catch (reason) { setDocumentError(reason.message) } }
  const saveDocument = async () => {
    if (!documentFile) { setDocumentError('Choose a document file.'); return }
    if (REQUIRED_DRIVER_DOCUMENTS.includes(documentType) && !documentExpiry) { setDocumentError('Add an expiry date for this required document.'); return }
    setBusy(true); setDocumentError('')
    try {
      await uploadDriverDocument(selected.id, documentType, documentExpiry, documentFile.file)
      const updated = await getDriver(selected.id)
      setDrivers((current) => current.map((item) => item.id === updated.id ? updated : item))
      closeDialog()
    } catch (reason) { setDocumentError(reason.message) }
    finally { setBusy(false) }
  }
  const requestDelete = (driver) => openDialog('delete', driver)
  const deleteDriver = async () => {
    if (!selected || selected.bookingCount || selected.paymentCount || busy) return
    setBusy(true); setActionError('')
    try {
      await archiveDriver(selected.id)
      setDrivers((current) => current.filter((item) => item.id !== selected.id))
      if (viewDriverId === selected.id) onBackDrivers()
      closeDialog()
    } catch (reason) { setActionError(reason.message) }
    finally { setBusy(false) }
  }
  const showMenu = (event, driver) => { if (menu?.id === driver.id) { setMenu(null); return }; const rect = event.currentTarget.getBoundingClientRect(); setMenu({ id: driver.id, driver, x: Math.max(8, Math.min(rect.right - 207, window.innerWidth - 218)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 218)) }) }
  const reset = () => { setQuery(''); setStatusFilter('All statuses'); setCategoryFilter('All categories'); setComplianceFilter('All compliance'); setPage(1) }
  const counts = { total: drivers.length, active: drivers.filter((item) => item.status === 'Active').length, attention: drivers.filter((item) => driverCompliance(item) !== 'Complete').length }
  return <div className="driver-page">
    {(loadError || actionError) && <div className="driver-form-error" role="alert">{loadError || actionError} <button type="button" onClick={() => { setActionError(''); onReload().catch((reason) => setActionError(reason.message)) }}>Retry</button></div>}
    {loading && <p className="driver-form-help" role="status">Loading drivers from the backend…</p>}
    {viewDriverId ? loading ? null : <DriverProfile key={viewDriverId} driver={profile} onBack={onBackDrivers} onEdit={() => openDialog('edit', profile)} onStatus={() => toggleStatus(profile)} onDocuments={() => openDialog('documents', profile)} /> : <>
      <div className="driver-intro"><div><span className="fleet-demo-mark">LIVE DRIVERS</span><p>Driver records are loaded from the backend. Booking and payment history will follow when those APIs are connected.</p></div><div className="driver-title-actions"><button type="button" className="driver-secondary" disabled={loading || Boolean(loadError)} onClick={() => openDialog('bulk')}><Icon name="upload" /> Bulk Upload</button><button type="button" className="driver-primary" disabled={loading || Boolean(loadError)} onClick={() => openDialog('add')}><Icon name="plus" /> Add Driver</button></div></div>
      <section className="driver-panel driver-list" aria-labelledby="driver-list-title"><div className="driver-list-heading"><div><h2 id="driver-list-title">All Drivers <span>{counts.total}</span></h2><p>Manage your driver roster, rates, and compliance.</p></div><div className="driver-mini-stats"><span><i className="active" />{counts.active} active</span><span><i className="attention" />{counts.attention} need attention</span></div></div>
        <div className="driver-toolbar"><label className="driver-search"><Icon name="search" /><input type="search" placeholder="Search ID, name, phone..." aria-label="Search drivers" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label><select aria-label="Filter by category" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1) }}><option>All categories</option>{DRIVER_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}><option>All statuses</option>{DRIVER_STATUSES.map((option) => <option key={option}>{option}</option>)}</select><select aria-label="Filter by compliance" value={complianceFilter} onChange={(event) => { setComplianceFilter(event.target.value); setPage(1) }}><option>All compliance</option><option>Complete</option><option>Missing</option><option>Expired</option></select><select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={8}>8 rows</option><option value={12}>12 rows</option><option value={20}>20 rows</option></select></div>
        <div className="driver-table-scroll"><table className="driver-table"><thead><tr><th>Employee ID</th><th>Name</th><th>Phone</th><th>Category</th><th>Employment Type</th><th>Daily Rate</th><th>Status</th><th>Compliance</th><th>Actions</th></tr></thead><tbody>{visible.map((driver) => { const compliance = driverCompliance(driver); return <tr key={driver.id}><td className="driver-id">{driver.employeeId}</td><td><button className="driver-name-link" type="button" onClick={() => onViewDriver(driver.id)} aria-label={`View profile for ${driver.name}`}><span className="driver-avatar">{initials(driver.name)}</span><strong>{driver.name}</strong></button></td><td>{driver.phone}</td><td>{driver.category}</td><td>{driver.employmentType}</td><td className="driver-rate">{rate(driver.dailyRate)} <small>/ day</small></td><td><span className={`driver-status ${driver.status.toLowerCase()}`}>{driver.status}</span></td><td><span className={`driver-compliance ${compliance.toLowerCase()}`}><i />{compliance}</span></td><td><button className="driver-more" type="button" aria-label={`More actions for ${driver.name}`} aria-expanded={menu?.id === driver.id} onClick={(event) => showMenu(event, driver)}><Icon name="more" size={20} /></button></td></tr> })}</tbody></table>{!visible.length && !loading && !loadError && <div className="driver-empty"><strong>No drivers found</strong><p>Try another search or clear the filters.</p><button type="button" onClick={reset}>Clear filters</button></div>}</div>
        <div className="driver-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} drivers` : 'Showing 0 drivers'}</span><div><button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="left" size={15} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="right" size={15} /></button></div></div>
      </section>
      {menu && <><button className="driver-menu-backdrop" type="button" aria-label="Close driver actions" onClick={() => setMenu(null)} /><div className="driver-action-menu" role="menu" style={{ left: menu.x, top: menu.y }}><button role="menuitem" type="button" onClick={() => { onViewDriver(menu.driver.id); setMenu(null) }}><Icon name="eye" /> View Profile</button><button role="menuitem" type="button" onClick={() => openDialog('edit', menu.driver)}><Icon name="edit" /> Edit</button><button role="menuitem" type="button" onClick={() => toggleStatus(menu.driver)}><Icon name="power" /> {menu.driver.status === 'Active' ? 'Deactivate' : 'Activate'}</button><button role="menuitem" type="button" onClick={() => openDialog('documents', menu.driver)}><Icon name="upload" /> Upload Documents</button><div className="driver-menu-separator" /><button role="menuitem" type="button" className="danger" onClick={() => requestDelete(menu.driver)}><Icon name="trash" /> Delete</button></div></>}
    </>}
    {dialog && <div className="driver-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) closeDialog() }}><div className={`driver-dialog ${dialog === 'add' || dialog === 'edit' || dialog === 'bulk' ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="driver-dialog-title"><div className="driver-dialog-heading"><div><span className="fleet-demo-mark">CONNECTED TO BACKEND</span><h2 id="driver-dialog-title">{({ add: 'Add Driver', edit: 'Edit Driver', bulk: 'Bulk Upload Drivers', documents: 'Upload Documents', delete: 'Delete Driver' })[dialog]}</h2></div><button type="button" aria-label="Close dialog" disabled={busy} onClick={closeDialog}><Icon name="close" size={20} /></button></div>
      {(dialog === 'add' || dialog === 'edit') && <DriverForm key={selected?.id || 'new'} initial={selected} drivers={drivers} onCancel={closeDialog} onSave={saveDriver} />}
      {dialog === 'bulk' && <DriverBulkUpload drivers={drivers} onImport={importDrivers} onCancel={closeDialog} />}
      {dialog === 'documents' && selected && <div className="driver-simple-dialog"><p>Upload a document for <strong>{selected.name}</strong>. The new file replaces any existing file of this type.</p><label>Document Type<select value={documentType} onChange={(event) => { setDocumentType(event.target.value); setDocumentFile(null); setDocumentExpiry(''); setDocumentError('') }}>{DRIVER_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label><FormFieldCaption required={REQUIRED_DRIVER_DOCUMENTS.includes(documentType)}>Expiry Date</FormFieldCaption><input type="date" required={REQUIRED_DRIVER_DOCUMENTS.includes(documentType)} value={documentExpiry} onChange={(event) => setDocumentExpiry(event.target.value)} /></label><UploadZone title={`Upload ${documentType}`} file={documentFile} onFile={chooseDocument} />{documentError && <p className="driver-form-error" role="alert">{documentError}</p>}<div className="driver-dialog-actions"><button type="button" className="driver-secondary" disabled={busy} onClick={closeDialog}>Cancel</button><button type="button" className="driver-primary" onClick={saveDocument} disabled={busy}>{busy ? 'Uploading…' : 'Save Document'}</button></div></div>}
      {dialog === 'delete' && selected && <div className="driver-simple-dialog"><p><strong>{selected.name}</strong> · {selected.employeeId}</p>{selected.bookingCount || selected.paymentCount ? <div className="driver-delete-warning">This driver has {selected.bookingCount} bookings and {selected.paymentCount} payments in their history. Keep the record and deactivate the driver instead.</div> : <div className="driver-delete-warning">Remove this driver from the roster? The record will remain archived in the database.</div>}{actionError && <p className="driver-form-error" role="alert">{actionError}</p>}<div className="driver-dialog-actions"><button type="button" className="driver-secondary" disabled={busy} onClick={closeDialog}>Cancel</button>{selected.bookingCount || selected.paymentCount ? selected.status === 'Active' && <button type="button" className="driver-primary" onClick={async () => { if (await toggleStatus(selected)) closeDialog() }}>Deactivate Driver</button> : <button type="button" className="driver-danger-button" onClick={deleteDriver} disabled={busy}>{busy ? 'Removing…' : 'Delete Driver'}</button>}</div></div>}
    </div></div>}
  </div>
}
