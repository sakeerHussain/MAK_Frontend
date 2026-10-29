import ActionIcon from '../../shared/components/ResourceIcon.jsx'
import Icon from '../../shared/components/ResourceIcon.jsx'
import AdminPageHeader from '../../app/AdminPageHeader.jsx'
import { ResourceFilters, ResourcePresets, ResourceIndicator, ResourceMenu } from '../../shared/components/ResourceRegister.jsx'
import { useMemo, useState } from 'react'
import { blankDriver, driverCompliance, driverDocumentStatus, driverOptionalWarnings, DRIVER_CATEGORIES, DRIVER_DOCUMENT_TYPES, DRIVER_STATUSES, EMPLOYMENT_TYPES, REQUIRED_DRIVER_DOCUMENTS, EXPIRING_DRIVER_DOCUMENTS } from './DriverData.js'
import { prepareUpload } from '../../shared/lib/upload.js'
import DriverBulkUpload from './DriverBulkUpload.jsx'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { PersonnelChargesFields, PersonnelPersonalFields, PersonnelProfileCards, PersonnelRecordsFields } from '../../shared/components/PersonnelFields.jsx'
import { archiveDriver, createDriver, getDriver, importDrivers as importDriverRows, saveDriverFiles, updateDriver, updateDriverStatus, uploadDriverDocument } from './DriverApi.js'
import './DriverPage.css'

const rate = (value) => `SAR ${Number(value || 0).toFixed(2)}`
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const docStatus = driverDocumentStatus

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
    if (EXPIRING_DRIVER_DOCUMENTS.includes(documentType) && !documentExpiry) { setError('Add an expiry date for Iqama, License, Passport or Contract copies.'); return }
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
    if (documentFile && EXPIRING_DRIVER_DOCUMENTS.includes(documentType) && !documentExpiry) { setError('Add an expiry date for Iqama, License, Passport or Contract copies.'); return }
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
  return <form data-permission-scope={initial ? 'drivers.edit' : 'drivers.create'} className="driver-form" onSubmit={save} noValidate>
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
      <p className="driver-form-help">Choose a document type, expiry date where applicable, and one file. Valid Iqama and License copies with expiry dates make compliance Complete. Iqama, License, Passport and Contract copies need expiry dates. Undated replacements retain known expiry dates. Uploaded expiry dates update the matching profile fields. Booking requires Iqama and License copies valid through the trip end (KSA). Optional records show warnings without blocking booking. Home address Proof can be uploaded here as a separate document.</p>
      <div className="driver-single-document"><div className="driver-document-fields"><label>Document Type<select value={documentType} onChange={(event) => { setDocumentType(event.target.value); setDocumentFile(null); setDocumentExpiry('') }}>{DRIVER_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label><FormFieldCaption required={EXPIRING_DRIVER_DOCUMENTS.includes(documentType)}>Expiry Date</FormFieldCaption><input type="date" required={EXPIRING_DRIVER_DOCUMENTS.includes(documentType)} value={documentExpiry} onChange={(event) => setDocumentExpiry(event.target.value)} /></label></div><UploadZone title="Upload driver document" file={documentFile} onFile={chooseFile} /><button type="button" className="driver-secondary driver-attach-button" onClick={attachDocument} disabled={busy}><ActionIcon name="upload" size={16} /> Attach Document</button></div>
      {form.documents.length > 0 && <div className="driver-attached-list"><strong>Attached documents</strong>{form.documents.map((record) => <div key={record.type}><span className="driver-doc-icon"><Icon name="document" /></span><span><b>{record.type}</b><small>{record.name}{record.expiryDate && ` · Expires ${record.expiryDate}`}</small></span><button type="button" onClick={() => setForm((current) => ({ ...current, documents: current.documents.filter((item) => item.type !== record.type) }))}>Remove</button></div>)}</div>}
    </div>
    <div className="driver-form-section"><h3>Certifications</h3><p className="driver-form-help">Enter the certificate details and optionally attach a file. You can add up to 10 certificates.</p><div className="driver-cert-editor"><div className="driver-cert-fields"><label><FormFieldCaption required>Certificate Name</FormFieldCaption><input required value={certificateName} onChange={(event) => setCertificateName(event.target.value)} placeholder="e.g. Defensive Driving" /></label><label>Issue Date<input type="date" value={certificateIssueDate} onChange={(event) => setCertificateIssueDate(event.target.value)} /></label><label>Expiry Date<input type="date" value={certificateExpiryDate} onChange={(event) => setCertificateExpiryDate(event.target.value)} min={certificateIssueDate || undefined} /></label></div><CertificateUpload file={certificateFile} onFile={chooseCertificate} /><div className="driver-cert-actions">{editingCertificateIndex !== null && <button type="button" className="driver-secondary" onClick={resetCertificate}>Cancel Edit</button>}<button type="button" className="driver-secondary" onClick={attachCertificate} disabled={busy}>{editingCertificateIndex === null ? 'Add Certificate' : 'Update Certificate'}</button></div></div>{form.certifications.length > 0 && <div className="driver-attached-list"><strong>Certifications</strong>{form.certifications.map((record, index) => <div key={`${record.name}-${index}`}><span className="driver-doc-icon"><Icon name="document" /></span><span><b>{record.name}</b><small>{record.issueDate ? `Issued ${record.issueDate}` : 'Issue date not set'}{record.expiryDate && ` · Expires ${record.expiryDate}`}{(record.fileName || record.size) && ` · ${record.fileName || record.name}`}</small></span><button type="button" onClick={() => editCertificate(record, index)}>Edit</button><button type="button" onClick={() => { setForm((current) => ({ ...current, certifications: current.certifications.filter((_, itemIndex) => itemIndex !== index) })); if (editingCertificateIndex === index) resetCertificate() }}>Remove</button></div>)}</div>}</div>
    {error && <p className="driver-form-error" role="alert">{error}</p>}
    <div className="driver-dialog-actions"><button type="button" className="driver-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" className="driver-primary" disabled={busy}><ActionIcon name="check" size={16} /> {busy ? 'Saving…' : initial ? 'Save Changes' : 'Save Driver'}</button></div>
  </form>
}

