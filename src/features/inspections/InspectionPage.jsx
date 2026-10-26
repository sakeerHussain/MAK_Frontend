import { OperationsHeading, OperationsKpis, OperationsRowActions } from '../../shared/components/OperationsRegister.jsx'
import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import { OperationsIcon as Icon } from '../../shared/components/OperationsRegister.jsx'
import InspectionForm from './InspectionForm.jsx'
import { INSPECTION_TYPES, CONDITIONS } from './InspectionData.js'
import { saveInspectionRecord } from './InspectionApi.js'
import { listVehicles } from '../fleet/FleetApi.js'
import './InspectionPage.css'

const dateLabel = (value) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '—'
const reading = (value) => value === '' || value === null || value === undefined ? '—' : `${Number(value).toLocaleString('en-US')} km`
const conditionClass = (condition) => condition.toLowerCase().replace(/\s+/g, '-')

function InspectionDetails({ inspection, vehicle, booking, onClose, onEdit, onViewVehicle, onViewBooking }) {
  const details = [
    ['Inspection ID', inspection.inspectionId],
    ['Car', vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : 'Vehicle unavailable'],
    ['Inspection Type', inspection.type], ['Condition', inspection.condition],
    ['Inspection Date', dateLabel(inspection.inspectionDate)], ['Inspector', inspection.inspector],
    ['Odometer', reading(inspection.odometerKm)], ['Fuel Level', `${inspection.fuelLevel}%`],
    ['Booking ID', booking?.bookingId || 'Not linked'],
  ]
  return <div className="inspection-detail"><div className="inspection-detail-hero"><span className="inspection-id">{inspection.inspectionId}</span><h3>{inspection.type} inspection</h3><p>{vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : 'Vehicle unavailable'}</p><span className={`inspection-condition ${conditionClass(inspection.condition)}`}>{inspection.condition}</span></div>
    <dl className="inspection-detail-list">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <section className="inspection-detail-section"><h4>Damage / Condition Notes</h4><p>{inspection.notes || 'No condition notes added.'}</p></section>
    <section className="inspection-detail-section"><h4>Photos ({inspection.photos.length})</h4>{inspection.photos.length ? <div className="inspection-photo-grid">{inspection.photos.map((photo) => <figure className="inspection-detail-photo" key={photo.id}><img src={photo.previewUrl} alt={photo.name} /><figcaption title={photo.name}>{photo.name}</figcaption></figure>)}</div> : <p>No photos attached.</p>}</section>
    <div className="inspection-form-actions"><button type="button" className="inspection-secondary" onClick={onClose}>Close</button>{vehicle && <button type="button" className="inspection-secondary" onClick={() => { onClose(); onViewVehicle(vehicle.id) }}><ActionIcon name="fleet" size={16} /> View Car</button>}{booking && <button type="button" className="inspection-secondary" onClick={() => { onClose(); onViewBooking(booking.id) }}><ActionIcon name="bookings" size={16} /> View Booking</button>}<button type="button" className="inspection-primary" onClick={onEdit}><ActionIcon name="edit" size={16} /> Edit Inspection</button></div>
  </div>
}

