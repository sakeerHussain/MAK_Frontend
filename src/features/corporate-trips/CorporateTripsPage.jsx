import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import { dayKey, formatDateTime, inDateRange, localDateTime, periodBounds, sar, shiftDays } from '../bookings/BookingData.js'
import { CORPORATE_STATUSES, corporatePriority, resourceConflict, tripPassengers, tripStops, waitingMinutes } from './CorporateData.js'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import CorporateTripForm from './CorporateTripForm.jsx'
import CorporateTripDetails from './CorporateTripDetails.jsx'
import CompanyEditor from './CompanyEditor.jsx'
import { saveCustomerRecord } from '../customers/CustomerApi.js'
import { assignCorporateTrip, corporateStatus, saveCorporateTrip } from './CorporateTripApi.js'
import { normalizeCompanyName } from './CompanyData.js'
import { corporateTripListCsv, downloadCorporateTripDetails } from './CorporateExport.js'
import { downloadCsv } from '../../shared/lib/csv.js'
import { invoicePaymentStatus } from '../invoices/InvoiceData.js'
import '../bookings/BookingPage.css'
import './CorporateTripsPage.css'

const iconPaths = {
  plus: 'M12 4v16 M4 12h16', next: 'M9 5l7 7-7 7', calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
  briefcase: 'M3 8h18v12H3z M8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3 M3 13h18',
  truck: 'M3 6h12v11H3z M15 10h4l3 4v3h-7z M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  route: 'M5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M19 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M7 6h9a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8',
  wallet: 'M3 6h18v14H3z M3 10h18 M7 16h5', more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M17 17l4 4',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  edit: 'M4 20l4-.8L20 7l-3-3L5 16z M14.5 6.5l3 3',
  assign: 'M4 20v-3a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v3 M10.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 7h4 M20 5v4',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 18v3h16v-3', check: 'M4 12l5 5L20 6', close: 'M5 5l14 14 M19 5L5 19', back: 'M15 5l-7 7 7 7',
}
function Icon({ name, size = 17 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>
}

const vehicleFor = (trip, vehicles) => vehicles.find((vehicle) => vehicle.id === trip.vehicleId)
const driverFor = (trip, drivers) => drivers.find((driver) => driver.id === trip.driverId)
const vehicleLabel = (trip, vehicles) => {
  const vehicle = vehicleFor(trip, vehicles)
  return vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : `${trip.requestedType} requested · assign on trip day`
}
const driverLabel = (trip, drivers) => trip.serviceMode === 'Self-drive' ? 'Self-drive' : driverFor(trip, drivers)?.name || 'Unassigned'
const statusClass = (status) => status.toLowerCase().replaceAll(' ', '-')
const isOverdue = (trip, now = new Date()) => trip.status === 'Active' && new Date(trip.returnAt) < now
function CorporateAssignment({ trip, trips, bookings, vehicles, drivers, onSave, onCancel }) {
  const [vehicleId, setVehicleId] = useState(String(trip.vehicleId || ''))
  const [driverId, setDriverId] = useState(String(trip.driverId || ''))
  const [search, setSearch] = useState('')
  const [handedOver, setHandedOver] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const candidates = vehicles.filter((vehicle) => (vehicle.status === 'Available' || vehicle.id === trip.vehicleId) && vehicle.type === trip.requestedType && Number(vehicle.seats || 0) >= trip.passengerCount)
  const shown = candidates.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.registration}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 30)
  const chosen = candidates.find((vehicle) => vehicle.id === Number(vehicleId))
  if (chosen && !shown.some((vehicle) => vehicle.id === chosen.id)) shown.unshift(chosen)
  const activeDrivers = drivers.filter((driver) => driver.status === 'Active' || driver.id === trip.driverId)
  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    if (!vehicleId || (trip.serviceMode === 'With driver' && !driverId)) { setError('Select a vehicle and, for a driven trip, a driver.'); return }
    if (handedOver && tripPassengers(trip).length !== trip.passengerCount) { setError('Complete the passenger list before handover.'); return }
    if (resourceConflict('vehicle', vehicleId, trip.pickupAt, trip.returnAt, trip.id, trips, bookings)) { setError('This vehicle overlaps another trip or booking.'); return }
    if (trip.serviceMode === 'With driver' && resourceConflict('driver', driverId, trip.pickupAt, trip.returnAt, trip.id, trips, bookings)) { setError('This driver overlaps another trip or booking.'); return }
    setSaving(true)
    try { await onSave({ vehicleId: Number(vehicleId), driverId: trip.serviceMode === 'With driver' ? Number(driverId) : null, status: handedOver ? 'Active' : 'Confirmed', handedOverAt: handedOver ? localDateTime(new Date()) : '' }) }
    catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }
  return <form className="booking-form corporate-assignment" onSubmit={save} noValidate>
    <p className="booking-dialog-note"><strong>{trip.tripId}</strong> · {trip.companyName} · {trip.passengerCount} passenger{trip.passengerCount === 1 ? '' : 's'}. Assign resources on the trip day, then record handover when the trip starts.</p>
    <div className="booking-form-grid"><div className="booking-vehicle-picker"><label>Search {trip.requestedType} Vehicles<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Make, model or registration" /></label><label><FormFieldCaption required>Vehicle</FormFieldCaption><select required value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setError('') }}><option value="">Select vehicle</option>{shown.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.registration} · {vehicle.seats} seats</option>)}</select></label><small>{shown.length} of {candidates.length} suitable vehicles shown</small></div>
      {trip.serviceMode === 'With driver' ? <label><FormFieldCaption required>Driver</FormFieldCaption><select required value={driverId} onChange={(event) => { setDriverId(event.target.value); setError('') }}><option value="">Select driver</option>{activeDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.employeeId}</option>)}</select></label> : <div className="booking-self-drive-note">Self-drive · no driver assignment needed</div>}
      <label className="booking-wide-field booking-check-field"><input type="checkbox" checked={handedOver} onChange={(event) => setHandedOver(event.target.checked)} /><span>Vehicle handed over — mark trip Active</span></label>
    </div>{error && <p className="booking-error" role="alert">{error}</p>}<div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="booking-primary" disabled={saving}><ActionIcon name="assign" size={16} /> {saving ? 'Saving…' : handedOver ? 'Assign & Start Trip' : 'Save Assignment'}</button></div>
  </form>
}

