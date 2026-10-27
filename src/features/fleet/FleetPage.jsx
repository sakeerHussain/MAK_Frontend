import ActionIcon from '../../shared/components/ResourceIcon.jsx'
import Icon from '../../shared/components/ResourceIcon.jsx'
import AdminPageHeader from '../../app/AdminPageHeader.jsx'
import { ResourceFilters, ResourcePresets, ResourceIndicator, ResourceMenu } from '../../shared/components/ResourceRegister.jsx'
import { useMemo, useRef, useState } from 'react'
import useRentalDialog from '../../shared/hooks/useRentalDialog.js'
import useFleetUtilization from '../../shared/hooks/useFleetUtilization.js'
import { UTILIZATION_PERIODS, utilizationValue, utilizationHours } from './FleetUtilization.js'
import { formatRentalDateTime } from '../../shared/lib/rentalTime.js'
import { STATUS_OPTIONS, DOCUMENT_OPTIONS, TYPE_OPTIONS, documentStatus, vehicleOwner } from './FleetData.js'
import FleetCarForm from './FleetCarForm.jsx'
import FleetBulkUpload from './FleetBulkUpload.jsx'
import FleetImportDrafts from './FleetImportDrafts.jsx'
import FleetDocumentDialog from './FleetDocumentDialog.jsx'
import VehicleDetailsPage from './VehicleDetailsPage.jsx'
import { prepareUpload } from '../../shared/lib/upload.js'
import { createVehicle, getVehicle, importVehicles, saveVehicleImportDrafts, saveVehicleFiles, updateVehicle, updateVehicleStatus, uploadVehicleDocument } from './FleetApi.js'
import './FleetPage.css'

const PAGE_SIZES = [8, 12, 20]
const statusClass = (status) => status.toLowerCase().replaceAll(' ', '-')
const formatRate = (car) => `${car.rateCurrency || 'USD'} ${Number(car.dailyRate ?? car.rate ?? 0).toFixed(2)}`