export default function InspectionPage({ inspections, setInspections, vehicles, setVehicles, bookings, loading, loadError, onReload, onViewVehicle, onViewBooking }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [conditionFilter, setConditionFilter] = useState('All conditions')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [refreshError, setRefreshError] = useState('')
  const selected = inspections.find((inspection) => inspection.id === selectedId)
  const vehicleFor = (inspection) => vehicles.find((vehicle) => vehicle.id === inspection.vehicleId)
  const bookingFor = (inspection) => bookings.find((booking) => booking.id === inspection.bookingId)
  const closeDialog = () => { setDialog(null); setSelectedId(null) }
  const openDialog = (mode, inspection = null) => { setSelectedId(inspection?.id ?? null); setDialog(mode) }
  const saveInspection = async (inspection) => {
    const saved = await saveInspectionRecord(inspection)
    setInspections((current) => inspection.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
    setPage(1)
    closeDialog()
    try { setVehicles(await listVehicles()); setRefreshError('') }
    catch (error) { setRefreshError(`Inspection saved. Fleet readings could not refresh: ${error.message}`) }
  }
  const search = query.trim().toLowerCase()
  const filtered = inspections.filter((inspection) => {
    const vehicle = vehicleFor(inspection)
    const booking = bookingFor(inspection)
    return (!search || `${inspection.inspectionId} ${inspection.type} ${inspection.condition} ${inspection.inspector} ${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.registration || ''} ${booking?.bookingId || ''}`.toLowerCase().includes(search))
      && (typeFilter === 'All types' || inspection.type === typeFilter)
      && (conditionFilter === 'All conditions' || (conditionFilter === 'Excellent / Good' ? ['Excellent', 'Good'].includes(inspection.condition) : conditionFilter === 'Needs Attention' ? ['Poor', 'Damaged'].includes(inspection.condition) : inspection.condition === conditionFilter))
  }).sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate) || b.id - a.id)
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * 10, safePage * 10)
  const resetFilters = () => { setQuery(''); setTypeFilter('All types'); setConditionFilter('All conditions'); setPage(1) }
  const cards = [
    ['Total Inspections', inspections.length, 'All conditions', 'inspections'],
    ['Excellent / Good', inspections.filter((item) => ['Excellent', 'Good'].includes(item.condition)).length, 'Excellent / Good', 'check'],
    ['Fair', inspections.filter((item) => item.condition === 'Fair').length, 'Fair', 'clock'],
    ['Needs Attention', inspections.filter((item) => ['Poor', 'Damaged'].includes(item.condition)).length, 'Needs Attention', 'alert'],
  ]
  if (loading || loadError) return <div className="inspection-page operations-page"><OperationsHeading title="Inspections" description="Capture vehicle condition, odometer, fuel, and photo evidence." /><section className="inspection-panel" aria-live="polite"><h2>{loading ? 'Loading inspections...' : 'Unable to load inspection records'}</h2>{loadError && <p className="inspection-error" role="alert">{loadError}</p>}{!loading && <button type="button" className="inspection-secondary" onClick={onReload}><ActionIcon name="reset" size={16} /> Retry</button>}</section></div>
  return <div className="inspection-page operations-page">
    {refreshError && <div role="alert"><p className="inspection-error">{refreshError}</p><button type="button" className="inspection-secondary" onClick={onReload}><ActionIcon name="reset" size={16} /> Refresh</button></div>}
      <OperationsHeading title="Inspections" description="Capture vehicle condition, odometer, fuel, and photo evidence."><div className="admin-page-actions" role="group" aria-label="Inspection actions"><button type="button" className="inspection-primary" onClick={() => openDialog('add')}><ActionIcon name="plus" size={17} /> Add Inspection</button></div></OperationsHeading>
    <OperationsKpis label="Inspection overview" items={cards.map(([label, value, filter, icon], index) => ({ label, value, icon, tone: ['blue', 'green', 'amber', 'red'][index], detail: ['All recorded inspections', 'In excellent or good condition', 'Fair condition', 'Requires attention'][index], onClick: () => { setConditionFilter(filter); setPage(1) } }))} />
    <section className="inspection-panel"><div className="inspection-panel-heading"><div><h2>Inspection Log</h2><p>Recent inspections appear first. Open a record to review its notes and photos.</p></div><span>{filtered.length} records</span></div>
      <div className="inspection-toolbar"><label className="inspection-search"><Icon name="search" size={17} /><input type="search" aria-label="Search inspections" placeholder="Search ID, car, inspector, booking..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label><select aria-label="Filter inspection type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1) }}><option>All types</option>{INSPECTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select><select aria-label="Filter condition" value={conditionFilter} onChange={(event) => { setConditionFilter(event.target.value); setPage(1) }}><option>All conditions</option><option>Excellent / Good</option><option>Needs Attention</option>{CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}</select></div>
      <div className="inspection-table-scroll"><table className="inspection-table"><thead><tr><th>ID</th><th>Car</th><th>Type</th><th>Condition</th><th>Date</th><th>Inspector</th><th>Odometer</th><th>Fuel</th><th>Actions</th></tr></thead><tbody>{visible.map((inspection) => { const vehicle = vehicleFor(inspection); return <tr key={inspection.id}><td><button type="button" className="inspection-id inspection-id-button" onClick={() => openDialog('view', inspection)}>{inspection.inspectionId}</button></td><td><button type="button" className="inspection-car-link" disabled={!vehicle} onClick={() => vehicle && onViewVehicle(vehicle.id)}><strong>{vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle unavailable'}</strong><small>{vehicle?.registration || '—'}</small></button></td><td>{inspection.type}</td><td><span className={`inspection-condition ${conditionClass(inspection.condition)}`}>{inspection.condition}</span></td><td>{dateLabel(inspection.inspectionDate)}</td><td>{inspection.inspector}</td><td>{reading(inspection.odometerKm)}</td><td>{inspection.fuelLevel}%</td><td><OperationsRowActions reference={inspection.inspectionId} onView={() => openDialog('view', inspection)} onEdit={() => openDialog('edit', inspection)} /></td></tr> })}</tbody></table>{!visible.length && <div className="inspection-empty"><Icon name="inspections" size={30} /><strong>{inspections.length ? 'No matching inspections' : 'No inspections yet'}</strong><p>{inspections.length ? 'Try different search terms or filters.' : 'Create an inspection to record a car’s condition and readings.'}</p><button type="button" className="inspection-secondary" onClick={inspections.length ? resetFilters : () => openDialog('add')}>{inspections.length ? 'Clear filters' : 'Add Inspection'}</button></div>}</div>
      <div className="inspection-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * 10 + 1}–${Math.min(safePage * 10, filtered.length)} of ${filtered.length} inspections` : 'Showing 0 inspections'}</span><div><button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="back" size={15} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="arrow" size={15} /></button></div></div>
    </section>
    {dialog && <div className="inspection-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className="inspection-dialog" role="dialog" aria-modal="true" aria-labelledby="inspection-dialog-title"><div className="inspection-dialog-heading"><div><h2 id="inspection-dialog-title">{dialog === 'add' ? 'Add Inspection' : dialog === 'edit' ? 'Edit Inspection' : 'Inspection Details'}</h2></div><button type="button" aria-label="Close dialog" onClick={closeDialog}><Icon name="close" size={19} /></button></div>{dialog === 'view' && selected ? <InspectionDetails inspection={selected} vehicle={vehicleFor(selected)} booking={bookingFor(selected)} onClose={closeDialog} onEdit={() => setDialog('edit')} onViewVehicle={onViewVehicle} onViewBooking={onViewBooking} /> : <InspectionForm key={selected?.id || 'new'} initial={dialog === 'edit' ? selected : null} vehicles={vehicles} bookings={bookings} onCancel={closeDialog} onSave={saveInspection} />}</div></div>}
  </div>
}
