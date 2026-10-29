import { driverBookingIssue } from '../drivers/DriverData.js'
import { canAssignRental } from '../../shared/lib/assignmentAlert.js'
import useRentalDialog from '../../shared/hooks/useRentalDialog.js'
import { rentalDate } from '../../shared/lib/rentalTime.js'
import { vehicleBookingCandidate, vehicleReadiness } from '../../shared/lib/rentalPolicy.js'
import VehicleReadinessNotice from '../../shared/components/VehicleReadinessNotice.jsx'
import useRentalTableHeader from '../../shared/hooks/useRentalTableHeader.js'
import { RentalIcon as Icon, RentalHeading, RentalKpis, RentalFilters, DateBand, StreamFooter, RentalMenu } from '../../shared/components/RentalRegister.jsx'
import useRegisterStream from '../../shared/hooks/useRegisterStream.js'
import { streamEntries } from '../../shared/lib/registerStream.js'
import { useCallback, useState } from 'react'
import { dayKey, formatDateTime, inDateRange, localDateTime, periodBounds, sar, shiftDays } from '../bookings/BookingData.js'
import { CORPORATE_STATUSES, corporatePriority, resourceConflict, tripPassengers, tripStops, waitingMinutes } from './CorporateData.js'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import CorporateTripForm from './CorporateTripForm.jsx'
import CorporateTripDetails from './CorporateTripDetails.jsx'
import CustomerEditor from '../customers/CustomerEditor.jsx'
import { prepareCustomerForm } from '../customers/CustomerEditorData.js'
import { saveCustomerRecord } from '../customers/CustomerApi.js'
import { assignCorporateTrip, corporateStatus, saveCorporateTripForCustomer } from './CorporateTripApi.js'
import { corporateTripListCsv, downloadCorporateTripDetails } from './CorporateExport.js'
import { downloadCsv } from '../../shared/lib/csv.js'
import { invoicePaymentStatus } from '../invoices/InvoiceData.js'
import '../bookings/BookingPage.css'
import './CorporateTripsPage.css'