function CorporateDetail({ trip, vehicles, drivers, onBack, onEdit, onAssign, onInvoice, invoiceAvailable, onComplete, onExport, onCancel }) {
  if (!trip) return <section className="booking-panel booking-not-found"><h2>Corporate trip not found</h2><button type="button" className="booking-primary" onClick={onBack}><ActionIcon name="back" size={16} /> Back to Corporate Trips</button></section>
  const priority = corporatePriority(trip)
  const canAssign = trip.status === 'Confirmed' && dayKey(trip.pickupAt) <= dayKey(new Date())
  return <div className="corporate-detail"><button type="button" className="booking-back" onClick={onBack}><ActionIcon name="back" /> Back to Corporate Trips</button>
    <section className="booking-panel booking-detail-hero"><div className="booking-detail-main"><span className="booking-eyebrow">{trip.bookingType.toUpperCase()} CORPORATE TRIP</span><h2>{trip.tripId}</h2><p>{trip.companyName} · {trip.pickupLocation} → {trip.destination}</p><div className="booking-badges"><span className={`booking-status status-${statusClass(trip.status)}`}>{trip.status}</span><span className={`corporate-billing billing-${statusClass(trip.billingStatus)}`}>{trip.billingStatus}</span><span className={`booking-priority priority-${priority.tone}`}>{priority.label}</span></div></div><div className="booking-detail-actions">{canAssign && <button type="button" className="booking-primary" onClick={onAssign}><ActionIcon name="assign" /> Assign & Handover</button>}{!['Cancelled', 'Completed'].includes(trip.status) && <button type="button" className="booking-secondary" onClick={onEdit}><ActionIcon name="edit" /> Edit Trip</button>}{trip.status === 'Active' && <button type="button" className="booking-secondary" onClick={onComplete}><ActionIcon name="check" /> Complete Trip</button>}{(trip.status === 'Completed' || invoiceAvailable) && <button type="button" className="booking-secondary" onClick={onInvoice}><ActionIcon name="wallet" /> {invoiceAvailable ? 'View Invoice' : 'Create Invoice'}</button>}<button type="button" className="booking-secondary" onClick={onExport}><ActionIcon name="download" /> Download Details</button></div></section>
    <div className="booking-detail-grid"><CorporateTripDetails trip={trip} vehicleLabel={vehicleLabel(trip, vehicles)} driverLabel={driverLabel(trip, drivers)} overdue={isOverdue(trip)} />
      <section className="booking-panel booking-detail-card"><h3>Trip Controls</h3><p className="corporate-control-note">An advance trip stays unassigned until its pickup day. Confirmed trips can then receive a matching vehicle and driver. Assignments and handovers are recorded with the trip.</p><div className="corporate-control-actions">{canAssign && <button type="button" className="booking-primary" onClick={onAssign}><ActionIcon name="assign" size={16} /> Assign Resources</button>}{trip.status === 'Active' && <button type="button" className="booking-secondary" onClick={onComplete}><ActionIcon name="check" size={16} /> Mark Completed</button>}{['Pending', 'Confirmed'].includes(trip.status) && <button type="button" className="booking-danger-link" onClick={onCancel}>Cancel Trip</button>}</div></section></div>
    {trip.notes && <section className="booking-panel booking-detail-card booking-notes"><h3>Internal Notes</h3><p>{trip.notes}</p></section>}
  </div>
}