export default function FleetPage({ vehicles, setVehicles, vendors = [], loading = false, loadError = '', onReload, viewVehicleId, onViewVehicle, onBackFleet }) {
  const dialogRef = useRef(null)
  const dialogTriggerRef = useRef(null)
  const [draftRefreshToken, setDraftRefreshToken] = useState(0)
  const [period, setPeriod] = useState('LAST_7_DAYS')
  const utilization = useFleetUtilization(period, !viewVehicleId && !loading && !loadError, vehicles)
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
    dialogTriggerRef.current = menu?.trigger || document.activeElement
    setSelected(car); setDialog(kind); setMenu(null); setActionError('')
    if (kind === 'status') setPendingStatus(car.status)
    if (kind === 'documents') { setDocumentFile(null); setDocumentType('Istimara'); setExpiryDate(''); setDocumentError('') }
  }
  const closeDialog = () => { setDialog(null); setSelected(null); setDocumentFile(null) }
  useRentalDialog(Boolean(dialog), () => { if (!busy) closeDialog() }, dialogRef, dialogTriggerRef)
  const saveCar = async (car) => {
    setBusy(true)
    try {
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
    } finally { setBusy(false) }
  }
  const importCars = async (cars) => {
    const result = await importVehicles(cars)
    try { await onReload() }
    catch (error) { setActionError(`Import completed, but the Fleet list could not refresh: ${error.message}`) }
    resetFilters()
    return result
  }
  const saveImportDrafts = async cars => {
    const result = await saveVehicleImportDrafts(cars)
    setDraftRefreshToken(current => current + 1)
    return result
  }
  const completeImportDraft = car => {
    setVehicles(current => [car, ...current.filter(item => item.id !== car.id)])
    resetFilters()
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
    setMenu({ id: car.id, trigger: event.currentTarget, x: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 190)), car })
  }
  const kpis = [
    { label: 'Total Vehicles', value: counts.total, icon: 'fleet', color: 'blue', foot: 'Overall fleet size', filter: 'All statuses' },
    { label: 'Available Vehicles', value: counts.available, icon: 'check', color: 'green', foot: 'Ready for assignment', filter: 'Available' },
    { label: 'Vehicles in Use', value: counts.inUse, icon: 'key', color: 'purple', foot: 'Assigned or on a trip', filter: 'In Use' },
    { label: 'Under Maintenance', value: counts.maintenance, icon: 'wrench', color: 'amber', foot: 'Servicing or repairs', filter: 'Under Maintenance' },
  ]
  const detailVehicle = vehicles.find((car) => String(car.id) === String(viewVehicleId))
  const activeFilters = [query.trim(), statusFilter !== 'All statuses', typeFilter !== 'All types', documentFilter !== 'All documents', siteFilter !== 'Any location'].filter(Boolean).length
  return <div className={`fleet-page resource-page ${viewVehicleId ? '' : 'resource-register'}`}>
    {viewVehicleId ? <VehicleDetailsPage key={viewVehicleId} car={detailVehicle} onBack={onBackFleet} onEdit={() => openDialog('edit', detailVehicle)} onUploadDocuments={() => openDialog('documents', detailVehicle)} onUpdateStatus={() => openDialog('status', detailVehicle)} /> : <>
      <div className="resource-heading">
        <AdminPageHeader title="Fleet" description="Manage vehicles, availability, and fleet records." />
        <div className="admin-page-actions" role="group" aria-label="Fleet actions"><div className="admin-page-action-buttons">
          <button className="fleet-secondary-button" type="button" disabled={loading || Boolean(loadError)} onClick={() => openDialog('bulk')}><Icon name="upload" /> Bulk Upload</button>
          <button className="fleet-add-button" type="button" disabled={loading || Boolean(loadError)} onClick={() => openDialog('add')}><Icon name="plus" /> Add Car</button>
        </div></div>
      </div>
      {(loadError || actionError) && <div className="fleet-form-error" role="alert">{loadError || actionError} <button type="button" onClick={() => { setActionError(''); onReload().catch((error) => setActionError(error.message)) }}>Retry</button></div>}
      {loading && <p className="fleet-form-help" role="status">Loading vehicles...</p>}
      <div className="fleet-utilization-controls"><label className="fleet-period">Utilization period <select value={period} onChange={event => setPeriod(event.target.value)} aria-label="Fleet utilization period">{UTILIZATION_PERIODS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button type="button" className="fleet-secondary-button" data-permission="fleet.read" onClick={utilization.refresh} disabled={utilization.loading}>Refresh utilization</button></div>
      <div className="resource-kpis" aria-label="Fleet overview">{kpis.map((kpi) => <button className="resource-kpi" type="button" key={kpi.label} onClick={kpi.filter ? () => chooseCard(kpi.filter) : undefined} disabled={!kpi.filter} aria-label={`${kpi.label}: ${kpi.value}${kpi.filter ? '. Filter fleet list' : ''}`}>
        <span className={`resource-kpi-icon ${kpi.color}`}><Icon name={kpi.icon} size={21} /></span>
        <span className="resource-kpi-copy"><span>{kpi.label}</span><strong>{kpi.value}</strong><small>{kpi.foot}</small></span>
        {kpi.filter && <Icon className="resource-kpi-arrow" name="right" size={14} />}
      </button>)}<div className="resource-kpi fleet-utilization-kpi" role="group" aria-labelledby="fleet-utilization-title" aria-busy={utilization.loading}><span className="resource-kpi-icon cyan"><Icon name="gauge" size={21} /></span><span className="resource-kpi-copy"><span id="fleet-utilization-title">Fleet Utilization</span><strong aria-live="polite">{utilization.loading ? '…' : utilizationValue(utilization.data)}</strong><small>{utilization.loading ? 'Loading rental activity' : utilization.error ? 'Unable to load' : utilization.data?.fleetSize === 0 ? 'No vehicles in Fleet' : utilization.data?.capacitySeconds === 0 ? 'No elapsed time yet' : UTILIZATION_PERIODS.find(option => option.value === period)?.label + ' · actual use'}</small></span></div></div>
      {utilization.error ? <p className="fleet-form-error" role="alert">Fleet utilization: {utilization.error} <button type="button" data-permission="fleet.read" onClick={utilization.refresh}>Retry utilization</button></p> : !utilization.loading && utilization.data && <div className="fleet-utilization-note" role="status"><p><strong>{utilizationHours(utilization.data.rentedSeconds)} rental hours / {utilizationHours(utilization.data.capacitySeconds)} fleet hours.</strong> {formatRentalDateTime(utilization.data.start)} – {formatRentalDateTime(utilization.data.end)}.</p><p>Actual handover to return for individual and corporate rentals. Uses the current fleet of {utilization.data.fleetSize} vehicles, including inactive and maintenance vehicles; import drafts are excluded.</p>{utilization.data.omittedRentals > 0 && <p className="fleet-import-warning">{utilization.data.omittedRentals} rental record(s) excluded because actual handover/return timestamps are missing or invalid. Recorded utilization may be incomplete.</p>}</div>}
      <ResourcePresets label="Vehicle status shortcuts" value={statusFilter} onChange={(value) => updateFilter(setStatusFilter, value)} items={[
        { label: 'All vehicles', value: 'All statuses', count: counts.total },
        { label: 'Available', value: 'Available', count: counts.available },
        { label: 'Under maintenance', value: 'Under Maintenance', count: counts.maintenance },
      ]} />
      <section className="fleet-table-panel" id="fleet-list" aria-label="Vehicles">
        <ResourceFilters activeCount={activeFilters} onReset={resetFilters} search={<label className="fleet-search"><Icon name="search" /><input type="search" placeholder="Search reg no., vehicle ID, model..." aria-label="Search vehicles" value={query} onChange={(event) => updateFilter(setQuery, event.target.value)} /></label>}>
          <select aria-label="Filter by type" value={typeFilter} onChange={(event) => updateFilter(setTypeFilter, event.target.value)}><option>All types</option>{TYPE_OPTIONS.map((type) => <option key={type}>{type}</option>)}</select>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)}><option>All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select>
          <select aria-label="Filter by documents" value={documentFilter} onChange={(event) => updateFilter(setDocumentFilter, event.target.value)}><option>All documents</option>{DOCUMENT_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select>
          <select aria-label="Filter by on-site status" value={siteFilter} onChange={(event) => updateFilter(setSiteFilter, event.target.value)}><option>Any location</option><option>On-site</option><option>Off-site</option></select>
        </ResourceFilters>
        <p className="resource-scroll-hint" id="fleet-scroll-help">Scroll the table sideways to see all vehicle details.</p>
        <div className="fleet-table-scroll" role="region" aria-label="Vehicle records" tabIndex={0}>
          <table className="fleet-table"><thead><tr>{['Reg No.', 'Make / Model / Year', 'Type', 'Owner', 'Price / Rate', 'Status', 'On-site?', 'Documents', 'Actions'].map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{visible.map((car) => { const docs = documentStatus(car); return <tr key={car.id}>
              <td className="fleet-reg">{car.registration}</td>
              <td><div className="fleet-vehicle-cell"><span className="fleet-car-icon"><Icon name="fleet" size={19} /></span><span><strong>{car.make} {car.model}</strong><small>{car.year}</small></span></div></td>
              <td>{car.type}</td><td>{vehicleOwner(car)}</td><td className="fleet-rate">{formatRate(car)}<small>/ day</small></td>
              <td><span className={`fleet-status ${statusClass(car.status)}`}>{car.status}</span></td><td><span className={`fleet-site ${car.onSite ? 'yes' : 'no'}`}>{car.onSite ? 'Yes' : 'No'}</span></td>
              <td><ResourceIndicator value={docs} /></td>
              <td><button type="button" className="fleet-more" aria-label={`More actions for ${car.registration}`} aria-haspopup="menu" aria-expanded={menu?.id === car.id} onClick={(event) => openMenu(event, car)}><Icon name="more" size={20} /></button></td>
            </tr> })}</tbody>
          </table>
          {!visible.length && !loading && !loadError && <div className="fleet-empty"><Icon name={vehicles.length ? 'search' : 'fleet'} size={28} /><strong>{vehicles.length ? 'No matching vehicles' : 'No vehicles added yet'}</strong><p>{vehicles.length ? 'Try another search or reset the filters.' : 'Add your first vehicle or use Bulk Upload to build your fleet.'}</p>{vehicles.length ? <button type="button" onClick={resetFilters}>Reset filters</button> : <button className="resource-empty-add" type="button" onClick={() => openDialog('add')}>Add Car</button>}</div>}
        </div>
        <div className="fleet-pagination"><span aria-live="polite">{filtered.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} vehicles` : 'Showing 0 vehicles'}</span><div>
          <select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); setMenu(null) }}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size} rows</option>)}</select>
          <button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => { setPage(safePage - 1); setMenu(null) }}><Icon name="left" size={16} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => { setPage(safePage + 1); setMenu(null) }}><Icon name="right" size={16} /></button>
        </div></div>
      </section>
      <FleetImportDrafts refreshToken={draftRefreshToken} vehicles={vehicles} vendors={vendors} onCompleted={completeImportDraft} />
      {menu && <ResourceMenu menu={menu} onClose={() => setMenu(null)} label={`Vehicle actions for ${menu.car.registration}`} className="fleet-action-menu">
        <button role="menuitem" type="button" onClick={() => { onViewVehicle(menu.car.id); setMenu(null) }}><Icon name="eye" /> View Vehicle</button>
        <button role="menuitem" type="button" onClick={() => openDialog('edit', menu.car)}><Icon name="edit" /> Edit</button>
        <button role="menuitem" type="button" onClick={() => openDialog('documents', menu.car)}><Icon name="upload" /> Upload Documents</button>
        <button role="menuitem" type="button" onClick={() => openDialog('status', menu.car)}><Icon name="swap" /> Update Status</button>
      </ResourceMenu>}
    </>}
    {dialog && <div className="fleet-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) closeDialog() }}><div ref={dialogRef} tabIndex={-1} className={`fleet-dialog ${['add', 'edit', 'bulk'].includes(dialog) ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="fleet-dialog-title"><div className="fleet-dialog-header"><div><span className="fleet-demo-mark">CONNECTED TO BACKEND</span><h2 id="fleet-dialog-title" tabIndex={-1} data-dialog-initial-focus>{({ add: 'Add Car', edit: 'Edit Car', bulk: 'Bulk Upload', status: 'Update Status', documents: 'Upload Documents' })[dialog]}</h2></div><button type="button" aria-label="Close dialog" disabled={busy} onClick={closeDialog}><Icon name="close" size={20} /></button></div>
      {(dialog === 'add' || dialog === 'edit') && <FleetCarForm key={selected?.id || 'new'} initial={selected} vehicles={vehicles} vendors={vendors} onCancel={closeDialog} onSave={saveCar} />}
      {dialog === 'bulk' && <FleetBulkUpload vehicles={vehicles} onImport={importCars} onSaveDrafts={saveImportDrafts} onBusyChange={setBusy} onCancel={closeDialog} />}
      {dialog === 'status' && selected && <div className="fleet-simple-dialog"><p>Choose a new status for <strong>{selected.registration}</strong>.</p><label>Status<select value={pendingStatus} onChange={(event) => setPendingStatus(event.target.value)} disabled={busy}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label>{actionError && <p className="fleet-form-error" role="alert">{actionError}</p>}<div className="fleet-dialog-actions"><button type="button" className="fleet-secondary-button" disabled={busy} onClick={closeDialog}>Cancel</button><button type="button" className="fleet-primary-button" onClick={saveStatus} disabled={busy}><ActionIcon name="check" size={16} /> {busy ? 'Saving…' : 'Update Status'}</button></div></div>}
      {dialog === 'documents' && selected && <FleetDocumentDialog vehicle={selected} documentType={documentType} setDocumentType={setDocumentType} expiryDate={expiryDate} setExpiryDate={setExpiryDate} documentFile={documentFile} setDocumentFile={setDocumentFile} documentError={documentError} chooseDocument={chooseDocument} onCancel={closeDialog} onSave={saveDocument} busy={busy} />}
    </div></div>}
  </div>
}
