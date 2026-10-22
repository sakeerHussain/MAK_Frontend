import ActionIcon from '../../app/ActionIcon.jsx'
import { saveEmployeeRecord, listEmployees, archiveEmployee, importEmployees as importEmployeeRecords, updateEmployeeStatus } from './EmployeeApi.js'
import { useMemo, useState } from 'react'
import { blankEmployee, employeeDocumentsStatus, EMPLOYEE_CATEGORIES, EMPLOYEE_DEPARTMENTS, EMPLOYEE_DOCUMENT_TYPES, EMPLOYEE_STATUSES, EMPLOYEE_TYPES } from './EmployeeData.js'
import { prepareUpload } from '../../shared/lib/upload.js'
import EmployeeBulkUpload from './EmployeeBulkUpload.jsx'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { PersonnelChargesFields, PersonnelPersonalFields, PersonnelProfileCards, PersonnelRecordsFields } from '../../shared/components/PersonnelFields.jsx'
import '../drivers/DriverPage.css'
import './EmployeePage.css'

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
const salary = (value) => `SAR ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const docStatus = (record) => !record ? 'Missing' : record.expiryDate && record.expiryDate < new Date().toISOString().slice(0, 10) ? 'Expired' : 'Valid'

function UploadZone({ title, file, onFile }) {
  return <label className="driver-upload-zone"><Icon name="upload" size={22} /><strong>{title}</strong><span>{file?.name || 'PNG, JPG, WebP, or PDF · max 5 MB per file'}</span><em>Browse file</em><input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" aria-label={title} onChange={(event) => { if (event.target.files?.[0]) onFile(event.target.files[0]); event.target.value = '' }} /></label>
}

function EmployeeForm({ initial, employees, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...blankEmployee(), ...initial, documents: [...(initial?.documents || [])] }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [documentType, setDocumentType] = useState('Contract copy')
  const [documentExpiry, setDocumentExpiry] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const choosePhoto = async (file) => {
    setError(''); setBusy(true)
    try { setField('photo', { ...await prepareUpload(file, 'image'), file }) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  const chooseFile = async (file) => {
    setError(''); setBusy(true)
    try { setDocumentFile({ ...await prepareUpload(file, 'document'), file }) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  const attachDocument = () => {
    setError('')
    if (!documentFile) { setError('Choose a document file before attaching it.'); return }
    setForm((current) => ({ ...current, documents: [...current.documents.filter((item) => item.type !== documentType), { type: documentType, ...documentFile, expiryDate: documentExpiry }] }))
    setDocumentFile(null); setDocumentExpiry('')
  }
  const save = async (event) => {
    event.preventDefault(); setError('')
    const employeeId = form.employeeId.trim().toUpperCase()
    if (!employeeId || !form.name.trim() || !form.phone.trim() || !form.jobTitle.trim()) { setError('Employee ID, name, phone, and job title are required.'); return }
    if (employees.some((employee) => employee.employeeId.toUpperCase() === employeeId && employee.id !== initial?.id)) { setError('This Employee ID already exists.'); return }
    if (form.employmentType === 'Vendor' && !form.vendor.trim()) { setError('Enter the vendor name.'); return }
    if (form.monthlySalary === '' || !Number.isFinite(Number(form.monthlySalary)) || Number(form.monthlySalary) < 0) { setError('Enter a valid monthly salary.'); return }
    if (['hourlyRate', 'dailyRate', 'yearsExperience'].some((key) => form[key] !== '' && (!Number.isFinite(Number(form[key])) || Number(form[key]) < 0))) { setError('Enter non-negative charges and years of experience.'); return }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Enter a valid email address.'); return }
    const documents = documentFile ? [...form.documents.filter((item) => item.type !== documentType), { type: documentType, ...documentFile, expiryDate: documentExpiry }] : form.documents
    setBusy(true)
    try {
      await onSave({ ...form, documents, employeeId, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), jobTitle: form.jobTitle.trim(), homeAddress: form.homeAddress.trim(), vendor: form.employmentType === 'Vendor' ? form.vendor.trim() : '', manager: form.manager.trim(), hourlyRate: form.hourlyRate === '' ? '' : Number(form.hourlyRate), dailyRate: form.dailyRate === '' ? '' : Number(form.dailyRate), monthlySalary: Number(form.monthlySalary), yearsExperience: form.yearsExperience === '' ? '' : Number(form.yearsExperience) })
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <form className="driver-form" onSubmit={save} noValidate>
    <PersonnelPersonalFields form={form} setField={setField} kind="employee" onPhoto={choosePhoto} onRemovePhoto={() => setField('photo', null)} />
    <div className="driver-form-section"><h3>Category & Employment</h3><div className="driver-form-grid">
      <label>Category<select value={form.category} onChange={(event) => setField('category', event.target.value)}>{EMPLOYEE_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label><FormFieldCaption required>Department</FormFieldCaption><select required value={form.department} onChange={(event) => setField('department', event.target.value)}>{EMPLOYEE_DEPARTMENTS.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Employment Type<select value={form.employmentType} onChange={(event) => setField('employmentType', event.target.value)}>{EMPLOYEE_TYPES.map((option) => <option key={option}>{option}</option>)}</select></label>
      {form.employmentType === 'Vendor' && <label><FormFieldCaption required>Vendor</FormFieldCaption><input required value={form.vendor || ''} onChange={(event) => setField('vendor', event.target.value)} placeholder="Vendor name" /></label>}
      <label>Status<select value={form.status} onChange={(event) => setField('status', event.target.value)}>{EMPLOYEE_STATUSES.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Company ID<input value={form.companyId || ''} onChange={(event) => setField('companyId', event.target.value)} placeholder="Company ID" /></label>
      <label>Date of Joining<input type="date" value={form.joinedOn || ''} onChange={(event) => setField('joinedOn', event.target.value)} /></label>
      <label>Official No.<input type="tel" value={form.officialNumber || ''} onChange={(event) => setField('officialNumber', event.target.value)} placeholder="Official contact number" /></label>
      <label>Manager<input value={form.manager} onChange={(event) => setField('manager', event.target.value)} placeholder="Manager name" /></label>
    </div></div>
    <PersonnelChargesFields form={form} setField={setField} kind="employee" />
    <PersonnelRecordsFields form={form} setField={setField} />
    <div className="driver-form-section"><h3>Employee Documents</h3><p className="driver-form-help">Attach a document type and optional expiry date. A contract copy marks documents Complete; Home address Proof can be uploaded separately. Any expired document marks them Expired.</p>
      <div className="driver-single-document"><div className="driver-document-fields"><label>Document Type<select value={documentType} onChange={(event) => { setDocumentType(event.target.value); setDocumentFile(null); setDocumentExpiry('') }}>{EMPLOYEE_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label>Expiry Date<input type="date" value={documentExpiry} onChange={(event) => setDocumentExpiry(event.target.value)} /></label></div><UploadZone title="Upload employee document" file={documentFile} onFile={chooseFile} /><button type="button" className="driver-secondary driver-attach-button" onClick={attachDocument} disabled={busy}><ActionIcon name="upload" size={16} /> Attach Document</button></div>
      {form.documents.length > 0 && <div className="driver-attached-list"><strong>Attached documents</strong>{form.documents.map((record) => <div key={record.type}><span className="driver-doc-icon"><Icon name="document" /></span><span><b>{record.type}</b><small>{record.name}{record.expiryDate && ` · Expires ${record.expiryDate}`}</small></span><button type="button" onClick={() => setForm((current) => ({ ...current, documents: current.documents.filter((item) => item.type !== record.type) }))}>Remove</button></div>)}</div>}
    </div>
    {error && <p className="driver-form-error" role="alert">{error}</p>}
    <div className="driver-dialog-actions"><button type="button" className="driver-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="driver-primary" disabled={busy}><ActionIcon name="check" size={16} /> {initial ? 'Save Changes' : 'Save Employee'}</button></div>
  </form>
}

function EmployeeProfile({ employee, onBack, onEdit, onStatus, onDocuments }) {
  if (!employee) return <div className="driver-panel driver-not-found"><h2>Employee not found</h2><p>This employee record is no longer available.</p><button className="admin-button-secondary" type="button" onClick={onBack}><ActionIcon name="back" size={16} /> Back to Employees</button></div>
  const documentsStatus = employeeDocumentsStatus(employee)
  return <div className="driver-profile"><button className="driver-back" type="button" onClick={onBack}><ActionIcon name="left" size={16} /> Back to Employees</button>
    <div className="driver-panel driver-profile-hero"><span className="driver-avatar large">{employee.photo?.previewUrl ? <img className="personnel-profile-avatar" src={employee.photo.previewUrl} alt={`${employee.name} profile`} /> : initials(employee.name)}</span><div className="driver-profile-identity"><h2>{employee.name}</h2><p>{employee.employeeId} · {employee.jobTitle}</p><div className="driver-profile-badges"><span className={`driver-status ${employee.status.toLowerCase()}`}>{employee.status}</span><span className={`driver-compliance ${documentsStatus.toLowerCase()}`}><i />{documentsStatus} documents</span></div></div><div className="driver-profile-actions"><button type="button" className="driver-primary" onClick={onEdit}><ActionIcon name="edit" /> Edit Employee</button><button type="button" className="driver-secondary" onClick={onStatus}><ActionIcon name="power" size={16} /> {employee.status === 'Active' ? 'Deactivate' : 'Activate'}</button><button type="button" className="driver-secondary" onClick={onDocuments}><ActionIcon name="upload" size={16} /> Upload Documents</button></div></div>
    <div className="driver-profile-grid"><PersonnelProfileCards record={employee} kind="employee" />
      <section className="driver-panel"><div className="driver-profile-card-title"><div><h3>Employee Documents</h3><p>A contract copy determines document status; other documents are optional.</p></div><button type="button" onClick={onDocuments}>Upload</button></div><div className="driver-profile-docs">{EMPLOYEE_DOCUMENT_TYPES.filter((type) => type === 'Contract copy' || (employee.documents || []).some((item) => item.type === type || (type === 'Home address Proof' && item.type === 'Home Address Proof'))).map((type) => { const record = (employee.documents || []).find((item) => item.type === type || (type === 'Home address Proof' && item.type === 'Home Address Proof')); return <div key={type}><span className="driver-doc-icon"><Icon name="document" /></span><div><strong>{type}</strong><small>{record?.url ? <a href={record.url} target="_blank" rel="noopener noreferrer">{record.name}</a> : record?.name || 'No file uploaded'}</small>{record?.expiryDate && <small>Expires {record.expiryDate}</small>}</div><em className={docStatus(record).toLowerCase()}>{docStatus(record)}</em></div> })}</div><div className="driver-history-note"><strong>Payroll history</strong><span>{employee.payrollCount || 0} payroll records</span></div></section></div>
  </div>
}

export default function EmployeePage({ employees, setEmployees, loading, loadError, onReload, viewEmployeeId, onViewEmployee, onBackEmployees }) {
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [departmentFilter, setDepartmentFilter] = useState('All departments')
  const [documentsFilter, setDocumentsFilter] = useState('All documents')
  const [pageSize, setPageSize] = useState(8)
  const [page, setPage] = useState(1)
  const [menu, setMenu] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [selected, setSelected] = useState(null)
  const [documentType, setDocumentType] = useState('Contract copy')
  const [documentExpiry, setDocumentExpiry] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [documentError, setDocumentError] = useState('')
  const profile = employees.find((employee) => String(employee.id) === String(viewEmployeeId))
  const filtered = useMemo(() => employees.filter((employee) => {
    const match = `${employee.employeeId} ${employee.name} ${employee.phone} ${employee.department} ${employee.jobTitle}`.toLowerCase().includes(query.trim().toLowerCase())
    return match && (statusFilter === 'All statuses' || employee.status === statusFilter) && (departmentFilter === 'All departments' || employee.department === departmentFilter) && (documentsFilter === 'All documents' || employeeDocumentsStatus(employee) === documentsFilter)
  }), [employees, query, statusFilter, departmentFilter, documentsFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const openDialog = (kind, employee = null) => { setSelected(employee); setDialog(kind); setMenu(null); setDocumentType('Contract copy'); setDocumentExpiry(''); setDocumentFile(null); setDocumentError('') }
  const closeDialog = () => { setDialog(null); setSelected(null); setDocumentFile(null); setDocumentError('') }
  const replaceEmployee = (saved) => setEmployees((current) => current.some((employee) => employee.id === saved.id) ? current.map((employee) => employee.id === saved.id ? saved : employee) : [saved, ...current])
  const saveEmployee = async (employee) => {
    const saved = await saveEmployeeRecord(employee)
    replaceEmployee(saved); setPage(1); closeDialog()
  }
  const importEmployees = async (items) => {
    const result = await importEmployeeRecords(items)
    try { setEmployees(await listEmployees()) }
    catch (failure) {
      const created = result.rows.filter((row) => !row.error).map((row) => ({ ...items[row.rowNumber - 2], id: row.id }))
      setEmployees((current) => [...created, ...current]); setActionError(`Import saved. Refresh failed: ${failure.message}`)
    }
    reset(); return result
  }
  const toggleStatus = async (employee) => {
    setSaving(true); setActionError('')
    try { replaceEmployee(await updateEmployeeStatus(employee.id, employee.status === 'Active' ? 'Inactive' : 'Active')); setMenu(null) }
    catch (failure) { setActionError(failure.message) }
    finally { setSaving(false) }
  }
  const chooseDocument = async (file) => { setDocumentError(''); try { setDocumentFile({ ...await prepareUpload(file, 'document'), file }) } catch (reason) { setDocumentError(reason.message) } }
  const saveDocument = async () => {
    if (!documentFile) { setDocumentError('Choose a document file.'); return }
    setSaving(true)
    try {
      replaceEmployee(await saveEmployeeRecord({ ...selected, documents: [...selected.documents.filter((record) => record.type !== documentType), { type: documentType, ...documentFile, expiryDate: documentExpiry }] }))
      closeDialog()
    } catch (failure) { setDocumentError(failure.message) }
    finally { setSaving(false) }
  }
  const deleteEmployee = async () => {
    if (selected.payrollCount) return
    setSaving(true); setActionError('')
    try { await archiveEmployee(selected.id); setEmployees((current) => current.filter((item) => item.id !== selected.id)); closeDialog(); if (String(viewEmployeeId) === String(selected.id)) onBackEmployees() }
    catch (failure) { setActionError(failure.message) }
    finally { setSaving(false) }
  }
  const showMenu = (event, employee) => { if (menu?.id === employee.id) { setMenu(null); return }; const rect = event.currentTarget.getBoundingClientRect(); setMenu({ id: employee.id, employee, x: Math.max(8, Math.min(rect.right - 207, window.innerWidth - 218)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 218)) }) }
  const reset = () => { setQuery(''); setStatusFilter('All statuses'); setDepartmentFilter('All departments'); setDocumentsFilter('All documents'); setPage(1) }
  const counts = { total: employees.length, active: employees.filter((item) => item.status === 'Active').length, attention: employees.filter((item) => employeeDocumentsStatus(item) !== 'Complete').length }
  if (loading || loadError) return <section className="driver-panel"><h2>{loading ? 'Loading employees...' : 'Unable to load employees'}</h2>{loadError && <p className="driver-form-error" role="alert">{loadError}</p>}{!loading && <button type="button" className="driver-primary" onClick={onReload}><ActionIcon name="reset" size={16} /> Retry</button>}</section>
  return <div className="driver-page employee-page">
    {actionError && <p className="driver-form-error" role="alert">{actionError}</p>}
    {viewEmployeeId ? <EmployeeProfile key={viewEmployeeId} employee={profile} onBack={onBackEmployees} onEdit={() => openDialog('edit', profile)} onStatus={() => toggleStatus(profile)} onDocuments={() => openDialog('documents', profile)} /> : <>
      <div className="admin-page-actions" role="group" aria-label="Employee actions"><div className="admin-page-action-buttons"><button type="button" className="driver-secondary" onClick={() => openDialog('bulk')}><ActionIcon name="upload" /> Bulk Upload</button><button type="button" className="driver-primary" onClick={() => openDialog('add')}><ActionIcon name="plus" /> Add Employee</button></div></div>
      <section className="driver-panel driver-list" aria-labelledby="employee-list-title"><div className="driver-list-heading"><div><h2 id="employee-list-title">All Employees <span>{counts.total}</span></h2></div><div className="driver-mini-stats"><span><i className="active" />{counts.active} active</span><span><i className="attention" />{counts.attention} need attention</span></div></div>
        <div className="driver-toolbar"><label className="driver-search"><Icon name="search" /><input type="search" placeholder="Search ID, name, title..." aria-label="Search employees" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label><select aria-label="Filter by department" value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setPage(1) }}><option>All departments</option>{EMPLOYEE_DEPARTMENTS.map((option) => <option key={option}>{option}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}><option>All statuses</option>{EMPLOYEE_STATUSES.map((option) => <option key={option}>{option}</option>)}</select><select aria-label="Filter by documents" value={documentsFilter} onChange={(event) => { setDocumentsFilter(event.target.value); setPage(1) }}><option>All documents</option><option>Complete</option><option>Missing</option><option>Expired</option></select><select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={8}>8 rows</option><option value={12}>12 rows</option><option value={20}>20 rows</option></select></div>
        <div className="driver-table-scroll"><table className="driver-table"><thead><tr><th>Employee ID</th><th>Name</th><th>Phone</th><th>Department</th><th>Job Title</th><th>Monthly Salary</th><th>Status</th><th>Documents</th><th>Actions</th></tr></thead><tbody>{visible.map((employee) => { const documentsStatus = employeeDocumentsStatus(employee); return <tr key={employee.id}><td className="driver-id">{employee.employeeId}</td><td><button className="driver-name-link" type="button" onClick={() => onViewEmployee(employee.id)} aria-label={`View profile for ${employee.name}`}><span className="driver-avatar">{initials(employee.name)}</span><strong>{employee.name}</strong></button></td><td>{employee.phone}</td><td>{employee.department}</td><td title={employee.jobTitle}>{employee.jobTitle}</td><td className="driver-rate">{salary(employee.monthlySalary)} <small>/ month</small></td><td><span className={`driver-status ${employee.status.toLowerCase()}`}>{employee.status}</span></td><td><span className={`driver-compliance ${documentsStatus.toLowerCase()}`}><i />{documentsStatus}</span></td><td><button className="driver-more" type="button" aria-label={`More actions for ${employee.name}`} aria-expanded={menu?.id === employee.id} onClick={(event) => showMenu(event, employee)}><ActionIcon name="more" size={20} /></button></td></tr> })}</tbody></table>{!visible.length && <div className="driver-empty"><strong>No employees found</strong><p>Try another search or clear the filters.</p><button type="button" onClick={reset}>Clear filters</button></div>}</div>
        <div className="driver-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} employees` : 'Showing 0 employees'}</span><div><button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="left" size={15} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="right" size={15} /></button></div></div>
      </section>
      {menu && <><button className="driver-menu-backdrop" type="button" aria-label="Close employee actions" onClick={() => setMenu(null)} /><div className="driver-action-menu" role="menu" style={{ left: menu.x, top: menu.y }}><button role="menuitem" type="button" onClick={() => { onViewEmployee(menu.employee.id); setMenu(null) }}><ActionIcon name="eye" /> View Profile</button><button role="menuitem" type="button" onClick={() => openDialog('edit', menu.employee)}><ActionIcon name="edit" /> Edit</button><button role="menuitem" type="button" onClick={() => toggleStatus(menu.employee)}><ActionIcon name="power" /> {menu.employee.status === 'Active' ? 'Deactivate' : 'Activate'}</button><button role="menuitem" type="button" onClick={() => openDialog('documents', menu.employee)}><ActionIcon name="upload" /> Upload Documents</button><div className="driver-menu-separator" /><button role="menuitem" type="button" className="danger" onClick={() => openDialog('delete', menu.employee)}><ActionIcon name="trash" /> Delete</button></div></>}
    </>}
    {dialog && <div className="driver-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className={`driver-dialog ${dialog === 'add' || dialog === 'edit' || dialog === 'bulk' ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title"><div className="driver-dialog-heading"><div><span className="fleet-demo-mark">EMPLOYEE RECORDS</span><h2 id="employee-dialog-title">{({ add: 'Add Employee', edit: 'Edit Employee', bulk: 'Bulk Upload Employees', documents: 'Upload Documents', delete: 'Delete Employee' })[dialog]}</h2></div><button type="button" aria-label="Close dialog" onClick={closeDialog}><Icon name="close" size={20} /></button></div>
      {(dialog === 'add' || dialog === 'edit') && <EmployeeForm key={selected?.id || 'new'} initial={selected} employees={employees} onCancel={closeDialog} onSave={saveEmployee} />}
      {dialog === 'bulk' && <EmployeeBulkUpload employees={employees} onImport={importEmployees} onCancel={closeDialog} />}
      {dialog === 'documents' && selected && <div className="driver-simple-dialog"><p>Upload a document for <strong>{selected.name}</strong>. The new file replaces any existing file of this type.</p><label>Document Type<select value={documentType} onChange={(event) => { setDocumentType(event.target.value); setDocumentFile(null); setDocumentExpiry(''); setDocumentError('') }}>{EMPLOYEE_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label>Expiry Date<input type="date" value={documentExpiry} onChange={(event) => setDocumentExpiry(event.target.value)} /></label><UploadZone title={`Upload ${documentType}`} file={documentFile} onFile={chooseDocument} />{documentError && <p className="driver-form-error" role="alert">{documentError}</p>}<div className="driver-dialog-actions"><button type="button" className="driver-secondary" onClick={closeDialog}>Cancel</button><button type="button" className="driver-primary" disabled={saving} onClick={saveDocument}><ActionIcon name="upload" size={16} /> Save Document</button></div></div>}
      {dialog === 'delete' && selected && <div className="driver-simple-dialog">{actionError && <p className="driver-form-error" role="alert">{actionError}</p>}<p><strong>{selected.name}</strong> · {selected.employeeId}</p>{selected.payrollCount ? <div className="driver-delete-warning">This employee has {selected.payrollCount} payroll records. Keep the record and deactivate the employee instead.</div> : <div className="driver-delete-warning">Remove this employee from the active list? Records with payroll history must be deactivated instead.</div>}<div className="driver-dialog-actions"><button type="button" className="driver-secondary" onClick={closeDialog}>Cancel</button>{selected.payrollCount ? selected.status === 'Active' && <button type="button" className="driver-primary" disabled={saving} onClick={async () => { await toggleStatus(selected); closeDialog() }}><ActionIcon name="power" size={16} /> Deactivate Employee</button> : <button type="button" className="driver-danger-button" disabled={saving} onClick={deleteEmployee}><ActionIcon name="trash" size={16} /> Delete Employee</button>}</div></div>}
    </div></div>}
  </div>
}