export default function CorporateTripsPage({ trips, setTrips, companies, setCompanies, quotes = [], vehicles, drivers, bookings, viewTripId, onViewTrip, onBack, invoices, onInvoice, onResourcesChanged }) {
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('All companies')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [billingFilter, setBillingFilter] = useState('All billing statuses')
  const [typeFilter, setTypeFilter] = useState('All trip types')
  const [period, setPeriod] = useState('Last 30 days')
  const [dateBasis, setDateBasis] = useState('Booked on')
  const [customStart, setCustomStart] = useState(dayKey(shiftDays(new Date(), -6)))
  const [customEnd, setCustomEnd] = useState(dayKey(new Date()))
  const [sort, setSort] = useState('Priority first')
  const [pageSize, setPageSize] = useState(8)
  const [page, setPage] = useState(1)
  const [menu, setMenu] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [dialogId, setDialogId] = useState(null)

  const [companyNotice, setCompanyNotice] = useState('')
  const now = new Date()
  const today = dayKey(now)
  const bounds = periodBounds(period, customStart, customEnd, now)
  const selected = trips.find((trip) => trip.id === dialogId)
  const viewed = trips.find((trip) => trip.id === viewTripId)
  const invoiceFor = (trip) => trip && invoices.find((invoice) => invoice.status !== 'Voided' && invoice.sources.some((source) => source.kind === 'Corporate' && source.id === trip.id))
  const billingLabel = (trip) => { const invoice = invoiceFor(trip); return !invoice ? 'Unbilled' : invoice.status === 'Draft' ? 'Draft' : invoicePaymentStatus(invoice) === 'Paid' ? 'Paid' : 'Invoiced' }
  const companyNames = companies.map((company) => company.name).sort()
  const dateValue = (trip) => dateBasis === 'Pickup date' ? trip.pickupAt : dateBasis === 'Return date' ? trip.returnAt : trip.bookedAt
  const periodTrips = trips.filter((trip) => inDateRange(dateValue(trip), bounds.start, bounds.end))
  const activeCount = trips.filter((trip) => trip.status === 'Active').length
  const pickupToday = trips.filter((trip) => trip.status === 'Confirmed' && dayKey(trip.pickupAt) === today).length
  const assignmentToday = trips.filter((trip) => trip.status === 'Confirmed' && dayKey(trip.pickupAt) <= today && (!trip.vehicleId || (trip.serviceMode === 'With driver' && !trip.driverId))).length
  const overdueCount = trips.filter((trip) => isOverdue(trip, now)).length
  const tripValue = periodTrips.filter((trip) => trip.status !== 'Cancelled').reduce((sum, trip) => sum + Number(trip.totalAmount), 0)
  const term = query.trim().toLowerCase()
  const filtered = trips.filter((trip) => {
    const searchText = `${trip.tripId} ${trip.companyName} ${trip.contactName} ${trip.contactEmail} ${trip.contactPhone} ${trip.projectCode || ''} ${trip.projectManager || ''} ${tripStops(trip).map((stop) => stop.location).join(' ')} ${tripPassengers(trip).map((passenger) => `${passenger.name} ${passenger.phone}`).join(' ')} ${vehicleLabel(trip, vehicles)} ${driverLabel(trip, drivers)}`.toLowerCase()
    return (!term || searchText.includes(term)) && inDateRange(dateValue(trip), bounds.start, bounds.end)
      && (companyFilter === 'All companies' || trip.companyName === companyFilter)
      && (statusFilter === 'All statuses' || trip.status === statusFilter)
      && (billingFilter === 'All billing statuses' || billingLabel(trip) === billingFilter)
      && (typeFilter === 'All trip types' || trip.bookingType === typeFilter)
  }).sort((a, b) => {
    if (sort === 'Newest booked') return new Date(b.bookedAt) - new Date(a.bookedAt)
    if (sort === 'Pickup soonest') return new Date(a.pickupAt) - new Date(b.pickupAt)
    if (sort === 'Highest value') return b.totalAmount - a.totalAmount
    return corporatePriority({ ...b, billingStatus: billingLabel(b) }, now).score - corporatePriority({ ...a, billingStatus: billingLabel(a) }, now).score || new Date(a.pickupAt) - new Date(b.pickupAt)
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const urgentCount = filtered.filter((trip) => corporatePriority({ ...trip, billingStatus: billingLabel(trip) }, now).score >= 80).length
  const changeFilter = (setter, value) => { setter(value); setPage(1) }
  const reset = () => { setQuery(''); setCompanyFilter('All companies'); setStatusFilter('All statuses'); setBillingFilter('All billing statuses'); setTypeFilter('All trip types'); setPeriod('Last 30 days'); setDateBasis('Booked on'); setSort('Priority first'); setPage(1) }
  const openDialog = (kind, trip = null) => { setDialog(kind); setDialogId(trip?.id || null); setMenu(null) }
  const closeDialog = () => { setDialog(null); setDialogId(null) }
  const createCompany = async (details) => {
    const existing = companies.find((company) => normalizeCompanyName(company.name) === normalizeCompanyName(details.name))
    if (existing) { if (existing.status === 'Inactive') throw new Error('This company is inactive. Activate it in Customer before booking.'); return existing }
    const company = await saveCustomerRecord('Corporate', details)
    setCompanies((current) => [...current, company])
    setCompanyNotice(`${company.name} added to company suggestions.`)
    return company
  }
  const saveTrip = async (record) => {
    const company = await createCompany({ name: record.companyName, registrationNumber: '', taxNumber: '', billingContactName: record.contactName, billingEmail: record.contactEmail, billingPhone: record.contactPhone, billingAddress: '', billingCity: '', billingCountry: '', paymentTerms: '', waitingRatePerHour: 0, includedWaitingMinutes: 0, waitingBillingIncrementMinutes: 15 })
    const linkedRecord = { ...record, companyId: company.id, companyName: company.name }
    const saved = await saveCorporateTrip(linkedRecord)
    void onResourcesChanged?.()
    setTrips((current) => current.some((trip) => trip.id === saved.id)
      ? current.map((trip) => trip.id === saved.id ? saved : trip) : [saved, ...current])
    if (!selected) onViewTrip(saved.id)
    closeDialog()
  }
  const [actionError, setActionError] = useState('')
  const updateSelected = async (changes) => {
    if (!selected) return
    try {
      const saved = await corporateStatus(selected.id, changes.status, changes)
      void onResourcesChanged?.()
      setTrips((current) => current.map((trip) => trip.id === saved.id ? saved : trip))
      closeDialog(); setActionError('')
    } catch (cause) { setActionError(cause.message) }
  }
  const saveAssignment = async (changes) => {
    if (selected?.status !== 'Confirmed' || dayKey(selected.pickupAt) > dayKey(new Date())) return
    const saved = await assignCorporateTrip(selected.id, changes)
    void onResourcesChanged?.()
    setTrips((current) => current.map((trip) => trip.id === saved.id ? saved : trip))
    closeDialog()
  }
  const openMenu = (event, trip) => { const rect = event.currentTarget.getBoundingClientRect(); setMenu({ id: trip.id, x: Math.max(8, Math.min(rect.right - 215, window.innerWidth - 225)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 260)) }) }
  const menuTrip = trips.find((trip) => trip.id === menu?.id)

  return <div className="corporate-page">
    {actionError && <p className="booking-error" role="alert">{actionError}</p>}
    {viewTripId ? <CorporateDetail trip={viewed ? { ...viewed, billingStatus: billingLabel(viewed) } : viewed} vehicles={vehicles} drivers={drivers} onBack={onBack} onEdit={() => openDialog('edit', viewed)} onAssign={() => openDialog('assign', viewed)} onInvoice={() => onInvoice(viewed)} invoiceAvailable={Boolean(invoiceFor(viewed))} onExport={() => downloadCorporateTripDetails({ ...viewed, billingStatus: billingLabel(viewed) }, vehicles, drivers)} onComplete={() => openDialog('complete', viewed)} onCancel={() => openDialog('cancel', viewed)} /> : <>
      <div className="admin-page-actions" role="group" aria-label="Corporate trip actions"><div className="admin-page-action-buttons"><button type="button" className="booking-secondary" onClick={() => openDialog('company')}><ActionIcon name="plus" /> Add Company</button><button type="button" className="booking-secondary" disabled={!filtered.length} onClick={() => downloadCsv('corporate-trips-filtered.csv', corporateTripListCsv(filtered.map((trip) => ({ ...trip, billingStatus: billingLabel(trip) })), vehicles, drivers))}><ActionIcon name="download" /> Export List CSV</button><button type="button" className="booking-secondary" onClick={() => openDialog('quick')}><ActionIcon name="plus" /> Quick Trip</button><button type="button" className="booking-primary" onClick={() => openDialog('advance')}><ActionIcon name="calendar" /> Schedule Trip</button></div></div>
      {companyNotice && <p className="corporate-company-notice" role="status">{companyNotice}</p>}
      <div className="booking-kpis" aria-label="Corporate trip KPIs">
        <div className="booking-kpi"><div className="booking-kpi-head"><span>Corporate Trips</span><Icon name="briefcase" /></div><div className="booking-kpi-value">{periodTrips.length}</div><p>Trips in the selected period</p><small>{period} · {dateBasis.toLowerCase()}</small></div>
        <div className="booking-kpi"><div className="booking-kpi-head"><span>Active Trips</span><Icon name="truck" /></div><div className="booking-kpi-value">{activeCount}</div><p>Handed over, awaiting return</p><small>{overdueCount} overdue return{overdueCount === 1 ? '' : 's'}</small></div>
        <div className="booking-kpi"><div className="booking-kpi-head"><span>Pickups Today</span><Icon name="route" /></div><div className="booking-kpi-value">{pickupToday}</div><p>Confirmed company pickups</p><small className="booking-kpi-warning">Pending handover</small></div>
        <div className="booking-kpi"><div className="booking-kpi-head"><span>Assignment Needed</span><Icon name="assign" /></div><div className="booking-kpi-value">{assignmentToday}</div><p>Due today or overdue</p><small className={assignmentToday ? 'booking-kpi-danger' : ''}>Vehicle / driver to allocate</small></div>
        <div className="booking-kpi"><div className="booking-kpi-head"><span>Trip Value</span><Icon name="wallet" /></div><div className="booking-kpi-value booking-kpi-money">{sar(tripValue)}</div><p>Non-cancelled booked value</p><small>Selected period</small></div>
      </div>
      <section className="booking-panel corporate-list" aria-labelledby="corporate-list-title"><div className="booking-list-head"><div><h2 id="corporate-list-title">Corporate Trips <span>{filtered.length}</span></h2><p>Urgent assignments, pickups, and overdue returns appear first.</p></div><div className="booking-list-legend"><span><i className="booking-dot danger" />{urgentCount} urgent</span><span><i className="booking-dot info" />{overdueCount} overdue overall</span></div></div>
        <div className="booking-toolbar corporate-toolbar"><label className="booking-search"><Icon name="search" /><input type="search" aria-label="Search corporate trips" value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder="Search trip, company, project, route..." /></label><select aria-label="Filter company" value={companyFilter} onChange={(event) => changeFilter(setCompanyFilter, event.target.value)}><option>All companies</option>{companyNames.map((company) => <option key={company}>{company}</option>)}</select><select aria-label="Filter trip type" value={typeFilter} onChange={(event) => changeFilter(setTypeFilter, event.target.value)}><option>All trip types</option><option>Quick</option><option>Advance</option></select><select aria-label="Filter trip status" value={statusFilter} onChange={(event) => changeFilter(setStatusFilter, event.target.value)}><option>All statuses</option>{CORPORATE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select aria-label="Filter billing status" value={billingFilter} onChange={(event) => changeFilter(setBillingFilter, event.target.value)}><option>All billing statuses</option>{['Unbilled', 'Draft', 'Invoiced', 'Paid'].map((status) => <option key={status}>{status}</option>)}</select></div>
        <div className="booking-toolbar booking-date-toolbar"><label>Period<select aria-label="Corporate trip period" value={period} onChange={(event) => changeFilter(setPeriod, event.target.value)}><option>Today</option><option>Last 7 days</option><option>Last 30 days</option><option>This month</option><option>Last month</option><option>Custom range</option><option>All time</option></select></label><label>Date based on<select aria-label="Corporate trip date basis" value={dateBasis} onChange={(event) => changeFilter(setDateBasis, event.target.value)}><option>Booked on</option><option>Pickup date</option><option>Return date</option></select></label>{period === 'Custom range' && <><label>From<input type="date" aria-label="Corporate range from" value={customStart} onChange={(event) => changeFilter(setCustomStart, event.target.value)} /></label><label>To<input type="date" aria-label="Corporate range to" value={customEnd} onChange={(event) => changeFilter(setCustomEnd, event.target.value)} /></label></>}<label>Sort by<select aria-label="Sort corporate trips" value={sort} onChange={(event) => changeFilter(setSort, event.target.value)}><option>Priority first</option><option>Newest booked</option><option>Pickup soonest</option><option>Highest value</option></select></label><label>Rows<select aria-label="Corporate rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={8}>8</option><option value={15}>15</option><option value={30}>30</option></select></label><button type="button" className="booking-reset" onClick={reset}>Reset filters</button></div>
        {!bounds.valid && <p className="booking-error booking-filter-error" role="alert">The start date must be on or before the end date.</p>}
        <div className="booking-table-scroll"><table className="booking-table corporate-table"><thead><tr><th>Trip ID</th><th>Company / Project</th><th>Contact / Pax</th><th>Route</th><th>Pickup / Return</th><th>Vehicle / Driver</th><th>Amount</th><th>Trip Status</th><th>Billing</th><th>Actions</th></tr></thead><tbody>{visible.map((trip) => { const priority = corporatePriority({ ...trip, billingStatus: billingLabel(trip) }, now); return <tr key={trip.id} className={priority.score >= 80 ? 'booking-priority-row' : ''}><td><button type="button" className="booking-id-link" onClick={() => onViewTrip(trip.id)}>{trip.tripId}</button><span className={`booking-type-tag type-${trip.bookingType.toLowerCase()}`}>{trip.bookingType}</span><span className={`booking-row-priority priority-${priority.tone}`}>{priority.label}</span></td><td><strong>{trip.companyName}</strong><small>{trip.projectCode || 'No project code'}</small></td><td><strong>{trip.contactName}</strong><small>{trip.passengerCount} passenger{trip.passengerCount === 1 ? '' : 's'} · {trip.contactPhone}</small></td><td><strong>{trip.pickupLocation}</strong><small>To {trip.destination}{tripStops(trip).length > 2 && ` · ${tripStops(trip).length - 2} stop${tripStops(trip).length === 3 ? '' : 's'}`} · {waitingMinutes(tripStops(trip))} min waiting</small></td><td><span className="booking-date-line"><b>Pickup</b>{formatDateTime(trip.pickupAt)}</span><span className={`booking-date-line ${isOverdue(trip, now) ? 'booking-overdue-text' : ''}`}><b>Return</b>{formatDateTime(trip.returnAt)}{isOverdue(trip, now) && <em>Overdue</em>}</span></td><td><strong>{vehicleFor(trip, vehicles) ? vehicleLabel(trip, vehicles) : `${trip.requestedType} · Unassigned`}</strong><small>{driverLabel(trip, drivers)}</small></td><td className="booking-money">{sar(trip.totalAmount)}</td><td><span className={`booking-status status-${statusClass(trip.status)}`}>{trip.status}</span></td><td><span className={`corporate-billing billing-${statusClass(billingLabel(trip))}`}>{billingLabel(trip)}</span></td><td><button type="button" className="booking-more" aria-label={`More actions for ${trip.tripId}`} onClick={(event) => openMenu(event, trip)}><ActionIcon name="more" size={20} /></button></td></tr> })}</tbody></table>{!visible.length && <div className="booking-empty"><strong>No corporate trips match these filters</strong><p>Try another date range, status, company, or search term.</p><button type="button" onClick={reset}>Reset filters</button></div>}</div>
        <div className="booking-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} trips` : 'Showing 0 trips'}</span><div><button type="button" aria-label="Previous corporate trip page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="back" size={15} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next corporate trip page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="next" size={15} /></button></div></div>
      </section>
      {menu && menuTrip && <><button type="button" className="booking-menu-backdrop" aria-label="Close corporate trip actions" onClick={() => setMenu(null)} /><div className="booking-action-menu" role="menu" style={{ left: menu.x, top: menu.y }}><button role="menuitem" type="button" onClick={() => { onViewTrip(menuTrip.id); setMenu(null) }}><ActionIcon name="eye" /> View Trip</button><button role="menuitem" type="button" onClick={() => { downloadCorporateTripDetails({ ...menuTrip, billingStatus: billingLabel(menuTrip) }, vehicles, drivers); setMenu(null) }}><ActionIcon name="download" /> Download Details</button>{!['Completed', 'Cancelled'].includes(menuTrip.status) && <button role="menuitem" type="button" onClick={() => openDialog('edit', menuTrip)}><ActionIcon name="edit" /> Edit Trip</button>}{menuTrip.status === 'Pending' && <button role="menuitem" type="button" onClick={() => openDialog('confirm', menuTrip)}><ActionIcon name="check" /> Confirm Trip</button>}{menuTrip.status === 'Confirmed' && dayKey(menuTrip.pickupAt) <= today && <button role="menuitem" type="button" onClick={() => openDialog('assign', menuTrip)}><ActionIcon name="assign" /> Assign & Handover</button>}{menuTrip.status === 'Active' && <button role="menuitem" type="button" onClick={() => openDialog('complete', menuTrip)}><ActionIcon name="check" /> Complete Trip</button>}{(menuTrip.status === 'Completed' || invoiceFor(menuTrip)) && <button role="menuitem" type="button" onClick={() => { onInvoice(menuTrip); setMenu(null) }}><ActionIcon name="wallet" /> {invoiceFor(menuTrip) ? 'View Invoice' : 'Create Invoice'}</button>}{['Pending', 'Confirmed'].includes(menuTrip.status) && <><div className="booking-menu-separator" /><button role="menuitem" type="button" className="danger" onClick={() => openDialog('cancel', menuTrip)}><ActionIcon name="close" /> Cancel Trip</button></>}</div></>}
    </>}
    {dialog && <div className="booking-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className={`booking-dialog ${['quick', 'advance', 'edit'].includes(dialog) ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="corporate-dialog-title"><div className="booking-dialog-heading"><div><span className="booking-demo-mark">RENTAL OPERATIONS</span><h2 id="corporate-dialog-title">{({ quick: 'Quick Corporate Trip', advance: 'Schedule Corporate Trip', edit: 'Edit Corporate Trip', assign: 'Assign & Handover', confirm: 'Confirm Trip', complete: 'Complete Trip', cancel: 'Cancel Trip', company: 'Add Company' })[dialog]}</h2></div><button type="button" aria-label="Close dialog" onClick={closeDialog}><Icon name="close" size={20} /></button></div>
      {actionError && <p className="booking-error" role="alert">{actionError}</p>}
      {['quick', 'advance', 'edit'].includes(dialog) && <CorporateTripForm key={selected?.id || dialog} initial={selected} kind={dialog === 'quick' ? 'Quick' : 'Advance'} trips={trips} bookings={bookings} companies={companies} quotes={quotes} onAddCompany={createCompany} vehicles={vehicles} drivers={drivers} onSave={saveTrip} onCancel={closeDialog} />}
      {dialog === 'company' && <CompanyEditor companies={companies} onSave={async (details) => { await createCompany(details); closeDialog() }} onCancel={closeDialog} />}
      {dialog === 'assign' && selected && <CorporateAssignment trip={selected} trips={trips} bookings={bookings} vehicles={vehicles} drivers={drivers} onSave={saveAssignment} onCancel={closeDialog} />}

      {['confirm', 'complete', 'cancel'].includes(dialog) && selected && <div className="booking-dialog-body"><p className="booking-dialog-note">{dialog === 'confirm' ? `Confirm ${selected.tripId} for ${selected.companyName}? Vehicle and driver assignment remains for the trip day.` : dialog === 'complete' ? `Mark ${selected.tripId} completed? This records the return.` : `Cancel ${selected.tripId} for ${selected.companyName}? It will remain in the list as Cancelled.`}</p><div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={closeDialog}>Keep Current Status</button><button type="button" className={dialog === 'cancel' ? 'booking-danger' : 'booking-primary'} onClick={() => updateSelected(dialog === 'complete' ? { status: 'Completed', actualReturnAt: localDateTime(new Date()) } : { status: dialog === 'confirm' ? 'Confirmed' : 'Cancelled' })}>{dialog === 'confirm' ? 'Confirm Trip' : dialog === 'complete' ? 'Complete Trip' : 'Cancel Trip'}</button></div></div>}
    </div></div>}
  </div>
}