const vehicleFor = (trip, vehicles) => vehicles.find((vehicle) => vehicle.id === trip.vehicleId)
const driverFor = (trip, drivers) => drivers.find((driver) => driver.id === trip.driverId)
const vehicleLabel = (trip, vehicles) => {
  const vehicle = vehicleFor(trip, vehicles)
  return vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : `${trip.requestedType} requested · awaiting assignment`
}
const driverLabel = (trip, drivers) => trip.serviceMode === 'Self-drive' ? 'Self-drive' : driverFor(trip, drivers)?.name || 'Unassigned'
const statusClass = (status) => status.toLowerCase().replaceAll(' ', '-')
const isOverdue = (trip, now = new Date()) => trip.status === 'Active' && rentalDate(trip.returnAt) < now
function CorporateAssignment({ trip, trips, bookings, vehicles, drivers, onSave, onCancel }) {
  const [vehicleId, setVehicleId] = useState(String(trip.vehicleId || ''))
  const [driverId, setDriverId] = useState(String(trip.driverId || ''))
  const [search, setSearch] = useState('')
  const [handedOver, setHandedOver] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const candidates = vehicles.filter((vehicle) => vehicleBookingCandidate(vehicle, trip.vehicleId) && vehicle.type === trip.requestedType && Number(vehicle.seats || 0) >= trip.passengerCount)
  const shown = candidates.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.registration}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 30)
  const chosen = candidates.find((vehicle) => vehicle.id === Number(vehicleId))
  if (chosen && !shown.some((vehicle) => vehicle.id === chosen.id)) shown.unshift(chosen)
  const activeDrivers = drivers.filter((driver) => driver.status === 'Active' || driver.id === trip.driverId)
  const save = async (event) => {
    event.preventDefault()
    if (trip.serviceMode === 'With driver') { const issue = driverBookingIssue(drivers.find(d => d.id === Number(driverId)), trip.returnAt); if (issue) { setError('Driver assignment blocked: '+issue); return } }
    if (saving) return
    if (!chosen || (trip.serviceMode === 'With driver' && !driverId)) { setError('Select a vehicle and, for a driven trip, a driver.'); return }
    if (handedOver && vehicleReadiness(chosen).length) { setError('Handover blocked: '+vehicleReadiness(chosen).join('. ')); return }
    if (handedOver && tripPassengers(trip).length !== trip.passengerCount) { setError('Complete the passenger list before handover.'); return }
    if (resourceConflict('vehicle', vehicleId, trip.pickupAt, trip.returnAt, trip.id, trips, bookings)) { setError('This vehicle overlaps another trip or booking.'); return }
    if (trip.serviceMode === 'With driver' && resourceConflict('driver', driverId, trip.pickupAt, trip.returnAt, trip.id, trips, bookings)) { setError('This driver overlaps another trip or booking.'); return }
    setSaving(true)
    try { await onSave({ vehicleId: Number(vehicleId), driverId: trip.serviceMode === 'With driver' ? Number(driverId) : null, status: handedOver ? 'Active' : 'Confirmed', handedOverAt: handedOver ? localDateTime(new Date()) : '' }) }
    catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }
  return <form className="booking-form corporate-assignment" onSubmit={save} noValidate>
    <p className="booking-dialog-note"><strong>{trip.tripId}</strong> · {trip.companyName} · {trip.passengerCount} passenger{trip.passengerCount === 1 ? '' : 's'}. Assign resources from the saved alert time or on the pickup day. Handover remains available on the pickup day.</p>
    <div className="booking-form-grid"><div className="booking-vehicle-picker"><label>Search {trip.requestedType} Vehicles<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Make, model or registration" /></label><label><FormFieldCaption required>Vehicle</FormFieldCaption><select required value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setError('') }}><option value="">Select vehicle</option>{shown.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.registration} · {vehicle.seats} seats</option>)}</select></label><small>{shown.length} of {candidates.length} suitable vehicles shown</small>{!candidates.length && <p className="booking-help" role="status">No suitable vehicles are available and listed for booking. Review availability, booking visibility, type and seating in Fleet.</p>}</div>
      {trip.serviceMode === 'With driver' ? <label><FormFieldCaption required>Driver</FormFieldCaption><select required value={driverId} onChange={(event) => { setDriverId(event.target.value); setError('') }}><option value="">Select driver</option>{activeDrivers.map((driver) => { const issue = driverBookingIssue(driver, trip.returnAt); return <option key={driver.id} value={driver.id} disabled={Boolean(issue)}>{driver.name} · {driver.employeeId}{issue ? ` — ${issue}` : ''}</option> })}</select></label> : <div className="booking-self-drive-note">Self-drive · no driver assignment needed</div>}
      <VehicleReadinessNotice vehicle={chosen}/><label className="booking-wide-field booking-check-field"><input type="checkbox" disabled={dayKey(trip.pickupAt) > dayKey(new Date())} checked={handedOver} onChange={(event) => setHandedOver(event.target.checked)} /><span>Vehicle handed over — mark trip Active</span></label>
    </div>{error && <p className="booking-error" role="alert">{error}</p>}<div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="booking-primary" disabled={saving}><Icon name="assign" size={16} /> {saving ? 'Saving…' : handedOver ? 'Assign & Start Trip' : 'Save Assignment'}</button></div>
  </form>
}