function DriverProfile({ driver, onBack, onEdit, onStatus, onDocuments }) {
  if (!driver) return <div className="driver-panel driver-not-found"><h2>Driver not found</h2><p>This driver is no longer in the list.</p><button className="admin-button-secondary" type="button" onClick={onBack}><ActionIcon name="back" size={16} /> Back to Drivers</button></div>
  const compliance = driverCompliance(driver)
  const optionalWarnings = driverOptionalWarnings(driver)
  return <div className="driver-profile"><button className="driver-back" type="button" onClick={onBack}><ActionIcon name="left" size={16} /> Back to Drivers</button>
    <div className="driver-panel driver-profile-hero"><span className="driver-avatar large">{driver.photo?.previewUrl ? <img className="personnel-profile-avatar" src={driver.photo.previewUrl} alt={`${driver.name} profile`} /> : initials(driver.name)}</span><div className="driver-profile-identity"><h2>{driver.name}</h2><p>{driver.employeeId} · {driver.category}</p><div className="driver-profile-badges"><span className={`driver-status ${driver.status.toLowerCase()}`}>{driver.status}</span><span className={`driver-compliance ${compliance.toLowerCase()}`}><i />{compliance} compliance</span></div></div><div className="driver-profile-actions"><button type="button" className="driver-primary" onClick={onEdit}><ActionIcon name="edit" /> Edit Driver</button><button type="button" className="driver-secondary" onClick={onStatus}><ActionIcon name="power" size={16} /> {driver.status === 'Active' ? 'Deactivate' : 'Activate'}</button><button type="button" className="driver-secondary" onClick={onDocuments}><ActionIcon name="upload" size={16} /> Upload Documents</button></div></div>
    {optionalWarnings.length > 0 && <aside className="driver-optional-warnings" aria-label="Optional record warnings"><strong>Optional record warnings</strong><p>These records do not affect compliance or booking eligibility.</p><ul>{optionalWarnings.map((warning,index) => <li key={`${warning.type}-${index}`}>{warning.message}</li>)}</ul></aside>}
    <div className="driver-profile-grid"><PersonnelProfileCards record={driver} kind="driver" />
      <section className="driver-panel"><div className="driver-profile-card-title"><div><h3>Compliance Documents</h3><p>Only Iqama and License copy determine compliance and booking eligibility. Other expired records appear as separate warnings.</p></div><button type="button" onClick={onDocuments}>Upload</button></div><div className="driver-profile-docs">{DRIVER_DOCUMENT_TYPES.filter((type) => REQUIRED_DRIVER_DOCUMENTS.includes(type) || (driver.documents || []).some((item) => item.type === type || (type === 'Home address Proof' && item.type === 'Home Address Proof'))).map((type) => { const record = (driver.documents || []).find((item) => item.type === type || (type === 'Home address Proof' && item.type === 'Home Address Proof')); return <div key={type}><span className="driver-doc-icon"><Icon name="document" /></span><div><strong>{type}</strong><small>{record?.url ? <a href={record.url} target="_blank" rel="noreferrer">{record.name}</a> : record?.name || 'No file uploaded'}</small>{record?.expiryDate && <small>Expires {record.expiryDate}</small>}</div><em className={docStatus(record).toLowerCase().replace(' ', '-')}>{record && !record.name ? 'Missing' : docStatus(record)}</em></div> })}</div><div className="driver-profile-certifications"><h3>Certifications</h3>{driver.certifications?.length ? driver.certifications.map((record, index) => <div key={`${record.name}-${index}`}><Icon name="document" /><span><strong>{record.name}</strong><small>{record.issueDate ? `Issued ${record.issueDate}` : 'Issue date not set'}{record.expiryDate && ` · Expires ${record.expiryDate}`}</small>{(record.fileName || record.size) && <small>File: {record.url ? <a href={record.url} target="_blank" rel="noreferrer">{record.fileName || record.name}</a> : record.fileName || record.name}</small>}</span></div>) : <p>No certifications added.</p>}</div><div className="driver-history-note"><strong>Record history</strong><span>{driver.bookingCount} bookings · {driver.paymentCount} payments</span></div></section></div>
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
    if (EXPIRING_DRIVER_DOCUMENTS.includes(documentType) && !documentExpiry) { setDocumentError('Add an expiry date for this required document.'); return }
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
  const showMenu = (event, driver) => { if (menu?.id === driver.id) { setMenu(null); return }; const rect = event.currentTarget.getBoundingClientRect(); setMenu({ id: driver.id, trigger: event.currentTarget, driver, x: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 240)) }) }
  const reset = () => { setQuery(''); setStatusFilter('All statuses'); setCategoryFilter('All categories'); setComplianceFilter('All compliance'); setPage(1); setMenu(null) }
  const counts = { total: drivers.length, active: drivers.filter((item) => item.status === 'Active').length, attention: drivers.filter((item) => driverCompliance(item) !== 'Complete').length }
  const activeFilters = [query.trim(), statusFilter !== 'All statuses', categoryFilter !== 'All categories', complianceFilter !== 'All compliance'].filter(Boolean).length
  const complianceCounts = drivers.reduce((result, driver) => { const value = driverCompliance(driver); result[value] += 1; return result }, { Complete: 0, Missing: 0, Expired: 0 })
  return <div className={`driver-page resource-page ${viewDriverId ? '' : 'resource-register'}`}>
    {(loadError || actionError) && <div className="driver-form-error" role="alert">{loadError || actionError} <button type="button" onClick={() => { setActionError(''); onReload().catch((reason) => setActionError(reason.message)) }}>Retry</button></div>}
    {loading && <p className="driver-form-help" role="status">Loading drivers...</p>}
    {viewDriverId ? loading ? null : <DriverProfile key={viewDriverId} driver={profile} onBack={onBackDrivers} onEdit={() => openDialog('edit', profile)} onStatus={() => toggleStatus(profile)} onDocuments={() => openDialog('documents', profile)} /> : <>
      <div className="resource-heading">
        <AdminPageHeader title="Drivers" description="Manage drivers, rates, and compliance." />
        <div className="admin-page-actions" role="group" aria-label="Driver actions"><div className="admin-page-action-buttons">
          <button type="button" className="driver-secondary" disabled={loading || Boolean(loadError)} onClick={() => openDialog('bulk')}><Icon name="upload" /> Bulk Upload</button>
          <button type="button" className="driver-primary" disabled={loading || Boolean(loadError)} onClick={() => openDialog('add')}><Icon name="plus" /> Add Driver</button>
        </div></div>
      </div>
      <div className="resource-driver-summary" aria-label="Driver overview">
        <div><span className="resource-kpi-icon"><Icon name="users" size={21} /></span><span className="resource-summary-copy"><small>All drivers</small><strong>{counts.total}</strong></span></div>
        <div><span className="resource-kpi-icon green"><Icon name="driver" size={21} /></span><span className="resource-summary-copy"><small>Active drivers</small><strong>{counts.active}</strong></span></div>
        <div><span className="resource-kpi-icon amber"><Icon name="alert" size={21} /></span><span className="resource-summary-copy"><small>Need attention</small><strong>{counts.attention}</strong></span></div>
      </div>
      <ResourcePresets label="Driver compliance shortcuts" value={complianceFilter} onChange={(value) => { setComplianceFilter(value); setPage(1); setMenu(null) }} items={[
        { label: 'All drivers', value: 'All compliance', count: counts.total },
        ...['Complete', 'Missing', 'Expired'].map((value) => ({ label: value, value, count: complianceCounts[value] })),
      ]} />
      <section className="driver-panel driver-list" aria-label="Drivers">
        <ResourceFilters activeCount={activeFilters} onReset={reset} search={<label className="driver-search"><Icon name="search" /><input type="search" placeholder="Search ID, name, phone..." aria-label="Search drivers" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); setMenu(null) }} /></label>}>
          <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); setMenu(null) }}><option>All categories</option>{DRIVER_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); setMenu(null) }}><option>All statuses</option>{DRIVER_STATUSES.map((option) => <option key={option}>{option}</option>)}</select>
          <select aria-label="Filter by compliance" value={complianceFilter} onChange={(event) => { setComplianceFilter(event.target.value); setPage(1); setMenu(null) }}><option>All compliance</option><option>Complete</option><option>Missing</option><option>Expired</option></select>
        </ResourceFilters>
        <p className="resource-scroll-hint">Scroll the table sideways to see all driver details.</p>
        <div className="driver-table-scroll" role="region" aria-label="Driver records" tabIndex={0}>
          <table className="driver-table"><thead><tr>{['Employee ID', 'Name', 'Phone', 'Category', 'Employment Type', 'Daily Rate', 'Status', 'Compliance', 'Actions'].map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead><tbody>
            {visible.map((driver) => { const compliance = driverCompliance(driver); return <tr key={driver.id}>
              <td className="driver-id">{driver.employeeId}</td><td><button className="driver-name-link" type="button" onClick={() => onViewDriver(driver.id)} aria-label={`View profile for ${driver.name}`}><strong>{driver.name}</strong></button></td>
              <td>{driver.phone}</td><td>{driver.category}</td><td>{driver.employmentType}</td><td className="driver-rate">{rate(driver.dailyRate)}<small>/ day</small></td>
              <td><span className={`driver-status ${driver.status.toLowerCase()}`}>{driver.status}</span></td><td><ResourceIndicator value={compliance} /></td>
              <td><button className="driver-more" type="button" aria-label={`More actions for ${driver.name}`} aria-haspopup="menu" aria-expanded={menu?.id === driver.id} onClick={(event) => showMenu(event, driver)}><Icon name="more" size={20} /></button></td>
            </tr> })}
          </tbody></table>
          {!visible.length && !loading && !loadError && <div className="driver-empty"><Icon name={drivers.length ? 'search' : 'users'} size={28} /><strong>{drivers.length ? 'No matching drivers' : 'No drivers added yet'}</strong><p>{drivers.length ? 'Try another search or reset the filters.' : 'Add your first driver or use Bulk Upload to build your team.'}</p>{drivers.length ? <button type="button" onClick={reset}>Reset filters</button> : <button className="resource-empty-add" type="button" onClick={() => openDialog('add')}>Add Driver</button>}</div>}
        </div>
        <div className="driver-pagination"><span aria-live="polite">{filtered.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} drivers` : 'Showing 0 drivers'}</span><div>
          <select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); setMenu(null) }}><option value={8}>8 rows</option><option value={12}>12 rows</option><option value={20}>20 rows</option></select>
          <button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => { setPage(safePage - 1); setMenu(null) }}><Icon name="left" size={16} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => { setPage(safePage + 1); setMenu(null) }}><Icon name="right" size={16} /></button>
        </div></div>
      </section>
      {menu && <ResourceMenu menu={menu} onClose={() => setMenu(null)} label={`Driver actions for ${menu.driver.name}`} className="driver-action-menu">
        <button role="menuitem" type="button" onClick={() => { onViewDriver(menu.driver.id); setMenu(null) }}><Icon name="eye" /> View Profile</button>
        <button role="menuitem" type="button" onClick={() => openDialog('edit', menu.driver)}><Icon name="edit" /> Edit</button>
        <button role="menuitem" type="button" disabled={busy} onClick={() => toggleStatus(menu.driver)}><Icon name="power" /> {menu.driver.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
        <button role="menuitem" type="button" onClick={() => openDialog('documents', menu.driver)}><Icon name="upload" /> Upload Documents</button>
        <div className="driver-menu-separator" role="separator" /><button role="menuitem" type="button" className="danger" onClick={() => requestDelete(menu.driver)}><Icon name="trash" /> Delete</button>
      </ResourceMenu>}
    </>}
    {dialog && <div className="driver-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) closeDialog() }}><div className={`driver-dialog ${dialog === 'add' || dialog === 'edit' || dialog === 'bulk' ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="driver-dialog-title"><div className="driver-dialog-heading"><div><span className="fleet-demo-mark">CONNECTED TO BACKEND</span><h2 id="driver-dialog-title">{({ add: 'Add Driver', edit: 'Edit Driver', bulk: 'Bulk Upload Drivers', documents: 'Upload Documents', delete: 'Delete Driver' })[dialog]}</h2></div><button type="button" aria-label="Close dialog" disabled={busy} onClick={closeDialog}><Icon name="close" size={20} /></button></div>
      {(dialog === 'add' || dialog === 'edit') && <DriverForm key={selected?.id || 'new'} initial={selected} drivers={drivers} onCancel={closeDialog} onSave={saveDriver} />}
      {dialog === 'bulk' && <DriverBulkUpload drivers={drivers} onImport={importDrivers} onCancel={closeDialog} />}
      {dialog === 'documents' && selected && <div className="driver-simple-dialog"><p>Upload a document for <strong>{selected.name}</strong>. The new file replaces any existing file of this type.</p><label>Document Type<select value={documentType} onChange={(event) => { setDocumentType(event.target.value); setDocumentFile(null); setDocumentExpiry(''); setDocumentError('') }}>{DRIVER_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label><FormFieldCaption required={EXPIRING_DRIVER_DOCUMENTS.includes(documentType)}>Expiry Date</FormFieldCaption><input type="date" required={EXPIRING_DRIVER_DOCUMENTS.includes(documentType)} value={documentExpiry} onChange={(event) => setDocumentExpiry(event.target.value)} /></label><UploadZone title={`Upload ${documentType}`} file={documentFile} onFile={chooseDocument} />{documentError && <p className="driver-form-error" role="alert">{documentError}</p>}<div className="driver-dialog-actions"><button type="button" className="driver-secondary" disabled={busy} onClick={closeDialog}>Cancel</button><button type="button" className="driver-primary" onClick={saveDocument} disabled={busy}><ActionIcon name="upload" size={16} /> {busy ? 'Uploading…' : 'Save Document'}</button></div></div>}
      {dialog === 'delete' && selected && <div className="driver-simple-dialog"><p><strong>{selected.name}</strong> · {selected.employeeId}</p>{selected.bookingCount || selected.paymentCount ? <div className="driver-delete-warning">This driver has {selected.bookingCount} bookings and {selected.paymentCount} payments in their history. Keep the record and deactivate the driver instead.</div> : <div className="driver-delete-warning">Remove this driver from the roster? The record will remain archived in the database.</div>}{actionError && <p className="driver-form-error" role="alert">{actionError}</p>}<div className="driver-dialog-actions"><button type="button" className="driver-secondary" disabled={busy} onClick={closeDialog}>Cancel</button>{selected.bookingCount || selected.paymentCount ? selected.status === 'Active' && <button type="button" className="driver-primary" onClick={async () => { if (await toggleStatus(selected)) closeDialog() }}><ActionIcon name="power" size={16} /> Deactivate Driver</button> : <button type="button" className="driver-danger-button" onClick={deleteDriver} disabled={busy}><ActionIcon name="trash" size={16} /> {busy ? 'Removing…' : 'Delete Driver'}</button>}</div></div>}
    </div></div>}
  </div>
}
