import { useMemo, useState } from 'react'
import { STATUS_OPTIONS, DOCUMENT_OPTIONS, TYPE_OPTIONS, documentStatus, vehicleOwner } from './FleetData.js'
import FleetCarForm from './FleetCarForm.jsx'
import FleetBulkUpload from './FleetBulkUpload.jsx'
import FleetDocumentDialog from './FleetDocumentDialog.jsx'
import VehicleDetailsPage from './VehicleDetailsPage.jsx'
import { prepareUpload } from '../../shared/lib/upload.js'
import { createVehicle, getVehicle, importVehicles, saveVehicleFiles, updateVehicle, updateVehicleStatus, uploadVehicleDocument } from './FleetApi.js'
import './FleetPage.css'

const PAGE_SIZES = [8, 12, 20]
const PERIODS = ['Last 7 days', 'Last 30 days', 'This month']
const paths = {
  fleet: 'M3 7h11v9H3z M14 10h4l3 3v3h-7z M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M18 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  check: 'M5 12l5 5L20 7', key: 'M15 8a5 5 0 1 0-9 3l-3 3v3h3v3h3l5-5a5 5 0 0 0 1-7z M17 8h.01',
  wrench: 'M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-3 2-3-3z',
  gauge: 'M4 18a9 9 0 1 1 16 0 M12 14l4-5 M6 18h12',
  plus: 'M12 4v16 M4 12h16', more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  edit: 'M4 20l4-.8L20 7l-3-3L5 16z M14.5 6.5l3 3',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 17v3h16v-3',
  swap: 'M4 7h15 M15 3l4 4-4 4 M20 17H5 M9 13l-4 4 4 4',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M17 17l4 4',
  close: 'M5 5l14 14 M19 5L5 19', left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7',
  filter: 'M4 7h16 M7 12h10 M10 17h4', document: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h4',
}
function Icon({ name, size = 19 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
const statusClass = (status) => status.toLowerCase().replaceAll(' ', '-')
const formatRate = (car) => `${car.rateCurrency || 'USD'} ${Number(car.dailyRate ?? car.rate ?? 0).toFixed(2)}`

export default function FleetPage({ vehicles, setVehicles, vendors = [], loading = false, loadError = '', onReload, viewVehicleId, onViewVehicle, onBackFleet }) {
  const [period, setPeriod] = useState('Last 7 days')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [documentFilter, setDocumentFilter] = useState('All documents')
  const [siteFilter, setSiteFilter] = useState('Any location')
  const [pageSize, setPageSize] = useState(8)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [pendingStatus, setPendingStatus] = useState('Available')
  const [documentFile, setDocumentFile] = useState(null)
  const [documentType, setDocumentType] = useState('Istimara')
  const [documentError, setDocumentError] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [menu, setMenu] = useState(null)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  const counts = useMemo(() => ({
    total: vehicles.length,
    available: vehicles.filter((car) => car.status === 'Available').length,
    inUse: vehicles.filter((car) => car.status === 'In Use').length,
    maintenance: vehicles.filter((car) => car.status === 'Under Maintenance').length,
  }), [vehicles])
  const filtered = useMemo(() => vehicles.filter((car) => {
    const text = `${car.registration} ${car.vehicleId || ''} ${car.make} ${car.model} ${car.year} ${vehicleOwner(car)} ${car.type}`.toLowerCase()
    return (!query.trim() || text.includes(query.trim().toLowerCase()))
      && (statusFilter === 'All statuses' || car.status === statusFilter)
      && (typeFilter === 'All types' || car.type === typeFilter)
      && (documentFilter === 'All documents' || documentStatus(car) === documentFilter)
      && (siteFilter === 'Any location' || car.onSite === (siteFilter === 'On-site'))
  }), [vehicles, query, statusFilter, typeFilter, documentFilter, siteFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const updateFilter = (setter, value) => { setter(value); setPage(1); setMenu(null) }
  const resetFilters = () => { setQuery(''); setStatusFilter('All statuses'); setTypeFilter('All types'); setDocumentFilter('All documents'); setSiteFilter('Any location'); setPage(1); setMenu(null) }
  const chooseCard = (status) => { setStatusFilter(status); setPage(1); document.getElementById('fleet-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const openDialog = (kind, car = null) => {
    setSelected(car); setDialog(kind); setMenu(null); setActionError('')
    if (kind === 'status') setPendingStatus(car.status)
    if (kind === 'documents') { setDocumentFile(null); setDocumentType('Istimara'); setExpiryDate(''); setDocumentError('') }
  }
  const closeDialog = () => { setDialog(null); setSelected(null); setDocumentFile(null) }
  const saveCar = async (car) => {
    const saved = dialog === 'add' ? await createVehicle(car) : await updateVehicle(selected.id, car)
    try {
      const complete = await saveVehicleFiles(saved.id, car, selected)
      setVehicles((current) => dialog === 'add' ? [complete, ...current] : current.map((item) => item.id === complete.id ? complete : item))
      if (dialog === 'add') resetFilters()
      closeDialog()
    } catch (error) {
      const latest = await getVehicle(saved.id).catch(() => saved)
      setVehicles((current) => dialog === 'add' ? [latest, ...current.filter((item) => item.id !== latest.id)] : current.map((item) => item.id === latest.id ? latest : item))
      closeDialog()
      setActionError(`Vehicle details were saved, but a file operation failed: ${error.message}. Open Edit Car to retry the file.`)
    }
  }
  const importCars = async (cars) => {
    const result = await importVehicles(cars)
    try { await onReload() }
    catch (error) { setActionError(`Import completed, but the Fleet list could not refresh: ${error.message}`) }
    resetFilters()
    return result
  }
  const saveStatus = async () => {
    if (!selected || busy) return
    setBusy(true); setActionError('')
    try {
      const updated = await updateVehicleStatus(selected.id, pendingStatus)
      setVehicles((current) => current.map((item) => item.id === updated.id ? updated : item))
      closeDialog()
    } catch (error) { setActionError(error.message) }
    finally { setBusy(false) }
  }
  const saveDocument = async () => {
    if (!documentFile?.file || !selected || busy) return
    if (documentType !== 'Others' && !expiryDate) { setDocumentError('Expiry date is required for this document type.'); return }
    setBusy(true); setDocumentError('')
    try {
      await uploadVehicleDocument(selected.id, documentType, expiryDate, documentFile.file)
      const updated = await getVehicle(selected.id)
      setVehicles((current) => current.map((item) => item.id === updated.id ? updated : item))
      closeDialog()
    } catch (error) { setDocumentError(error.message) }
    finally { setBusy(false) }
  }
  const chooseDocument = async (files) => {
    setDocumentError('')
    try { setDocumentFile({ ...(await prepareUpload(files[0], 'document')), file: files[0] }) }
    catch (reason) { setDocumentError(reason.message) }
  }
  const openMenu = (event, car) => {
    if (menu?.id === car.id) { setMenu(null); return }
    const rect = event.currentTarget.getBoundingClientRect()
    setMenu({ id: car.id, x: Math.max(8, Math.min(rect.right - 190, window.innerWidth - 202)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 165)), car })
  }
  const kpis = [
    { label: 'Total Vehicles', value: counts.total, icon: 'fleet', color: 'blue', foot: 'Overall fleet size', filter: 'All statuses' },
    { label: 'Available Vehicles', value: counts.available, icon: 'check', color: 'green', foot: 'Ready for assignment', filter: 'Available' },
    { label: 'Vehicles in Use', value: counts.inUse, icon: 'key', color: 'purple', foot: 'Assigned or on a trip', filter: 'In Use' },
    { label: 'Under Maintenance', value: counts.maintenance, icon: 'wrench', color: 'amber', foot: 'Servicing or repairs', filter: 'Under Maintenance' },
    { label: 'Fleet Utilization', value: '—', icon: 'gauge', color: 'cyan', foot: 'Requires booking hours API' },
  ]
  const detailVehicle = vehicles.find((car) => String(car.id) === String(viewVehicleId))
  return <div className="fleet-page">
    {viewVehicleId ? <VehicleDetailsPage key={viewVehicleId} car={detailVehicle} onBack={onBackFleet} onEdit={() => openDialog('edit', detailVehicle)} onUploadDocuments={() => openDialog('documents', detailVehicle)} onUpdateStatus={() => openDialog('status', detailVehicle)} /> : <>
    <div className="fleet-intro"><div><span className="fleet-demo-mark">LIVE FLEET</span><p>Vehicle records are loaded from the backend. Utilization will be available when booking hours are connected.</p></div><label className="fleet-period">Period <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Fleet utilization period" disabled>{PERIODS.map((option) => <option key={option}>{option}</option>)}</select></label></div>
    {(loadError || actionError) && <div className="fleet-form-error" role="alert">{loadError || actionError} <button type="button" onClick={() => { setActionError(''); onReload().catch((error) => setActionError(error.message)) }}>Retry</button></div>}
    {loading && <p className="fleet-form-help" role="status">Loading vehicles from the backend…</p>}
    <div className="fleet-kpis">{kpis.map((kpi) => <button className={`fleet-kpi ${kpi.filter ? 'clickable' : ''}`} type="button" key={kpi.label} onClick={kpi.filter ? () => chooseCard(kpi.filter) : undefined} disabled={!kpi.filter} aria-label={`${kpi.label}: ${kpi.value}${kpi.filter ? '. Filter fleet list' : ''}`}><div className="fleet-kpi-top"><span>{kpi.label}</span><Icon name="right" size={15} /></div><div className="fleet-kpi-main"><span className={`fleet-kpi-icon ${kpi.color}`}><Icon name={kpi.icon} size={22} /></span><strong>{kpi.value}</strong></div><div className="fleet-kpi-foot"><i className={`fleet-dot ${kpi.color}`} />{kpi.foot}</div></button>)}</div>
    <section className="fleet-table-panel" id="fleet-list" aria-labelledby="fleet-table-title">
      <div className="fleet-table-titlebar"><div><h2 id="fleet-table-title">All vehicles</h2><p>Browse and manage vehicles in your fleet</p></div><div className="fleet-title-actions"><button className="fleet-secondary-button" type="button" disabled={loading || Boolean(loadError)} onClick={() => openDialog('bulk')}><Icon name="upload" size={16} /> Bulk Upload</button><button className="fleet-add-button" type="button" disabled={loading || Boolean(loadError)} onClick={() => openDialog('add')}><Icon name="plus" size={17} /> Add Car</button></div></div>
      <div className="fleet-toolbar"><label className="fleet-search"><Icon name="search" size={17} /><input type="search" placeholder="Search reg no., vehicle ID, model..." aria-label="Search vehicles" value={query} onChange={(event) => updateFilter(setQuery, event.target.value)} /></label><span className="fleet-filter-label"><Icon name="filter" size={16} /> Filter by:</span><select aria-label="Filter by type" value={typeFilter} onChange={(event) => updateFilter(setTypeFilter, event.target.value)}><option>All types</option>{TYPE_OPTIONS.map((type) => <option key={type}>{type}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)}><option>All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select><select aria-label="Filter by documents" value={documentFilter} onChange={(event) => updateFilter(setDocumentFilter, event.target.value)}><option>All documents</option>{DOCUMENT_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select><select aria-label="Filter by on-site status" value={siteFilter} onChange={(event) => updateFilter(setSiteFilter, event.target.value)}><option>Any location</option><option>On-site</option><option>Off-site</option></select><select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size} rows</option>)}</select></div>
      {(query || statusFilter !== 'All statuses' || typeFilter !== 'All types' || documentFilter !== 'All documents' || siteFilter !== 'Any location') && <div className="fleet-filter-summary"><span>{filtered.length} matching vehicles</span><button type="button" onClick={resetFilters}>Clear filters</button></div>}
      <div className="fleet-table-scroll"><table className="fleet-table"><thead><tr><th scope="col">Reg No.</th><th scope="col">Make / Model / Year</th><th scope="col">Type</th><th scope="col">Owner</th><th scope="col">Price / Rate</th><th scope="col">Status</th><th scope="col">On-site?</th><th scope="col">Documents</th><th scope="col">Actions</th></tr></thead><tbody>{visible.map((car) => { const docs = documentStatus(car); return <tr key={car.id}><td className="fleet-reg">{car.registration}</td><td><div className="fleet-vehicle-cell"><span className="fleet-car-icon"><Icon name="fleet" size={19} /></span><span><strong>{car.make} {car.model}</strong><small>{car.year}</small></span></div></td><td>{car.type}</td><td>{vehicleOwner(car)}</td><td className="fleet-rate">{formatRate(car)} <small>/ day</small></td><td><span className={`fleet-status ${statusClass(car.status)}`}>{car.status}</span></td><td><span className={`fleet-site ${car.onSite ? 'yes' : 'no'}`}>{car.onSite ? 'Yes' : 'No'}</span></td><td><span className={`fleet-documents ${docs.toLowerCase()}`}><i />{docs}</span></td><td><div className="fleet-row-actions"><button type="button" className="fleet-view" onClick={() => onViewVehicle(car.id)}><Icon name="eye" size={16} /> View</button><button type="button" className="fleet-more" aria-label={`More actions for ${car.registration}`} aria-expanded={menu?.id === car.id} onClick={(event) => openMenu(event, car)}><Icon name="more" size={20} /></button></div></td></tr> })}</tbody></table>{!visible.length && !loading && !loadError && <div className="fleet-empty"><Icon name="search" size={25} /><strong>No vehicles found</strong><span>Try different search terms or clear the filters.</span><button type="button" onClick={resetFilters}>Clear filters</button></div>}</div>
      <div className="fleet-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} vehicles` : 'Showing 0 vehicles'}</span><div><button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="left" size={15} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="right" size={15} /></button></div></div>
    </section>
    {menu && <><button className="fleet-menu-backdrop" type="button" aria-label="Close vehicle actions" onClick={() => setMenu(null)} /><div className="fleet-action-menu" style={{ left: menu.x, top: menu.y }} role="menu"><button role="menuitem" type="button" onClick={() => openDialog('edit', menu.car)}><Icon name="edit" size={16} /> Edit</button><button role="menuitem" type="button" onClick={() => openDialog('documents', menu.car)}><Icon name="upload" size={16} /> Upload Documents</button><button role="menuitem" type="button" onClick={() => openDialog('status', menu.car)}><Icon name="swap" size={16} /> Update Status</button></div></>}
    </>}
    {dialog && <div className="fleet-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) closeDialog() }}><div className={`fleet-dialog ${['add', 'edit', 'bulk'].includes(dialog) ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="fleet-dialog-title"><div className="fleet-dialog-header"><div><span className="fleet-demo-mark">CONNECTED TO BACKEND</span><h2 id="fleet-dialog-title">{({ add: 'Add Car', edit: 'Edit Car', bulk: 'Bulk Upload', status: 'Update Status', documents: 'Upload Documents' })[dialog]}</h2></div><button type="button" aria-label="Close dialog" disabled={busy} onClick={closeDialog}><Icon name="close" size={20} /></button></div>
      {(dialog === 'add' || dialog === 'edit') && <FleetCarForm key={selected?.id || 'new'} initial={selected} vehicles={vehicles} vendors={vendors} onCancel={closeDialog} onSave={saveCar} />}
      {dialog === 'bulk' && <FleetBulkUpload vehicles={vehicles} onImport={importCars} onCancel={closeDialog} />}
      {dialog === 'status' && selected && <div className="fleet-simple-dialog"><p>Choose a new status for <strong>{selected.registration}</strong>.</p><label>Status<select value={pendingStatus} onChange={(event) => setPendingStatus(event.target.value)} disabled={busy}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label>{actionError && <p className="fleet-form-error" role="alert">{actionError}</p>}<div className="fleet-dialog-actions"><button type="button" className="fleet-secondary-button" disabled={busy} onClick={closeDialog}>Cancel</button><button type="button" className="fleet-primary-button" onClick={saveStatus} disabled={busy}>{busy ? 'Saving…' : 'Update Status'}</button></div></div>}
      {dialog === 'documents' && selected && <FleetDocumentDialog vehicle={selected} documentType={documentType} setDocumentType={setDocumentType} expiryDate={expiryDate} setExpiryDate={setExpiryDate} documentFile={documentFile} setDocumentFile={setDocumentFile} documentError={documentError} chooseDocument={chooseDocument} onCancel={closeDialog} onSave={saveDocument} busy={busy} />}
    </div></div>}
  </div>
}