function CorporateDetail({ trip, vehicles, drivers, onBack, onEdit, onAssign, onInvoice, invoiceAvailable, onComplete, onExport, onCancel }) {
  if (!trip) return <section className="booking-panel booking-not-found"><h2>Corporate trip not found</h2><button type="button" className="booking-primary" onClick={onBack}><Icon name="back" size={16} /> Back to Corporate Trips</button></section>
  const priority = corporatePriority(trip)
  const canAssign = canAssignRental(trip)
  return <div className="corporate-detail"><button type="button" className="booking-back" onClick={onBack}><Icon name="back" /> Back to Corporate Trips</button>
    <section className="booking-panel booking-detail-hero"><div className="booking-detail-main"><span className="booking-eyebrow">{trip.bookingType.toUpperCase()} CORPORATE TRIP</span><h2>{trip.tripId}</h2><p>{trip.companyName} · {trip.pickupLocation} → {trip.destination}</p><div className="booking-badges"><span className={`booking-status status-${statusClass(trip.status)}`}>{trip.status}</span><span className={`corporate-billing billing-${statusClass(trip.billingStatus)}`}>{trip.billingStatus}</span><span className={`booking-priority priority-${priority.tone}`}>{priority.label}</span></div></div><div className="booking-detail-actions">{canAssign && <button type="button" className="booking-primary" onClick={onAssign}><Icon name="assign" /> Assign Resources</button>}{!['Cancelled', 'Completed'].includes(trip.status) && <button type="button" className="booking-secondary" onClick={onEdit}><Icon name="edit" /> Edit Trip</button>}{trip.status === 'Active' && <button type="button" className="booking-secondary" onClick={onComplete}><Icon name="check" /> Complete Trip</button>}{(trip.status === 'Completed' || invoiceAvailable) && <button type="button" className="booking-secondary" onClick={onInvoice}><Icon name="wallet" /> {invoiceAvailable ? 'View Invoice' : 'Create Invoice'}</button>}<button type="button" className="booking-secondary" onClick={onExport}><Icon name="download" /> Download Details</button></div></section>
    <div className="booking-detail-grid"><CorporateTripDetails trip={trip} vehicleLabel={vehicleLabel(trip, vehicles)} driverLabel={driverLabel(trip, drivers)} overdue={isOverdue(trip)} />
      <section className="booking-panel booking-detail-card"><h3>Trip Controls</h3><p className="corporate-control-note">Confirmed trips can receive a matching vehicle and driver from the saved assignment alert time or on the pickup day. Handover is available on the pickup day. Assignments and handovers are recorded with the trip.</p><div className="corporate-control-actions">{canAssign && <button type="button" className="booking-primary" onClick={onAssign}><Icon name="assign" size={16} /> Assign Resources</button>}{trip.status === 'Active' && <button type="button" className="booking-secondary" onClick={onComplete}><Icon name="check" size={16} /> Mark Completed</button>}{['Pending', 'Confirmed'].includes(trip.status) && <button type="button" className="booking-danger-link" onClick={onCancel}>Cancel Trip</button>}</div></section></div>
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
  const billingLabel = (trip) => { const invoice = invoiceFor(trip); return !invoice ? 'Unbilled' : invoice.status === 'Draft' ? 'Draft' : ['Paid','Credited'].includes(invoicePaymentStatus(invoice)) ? 'Paid' : 'Invoiced' }
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
    if (sort === 'Newest booked') return rentalDate(b.bookedAt) - rentalDate(a.bookedAt)
    if (sort === 'Pickup soonest') return rentalDate(a.pickupAt) - rentalDate(b.pickupAt)
    if (sort === 'Highest value') return b.totalAmount - a.totalAmount
    return corporatePriority({ ...b, billingStatus: billingLabel(b) }, now).score - corporatePriority({ ...a, billingStatus: billingLabel(a) }, now).score || rentalDate(a.pickupAt) - rentalDate(b.pickupAt)
  })
  const stream = useRegisterStream({ rows: filtered, resetKey: JSON.stringify([query, companyFilter, statusFilter, billingFilter, typeFilter, period, dateBasis, customStart, customEnd, sort]), detailOpen: Boolean(viewTripId) })
  const tableRef = useRentalTableHeader(Boolean(viewTripId))
  const entries = streamEntries(stream.visible, sort, now)
  const urgentCount = filtered.filter((trip) => corporatePriority({ ...trip, billingStatus: billingLabel(trip) }, now).score >= 80).length
  const changeFilter = (setter, value) => { setter(value); setMenu(null) }
  const reset = () => { setQuery(''); setCompanyFilter('All companies'); setStatusFilter('All statuses'); setBillingFilter('All billing statuses'); setTypeFilter('All trip types'); setPeriod('Last 30 days'); setDateBasis('Booked on'); setSort('Priority first') }
  const openDialog = (kind, trip = null) => { setDialog(kind); setDialogId(trip?.id || null); setMenu(null) }
  const closeDialog = useCallback(() => { setDialog(null); setDialogId(null) }, [])
  useRentalDialog(Boolean(dialog), closeDialog)
  const createCompany = async (details) => {
    details = prepareCustomerForm('Corporate', details, companies)
    const company = await saveCustomerRecord('Corporate', details)
    setCompanies((current) => [...current, company])
    setCompanyNotice(`${company.name} saved in Customers and available for corporate trips.`)
    return company
  }
  const saveTrip = async (record) => {
    const saved = await saveCorporateTripForCustomer(record, companies)
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
    if (!canAssignRental(selected)) return
    const saved = await assignCorporateTrip(selected.id, changes)
    void onResourcesChanged?.()
    setTrips((current) => current.map((trip) => trip.id === saved.id ? saved : trip))
    closeDialog()
  }
  const openMenu = (event, trip) => { const rect = event.currentTarget.getBoundingClientRect(); setMenu({ id: trip.id, trigger: event.currentTarget, x: Math.max(8, Math.min(rect.right - 215, window.innerWidth - 225)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 355)) }) }
  const menuTrip = trips.find((trip) => trip.id === menu?.id)

  return <div className="corporate-page rental-register-page">
    {actionError && <p className="booking-error" role="alert">{actionError}</p>}
    {viewTripId ? <CorporateDetail trip={viewed ? { ...viewed, billingStatus: billingLabel(viewed) } : viewed} vehicles={vehicles} drivers={drivers} onBack={onBack} onEdit={() => openDialog('edit', viewed)} onAssign={() => openDialog('assign', viewed)} onInvoice={() => onInvoice(viewed)} invoiceAvailable={Boolean(invoiceFor(viewed))} onExport={() => downloadCorporateTripDetails({ ...viewed, billingStatus: billingLabel(viewed) }, vehicles, drivers)} onComplete={() => openDialog('complete', viewed)} onCancel={() => openDialog('cancel', viewed)} /> : <>
      <RentalHeading title="Corporate Trips" description="Manage company trip requests, assignments, and billing."><div className="admin-page-actions" role="group" aria-label="Corporate trip actions"><div className="admin-page-action-buttons"><button type="button" data-permission="customers.create" className="booking-secondary" onClick={() => openDialog('company')}><Icon name="plus" /> Add Corporate Customer</button><button type="button" className="booking-secondary" disabled={!filtered.length} onClick={() => downloadCsv('corporate-trips-filtered.csv', corporateTripListCsv(filtered.map((trip) => ({ ...trip, billingStatus: billingLabel(trip) })), vehicles, drivers))}><Icon name="download" /> Export List CSV</button><button type="button" className="booking-secondary" aria-label="Create quick trip" onClick={() => openDialog('quick')}><Icon name="plus" /> Quick Trip</button><button type="button" className="booking-primary" aria-label="Create scheduled trip" onClick={() => openDialog('advance')}><Icon name="calendar" /> Schedule Trip</button></div></div></RentalHeading>
      {companyNotice && <p className="corporate-company-notice" role="status">{companyNotice}</p>}
      <RentalKpis label="Corporate trip KPIs" items={[
        { label: 'Corporate Trips', value: periodTrips.length, icon: 'briefcase', detail: 'Trips in the selected period', context: `${period} · ${dateBasis.toLowerCase()}` },
        { label: 'Active Trips', value: activeCount, icon: 'truck', tone: 'green', detail: 'Handed over, awaiting return', context: `${overdueCount} overdue return${overdueCount === 1 ? '' : 's'}` },
        { label: 'Pickups Today', value: pickupToday, icon: 'route', tone: 'purple', detail: 'Confirmed company pickups', context: 'Pending handover', summary: 'Confirmed for pickup today' },
        { label: 'Assignment Needed', value: assignmentToday, icon: 'assign', tone: 'amber', detail: 'Due today or overdue', context: 'Vehicle / driver to allocate', summary: 'Due today or overdue' },
        { label: 'Trip Value', value: sar(tripValue), icon: 'wallet', detail: 'Non-cancelled booked value', context: 'Selected period', summary: 'Non-cancelled booked value' },
      ]} />
      <section className="booking-panel corporate-list" aria-labelledby="corporate-list-title"><div className="booking-list-head"><div><h2 id="corporate-list-title">Corporate Trips <span>{filtered.length}</span></h2><p>Urgent assignments, pickups, and overdue returns appear first.</p></div><div className="booking-list-legend"><span><i className="booking-dot danger" />{urgentCount} urgent</span><span><i className="booking-dot info" />{overdueCount} overdue overall</span></div></div>
        <RentalFilters search={<label className="booking-search"><Icon name="search" /><input type="search" aria-label="Search corporate trips" value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder="Search trip, company, project, route..." /></label>} summary={<><span>Saudi Arabia time (KSA, UTC+03:00). {filtered.length} matching trips.</span><span className="rental-urgent">{urgentCount} urgent · {overdueCount} overdue overall</span><span>{sort === 'Priority first' ? 'Urgent assignments, pickups and returns appear first.' : sort === 'Highest value' ? 'Highest value first.' : 'Grouped by ' + (sort === 'Newest booked' ? 'booking date' : sort === 'Return soonest' ? 'return date' : 'pickup date') + '.'}</span></>}><label>Company<select aria-label="Filter company" value={companyFilter} onChange={(event) => changeFilter(setCompanyFilter, event.target.value)}><option>All companies</option>{companyNames.map((company) => <option key={company}>{company}</option>)}</select></label><label>Trip type<select aria-label="Filter trip type" value={typeFilter} onChange={(event) => changeFilter(setTypeFilter, event.target.value)}><option value="All trip types">All types</option><option>Quick</option><option>Advance</option></select></label><label>Trip status<select aria-label="Filter trip status" value={statusFilter} onChange={(event) => changeFilter(setStatusFilter, event.target.value)}><option>All statuses</option>{CORPORATE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label>Billing status<select aria-label="Filter billing status" value={billingFilter} onChange={(event) => changeFilter(setBillingFilter, event.target.value)}><option value="All billing statuses">All statuses</option>{['Unbilled', 'Draft', 'Invoiced', 'Paid'].map((status) => <option key={status}>{status}</option>)}</select></label><label>Period<select aria-label="Corporate trip period" value={period} onChange={(event) => changeFilter(setPeriod, event.target.value)}><option>Today</option><option>Last 7 days</option><option>Last 30 days</option><option>This month</option><option>Last month</option><option>Custom range</option><option>All time</option></select></label><label>Date based on<select aria-label="Corporate trip date basis" value={dateBasis} onChange={(event) => changeFilter(setDateBasis, event.target.value)}><option>Booked on</option><option>Pickup date</option><option>Return date</option></select></label>{period === 'Custom range' && <><label>From<input type="date" aria-label="Corporate range from" value={customStart} onChange={(event) => changeFilter(setCustomStart, event.target.value)} /></label><label>To<input type="date" aria-label="Corporate range to" value={customEnd} onChange={(event) => changeFilter(setCustomEnd, event.target.value)} /></label></>}<label>Sort by<select aria-label="Sort corporate trips" value={sort} onChange={(event) => changeFilter(setSort, event.target.value)}><option>Priority first</option><option>Newest booked</option><option>Pickup soonest</option><option>Highest value</option></select></label><button type="button" className="booking-reset" aria-label="Reset filters" onClick={reset}>Reset</button></RentalFilters>
        {!bounds.valid && <p className="booking-error booking-filter-error" role="alert">The start date must be on or before the end date.</p>}
        <div className="booking-table-scroll"><table className="booking-table corporate-table" ref={tableRef}><thead><tr><th>Trip ID</th><th>Company / Project</th><th>Contact / Pax</th><th>Route</th><th>Pickup / Return</th><th>Vehicle / Driver</th><th>Amount</th><th>Trip Status</th><th>Billing</th><th>Actions</th></tr></thead><tbody>{entries.map((entry) => { if (entry.kind === 'date') return <DateBand key={entry.key} entry={entry} columns={10} />; const trip = entry.row; const priority = corporatePriority({ ...trip, billingStatus: billingLabel(trip) }, now); return <tr key={trip.id} data-register-record={trip.id} className={priority.score >= 80 ? 'booking-priority-row' : ''}><td><button type="button" className="booking-id-link" onClick={(event) => stream.rememberPosition(onViewTrip, trip.id, event.currentTarget)}>{trip.tripId}</button><span className={`booking-type-tag type-${trip.bookingType.toLowerCase()}`}>{trip.bookingType}</span>{priority.score >= 70 && <span className={`booking-row-priority priority-${priority.tone}`}>{priority.label}</span>}</td><td><strong>{trip.companyName}</strong><small>{trip.projectCode || 'No project code'}</small></td><td><strong>{trip.contactName}</strong><small>{trip.passengerCount} passenger{trip.passengerCount === 1 ? '' : 's'} · {trip.contactPhone}</small></td><td><strong>{trip.pickupLocation}</strong><small>To {trip.destination}{tripStops(trip).length > 2 && ` · ${tripStops(trip).length - 2} stop${tripStops(trip).length === 3 ? '' : 's'}`} · {waitingMinutes(tripStops(trip))} min waiting</small></td><td><span className="booking-date-line"><b>Pickup</b>{formatDateTime(trip.pickupAt)}</span><span className={`booking-date-line ${isOverdue(trip, now) ? 'booking-overdue-text' : ''}`}><b>Return</b>{formatDateTime(trip.returnAt)}{isOverdue(trip, now) && <em>Overdue</em>}</span></td><td><strong>{vehicleFor(trip, vehicles) ? vehicleLabel(trip, vehicles) : `${trip.requestedType} · Unassigned`}</strong><small>{driverLabel(trip, drivers)}</small></td><td className="booking-money">{sar(trip.totalAmount)}</td><td><span className={`booking-status status-${statusClass(trip.status)}`}>{trip.status}</span></td><td><span className={`corporate-billing billing-${statusClass(billingLabel(trip))}`}>{billingLabel(trip)}</span></td><td><button type="button" className="booking-more" aria-label={`More actions for ${trip.tripId}`} aria-haspopup="menu" aria-expanded={menu?.id === trip.id} onClick={(event) => openMenu(event, trip)}><Icon name="more" size={20} /></button></td></tr> })}</tbody></table>{!stream.visible.length && <div className="booking-empty"><strong>No corporate trips match these filters</strong><p>Try another date range, status, company, or search term.</p><button type="button" onClick={reset}>Reset filters</button></div>}</div>
        <StreamFooter {...stream} noun="trips" />
      </section>
      {menu && menuTrip && <RentalMenu menu={menu} onClose={() => setMenu(null)} label="Corporate trip actions"><button role="menuitem" type="button" onClick={() => { stream.rememberPosition(onViewTrip, menuTrip.id, menu.trigger); setMenu(null) }}><Icon name="eye" /> View Trip</button><button role="menuitem" type="button" onClick={() => { downloadCorporateTripDetails({ ...menuTrip, billingStatus: billingLabel(menuTrip) }, vehicles, drivers); setMenu(null) }}><Icon name="download" /> Download Details</button>{!['Completed', 'Cancelled'].includes(menuTrip.status) && <button role="menuitem" type="button" onClick={() => openDialog('edit', menuTrip)}><Icon name="edit" /> Edit Trip</button>}{menuTrip.status === 'Pending' && <button role="menuitem" type="button" aria-label="Update trip confirmation" onClick={() => openDialog('confirm', menuTrip)}><Icon name="check" /> Confirm Trip</button>}{canAssignRental(menuTrip) && <button role="menuitem" type="button" onClick={() => openDialog('assign', menuTrip)}><Icon name="assign" /> Assign Resources</button>}{menuTrip.status === 'Active' && <button role="menuitem" type="button" onClick={() => openDialog('complete', menuTrip)}><Icon name="check" /> Complete Trip</button>}{(menuTrip.status === 'Completed' || invoiceFor(menuTrip)) && <button role="menuitem" type="button" onClick={() => { onInvoice(menuTrip); setMenu(null) }}><Icon name="wallet" /> {invoiceFor(menuTrip) ? 'View Invoice' : 'Create Invoice'}</button>}{['Pending', 'Confirmed'].includes(menuTrip.status) && <><div className="booking-menu-separator" /><button role="menuitem" type="button" className="danger" onClick={() => openDialog('cancel', menuTrip)}><Icon name="close" /> Cancel Trip</button></>}</RentalMenu>}
    </>}
    {dialog && <div className="booking-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className={`booking-dialog ${['quick', 'advance', 'edit', 'company'].includes(dialog) ? 'wide' : ''}`} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="corporate-dialog-title"><div className="booking-dialog-heading"><div><span className="booking-demo-mark">RENTAL OPERATIONS</span><h2 id="corporate-dialog-title">{({ quick: 'Quick Corporate Trip', advance: 'Schedule Corporate Trip', edit: 'Edit Corporate Trip', assign: 'Assign & Handover', confirm: 'Confirm Trip', complete: 'Complete Trip', cancel: 'Cancel Trip', company: 'Add Corporate Customer' })[dialog]}</h2></div><button type="button" aria-label="Close dialog" onClick={closeDialog}><Icon name="close" size={20} /></button></div>
      {actionError && <p className="booking-error" role="alert">{actionError}</p>}
      {['quick', 'advance', 'edit'].includes(dialog) && <CorporateTripForm key={selected?.id || dialog} initial={selected} kind={dialog === 'quick' ? 'Quick' : 'Advance'} trips={trips} bookings={bookings} companies={companies} quotes={quotes} onAddCompany={createCompany} vehicles={vehicles} drivers={drivers} onSave={saveTrip} onCancel={closeDialog} />}
      {dialog === 'company' && <CustomerEditor type="Corporate" lockType rows={companies} onSave={async (type, details) => { if (type !== 'Corporate') throw new Error('Choose a corporate customer.'); await createCompany(details); closeDialog() }} onCancel={closeDialog} />}
      {dialog === 'assign' && selected && <CorporateAssignment trip={selected} trips={trips} bookings={bookings} vehicles={vehicles} drivers={drivers} onSave={saveAssignment} onCancel={closeDialog} />}

      {['confirm', 'complete', 'cancel'].includes(dialog) && selected && <div className="booking-dialog-body"><p className="booking-dialog-note">{dialog === 'confirm' ? `Confirm ${selected.tripId} for ${selected.companyName}? Vehicle and driver assignment remains for the trip day.` : dialog === 'complete' ? `Mark ${selected.tripId} completed? This records the return.` : `Cancel ${selected.tripId} for ${selected.companyName}? It will remain in the list as Cancelled.`}</p><div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={closeDialog}>Keep Current Status</button><button type="button" className={dialog === 'cancel' ? 'booking-danger' : 'booking-primary'} onClick={() => updateSelected(dialog === 'complete' ? { status: 'Completed', actualReturnAt: localDateTime(new Date()) } : { status: dialog === 'confirm' ? 'Confirmed' : 'Cancelled' })}>{dialog === 'confirm' ? 'Confirm Trip' : dialog === 'complete' ? 'Complete Trip' : 'Cancel Trip'}</button></div></div>}
    </div></div>}
  </div>
}
