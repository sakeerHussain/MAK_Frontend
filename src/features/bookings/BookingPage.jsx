import { driverBookingIssue } from '../drivers/DriverData.js'
import AssignmentAlertFields from '../../shared/components/AssignmentAlertFields.jsx'
import { assignmentAlertError, suggestedAssignmentAlert, canAssignRental } from '../../shared/lib/assignmentAlert.js'
import useRentalDialog from '../../shared/hooks/useRentalDialog.js'
import { rentalDate } from '../../shared/lib/rentalTime.js'
import { vehicleBookingCandidate, vehicleRateForUnit, vehicleReadiness, paymentChoices } from '../../shared/lib/rentalPolicy.js'
import VehicleReadinessNotice from '../../shared/components/VehicleReadinessNotice.jsx'
import useRentalTableHeader from '../../shared/hooks/useRentalTableHeader.js'
import { RentalIcon as Icon, RentalHeading, RentalKpis, RentalFilters, DateBand, StreamFooter, RentalMenu } from '../../shared/components/RentalRegister.jsx'
import useRegisterStream from '../../shared/hooks/useRegisterStream.js'
import { streamEntries } from '../../shared/lib/registerStream.js'
import EmailDeliveryPanel from '../../shared/components/EmailDeliveryPanel.jsx'
import { useCallback, useEffect, useState } from 'react'
import { assignBooking, bookingPayment, bookingStatus, saveBookingRecord } from './BookingApi.js'
import { balanceDue, bookingPriority, BOOKING_STATUSES, dayKey, formatDateTime, inDateRange, isOverdue, localDateTime, netPaid, PAYMENT_STATUSES, paymentStatus, periodBounds, sar, shiftDays } from './BookingData.js'
import { bookingListCsv, downloadBookingDetails } from './BookingExport.js'
import { downloadCsv } from '../../shared/lib/csv.js'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { TYPE_OPTIONS } from '../fleet/FleetData.js'
import { activeQuoteFor, customerKey, money, normalizePlace, pricePreview } from '../customers/CustomerData.js'
import './BookingPage.css'

const vehicleName = (booking, vehicles) => {
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId)
  return vehicle ? `${vehicle.make} ${vehicle.model}` : booking.requestedType ? `${booking.requestedType} requested` : 'Awaiting vehicle assignment'
}
const vehicleRegistration = (booking, vehicles) => vehicles.find((item) => item.id === booking.vehicleId)?.registration || (booking.bookingType === 'Advance' ? 'Awaiting assignment' : '—')
const driverName = (booking, drivers) => booking.driverMode === 'Self-drive' ? 'Self-drive' : booking.driverMode !== 'Assigned' ? 'Unassigned' : drivers.find((item) => item.id === booking.driverId)?.name || 'Unassigned'
const dateFieldValue = (booking, basis) => basis === 'Pickup date' ? booking.pickupAt : basis === 'Return date' ? booking.returnAt : booking.bookedAt
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const unitPriceLabel = (booking) => booking.unitPrice ? `${sar(booking.unitPrice)} / ${(booking.rateUnit || 'Day').toLowerCase()}` : '—'

function BookingForm({ initial, bookingType, bookings, vehicles, drivers, customers, quotes, onCancel, onSave }) {
  const now = new Date()
  const kind = initial?.bookingType || bookingType
  const isAdvance = kind === 'Advance'
  const [form, setForm] = useState(() => ({
    customerId: String(initial?.customerId || ''), customerName: initial?.customerName || '', customerPhone: initial?.customerPhone || '', customerEmail: initial?.customerEmail || '',
    emailNotifications: initial?.emailNotifications ?? true,
      assignmentAlertAt: initial?.assignmentAlertAt || suggestedAssignmentAlert(initial?.pickupAt || localDateTime(isAdvance ? shiftDays(now, 1) : now)), assignmentAlertReviewedForPickup: '',
    vehicleId: String(initial?.vehicleId || ''), requestedType: initial?.requestedType || 'Sedan',
    driverMode: initial?.driverMode || (isAdvance ? 'Unassigned' : 'Self-drive'),
    driverId: String(initial?.driverId || ''), pickupAt: initial?.pickupAt || localDateTime(isAdvance ? shiftDays(now, 1) : now),
    returnAt: initial?.returnAt || localDateTime(shiftDays(now, isAdvance ? 4 : 1)),
    pickupLocation: initial?.pickupLocation || '', destination: initial?.destination || '',
    rateUnit: initial?.rateUnit || 'Day', unitPrice: initial?.unitPrice != null ? String(initial.unitPrice) : '',
    quoteVehicle: initial?.quoteSnapshot?.vehicle || initial?.requestedType || 'Sedan', extraKm: String(initial?.extraKm || 0), overtimeHours: String(initial?.overtimeHours || 0), extraDriver: Boolean(initial?.extraDriver), oneWayKm: String(initial?.oneWayKm || 0), quoteSnapshot: initial?.quoteSnapshot || null,
    totalAmount: initial ? String(initial.totalAmount) : '', deposit: '',
    status: initial?.status || 'Confirmed', handoverNow: false, notes: initial?.notes || '',
  }))
  const [error, setError] = useState('')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (name, value) => { setForm((current) => ({ ...current, [name]: value, ...(['pickupAt', 'assignmentAlertAt'].includes(name) ? { assignmentAlertReviewedForPickup: '' } : {}), ...(name === 'requestedType' ? { quoteVehicle: value } : {}), ...(['customerName', 'customerPhone', 'customerEmail'].includes(name) ? { customerId: '' } : {}), ...(['customerName', 'customerPhone', 'customerEmail', 'pickupLocation', 'destination', 'pickupAt', 'requestedType', 'quoteVehicle', 'extraKm', 'overtimeHours', 'extraDriver', 'oneWayKm', 'unitPrice', 'totalAmount', 'rateUnit'].includes(name) ? { quoteSnapshot: null } : {}) })); setError('') }
  const eligibleVehicles = vehicles.filter((vehicle) => vehicleBookingCandidate(vehicle, initial?.vehicleId))
  const shownVehicles = eligibleVehicles.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.registration}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase())).slice(0, 30)
  const selectedVehicle = eligibleVehicles.find((vehicle) => vehicle.id === Number(form.vehicleId))
  if (selectedVehicle && !shownVehicles.some((vehicle) => vehicle.id === selectedVehicle.id)) shownVehicles.unshift(selectedVehicle)
  const activeDrivers = drivers.filter((driver) => driver.status === 'Active' || driver.id === initial?.driverId)
  const quote = form.customerId ? activeQuoteFor(quotes, customerKey('Individual', Number(form.customerId)), dayKey(form.pickupAt)) : null
  const matchingRoutes = quote?.routes.filter((rate) => normalizePlace(rate.from) === normalizePlace(form.pickupLocation) && normalizePlace(rate.to) === normalizePlace(form.destination) && !normalizePlace(rate.via) && [isAdvance ? form.requestedType : selectedVehicle?.type || form.requestedType, selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : ''].some((vehicle) => normalizePlace(vehicle) === normalizePlace(rate.vehicle))) || []
  const quoteEstimate = quote ? pricePreview(quote, { kind: 'Fixed route', from: form.pickupLocation, to: form.destination, vehicle: form.quoteVehicle, extraKm: form.extraKm, overtimeHours: form.overtimeHours, extraDriver: form.extraDriver, oneWayKm: form.oneWayKm }) : null
  const applyQuote = () => {
    if (!quoteEstimate?.match || !matchingRoutes.some((rate) => rate.id === quoteEstimate.match.id)) return
    const snapshot = { quoteId: quote.id, quoteNumber: quote.number, version: quote.version, ruleId: quoteEstimate.match.id, vehicle: form.quoteVehicle,
      from: form.pickupLocation, to: form.destination, pickupDate: dayKey(form.pickupAt), extraKm: Number(form.extraKm), overtimeHours: Number(form.overtimeHours), extraDriver: form.extraDriver, oneWayKm: Number(form.oneWayKm),
      taxPercent: Number(quote.taxPercent), lines: quoteEstimate.lines, total: quoteEstimate.total }
    setForm((current) => ({ ...current, quoteSnapshot: snapshot, rateUnit: 'Trip', unitPrice: String(quoteEstimate.match.amount), totalAmount: String(quoteEstimate.total) }))
    setError('')
  }

  const save = async (event) => {
    event.preventDefault()
    if (!isAdvance && form.driverMode === 'Assigned' && !['Completed', 'Cancelled'].includes(form.status)) { const issue = driverBookingIssue(drivers.find(d => d.id === Number(form.driverId)), form.returnAt); if (issue) { setError('Driver assignment blocked: '+issue); return } }
    if (saving) return
    const pickup = rentalDate(form.pickupAt)
    const end = rentalDate(form.returnAt)
    const total = Number(form.totalAmount)
    const unitPrice = Number(form.unitPrice)
    const deposit = Number(form.deposit || 0)
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.customerEmail.trim()) { setError('Enter the customer name, phone, and email.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) { setError('Enter a valid customer email address.'); return }
    if (!isAdvance && !selectedVehicle) { setError('Select an available vehicle listed for booking.'); return }
    if (!form.pickupAt || !form.returnAt || Number.isNaN(pickup.getTime()) || Number.isNaN(end.getTime())) { setError('Enter valid pickup and return dates.'); return }
    if (!initial && isAdvance && dayKey(pickup) <= dayKey(new Date())) { setError('Advance booking pickup must be on a future date.'); return }
    if (!initial && !isAdvance && Math.abs(pickup.getTime() - new Date().getTime()) > 30 * 60000) { setError('Quick booking pickup must be within 30 minutes of now.'); return }
    if (end <= pickup) { setError('Return must be after pickup.'); return }
    if (!form.pickupLocation.trim() || !form.destination.trim()) { setError('Enter both the pickup location and destination.'); return }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) { setError('Enter a unit price greater than zero.'); return }
    if (!Number.isFinite(total) || total <= 0) { setError('Enter a total amount greater than zero.'); return }
    if (form.quoteSnapshot && (form.quoteSnapshot.from !== form.pickupLocation || form.quoteSnapshot.to !== form.destination || form.quoteSnapshot.pickupDate !== dayKey(form.pickupAt) || form.quoteSnapshot.vehicle !== form.quoteVehicle || form.quoteSnapshot.extraKm !== Number(form.extraKm) || form.quoteSnapshot.overtimeHours !== Number(form.overtimeHours) || form.quoteSnapshot.extraDriver !== form.extraDriver || form.quoteSnapshot.oneWayKm !== Number(form.oneWayKm) || form.quoteSnapshot.total !== total || Number(form.quoteSnapshot.lines[0]?.unitPrice) !== unitPrice)) { setError('The agreed quote price is out of date. Apply it again or use a manual price.'); return }
    if (!initial && (!Number.isFinite(deposit) || deposit < 0 || deposit > total)) { setError('Deposit must be between zero and the booking total.'); return }
    if (!isAdvance && form.driverMode === 'Assigned' && !form.driverId) { setError('Select a driver or choose Self-drive.'); return }
    if (isAdvance && !initial && form.vehicleId) { setError('Advance vehicles are assigned from the saved alert time or on the pickup day.'); return }
    if (isAdvance && !initial && form.driverId) { setError('Advance drivers are assigned from the saved alert time or on the pickup day.'); return }
    if (isAdvance && !initial && form.status !== 'Pending' && form.status !== 'Confirmed') { setError('An advance booking starts as Pending or Confirmed.'); return }
    const overlap = form.vehicleId && bookings.some((booking) => booking.id !== initial?.id && booking.vehicleId === Number(form.vehicleId) && !['Completed', 'Cancelled'].includes(booking.status) && !['Completed', 'Cancelled'].includes(form.status) && pickup < rentalDate(booking.returnAt) && end > rentalDate(booking.pickupAt))
    if (overlap) { setError('This vehicle already has a booking during the selected dates.'); return }
    const driverOverlap = form.driverMode === 'Assigned' && form.driverId && bookings.some((booking) => booking.id !== initial?.id && booking.driverId === Number(form.driverId) && !['Completed', 'Cancelled'].includes(booking.status) && !['Completed', 'Cancelled'].includes(form.status) && pickup < rentalDate(booking.returnAt) && end > rentalDate(booking.pickupAt))
    if (driverOverlap) { setError('This driver already has a booking during the selected dates.'); return }
    if (form.handoverNow && vehicleReadiness(selectedVehicle).length) { setError('Handover blocked: '+vehicleReadiness(selectedVehicle).join('. ')); return }
    const finalStatus = !initial && !isAdvance ? form.handoverNow ? 'Active' : 'Confirmed' : form.status
    if (isAdvance && ['Active', 'Completed'].includes(finalStatus) && (!form.vehicleId || (form.driverMode !== 'Self-drive' && !form.driverId))) { setError('Assign the vehicle and driver before starting an advance rental.'); return }
    const alertError = assignmentAlertError(form, initial)
    if (alertError) { setError(alertError); return }
    setSaving(true)
    try { await onSave({
      ...initial, bookingType: kind, customerId: form.customerId ? Number(form.customerId) : null, customerName: form.customerName.trim(), customerPhone: form.customerPhone.trim(), customerEmail: form.customerEmail.trim().toLowerCase(),
      emailNotifications: form.emailNotifications, requestedType: isAdvance ? form.requestedType : vehicles.find((vehicle) => vehicle.id === Number(form.vehicleId))?.type || '',
      vehicleId: form.vehicleId ? Number(form.vehicleId) : null, driverMode: form.driverMode,
      driverId: form.driverMode === 'Assigned' ? Number(form.driverId) : null,
      assignmentAlertAt: form.assignmentAlertAt, assignmentAlertReviewedForPickup: form.assignmentAlertReviewedForPickup, pickupAt: form.pickupAt, returnAt: form.returnAt, pickupLocation: form.pickupLocation.trim(), destination: form.destination.trim(),
      rateUnit: form.rateUnit, unitPrice, totalAmount: total, extraKm: Number(form.extraKm), overtimeHours: Number(form.overtimeHours), extraDriver: form.extraDriver, oneWayKm: Number(form.oneWayKm), quoteSnapshot: form.quoteSnapshot,
      chargeLines: form.quoteSnapshot?.lines || null, taxPercent: form.quoteSnapshot?.taxPercent ?? 0,
      receivedAmount: initial ? initial.receivedAmount : deposit,
      refundedAmount: initial ? initial.refundedAmount : 0,
      status: finalStatus, notes: form.notes.trim(),
      bookedAt: initial?.bookedAt || localDateTime(new Date()),
      handedOverAt: ['Active', 'Completed'].includes(finalStatus) ? initial?.handedOverAt || localDateTime(new Date()) : '',
    }) } catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }

  return <form data-permission-scope={`bookings.${initial ? 'edit' : 'create'}`} className="booking-form" onSubmit={save} noValidate>
    <div className="booking-form-section"><h3>{isAdvance ? 'Advance Reservation' : 'Quick Booking'}</h3><p className="booking-form-lead">{isAdvance ? 'Reserve the requested vehicle class and schedule now. Assign a specific vehicle and driver from the saved alert time or on the pickup day.' : 'Choose an available vehicle now, then confirm whether it has already been handed over.'}</p><div className="booking-form-grid">
      <label>Existing Customer<select value={form.customerId} onChange={(event) => { const customer = customers.find((item) => item.id === Number(event.target.value)); setForm((current) => ({ ...current, customerId: event.target.value, customerName: customer?.name || current.customerName, customerPhone: customer?.phone || current.customerPhone, customerEmail: customer?.email || current.customerEmail, quoteSnapshot: null })); setError('') }}><option value="">Walk-in / enter manually</option>{customers.filter((item) => item.status !== 'Inactive').map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label>
      <label><FormFieldCaption required>Customer Name</FormFieldCaption><input required value={form.customerName} onChange={(event) => set('customerName', event.target.value)} placeholder="Customer name" /></label>
      <label><FormFieldCaption required>Phone</FormFieldCaption><input required type="tel" value={form.customerPhone} onChange={(event) => set('customerPhone', event.target.value)} placeholder="+966 5X XXX XXXX" /></label>
      <label><FormFieldCaption required>Email</FormFieldCaption><input required type="email" value={form.customerEmail} onChange={(event) => set('customerEmail', event.target.value)} placeholder="customer@example.com" /></label>
      {isAdvance ? <label><FormFieldCaption required>Requested Vehicle Type</FormFieldCaption><select required value={form.requestedType} onChange={(event) => set('requestedType', event.target.value)}>{TYPE_OPTIONS.map((type) => <option key={type}>{type}</option>)}</select></label> : <div className="booking-vehicle-picker"><label>Search available vehicles<input type="search" value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Make, model or registration" /></label><label><FormFieldCaption required>Vehicle</FormFieldCaption><select required value={form.vehicleId} onChange={(event) => { const vehicleId = event.target.value; const vehicle = vehicles.find((item) => item.id === Number(vehicleId)); setForm((current) => ({ ...current, vehicleId, unitPrice: vehicleId ? String(vehicleRateForUnit(vehicle, current.rateUnit)) : '', quoteVehicle: vehicle?.type || current.quoteVehicle, quoteSnapshot: null })); setError('') }}><option value="">Select vehicle</option>{shownVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.registration}</option>)}</select></label><small>{shownVehicles.length} of {eligibleVehicles.length} available vehicles shown</small>{!eligibleVehicles.length && <p className="booking-help" role="status">No vehicles are available and listed for booking. Review availability and Listed for Booking in Fleet.</p>}</div>}
      {isAdvance && initial?.vehicleId && <label>Assigned Vehicle<input readOnly value={`${vehicleName(initial, vehicles)} · ${vehicleRegistration(initial, vehicles)}`} /></label>}
      <label>{isAdvance ? 'Rental Mode' : 'Driver Arrangement'}<select value={isAdvance ? form.driverMode === 'Self-drive' ? 'Self-drive' : 'With driver' : form.driverMode} onChange={(event) => { const value = event.target.value === 'With driver' ? 'Unassigned' : event.target.value; setForm((current) => ({ ...current, driverMode: value, driverId: '' })); setError('') }}>{isAdvance ? <><option>With driver</option><option>Self-drive</option></> : <><option>Self-drive</option><option>Assigned</option></>}</select></label>
      {!isAdvance && form.driverMode === 'Assigned' && <label><FormFieldCaption required>Driver</FormFieldCaption><select required value={form.driverId} onChange={(event) => set('driverId', event.target.value)}><option value="">Select driver</option>{activeDrivers.map((driver) => { const issue = driverBookingIssue(driver, form.returnAt); return <option key={driver.id} value={driver.id} disabled={Boolean(issue)}>{driver.name} · {driver.employeeId}{issue ? ` — ${issue}` : ''}</option> })}</select></label>}
      <VehicleReadinessNotice vehicle={selectedVehicle} pricing/>
      <label className="booking-wide-field booking-check-field"><input type="checkbox" checked={form.emailNotifications} onChange={(event) => set('emailNotifications', event.target.checked)} /><span>Email booking confirmations and trip updates</span></label>
    </div></div>
    <div className="booking-form-section"><h3>Trip Schedule</h3><div className="booking-form-grid">
      <label><FormFieldCaption required>Pickup Date & Time</FormFieldCaption><input required type="datetime-local" value={form.pickupAt} onChange={(event) => set('pickupAt', event.target.value)} /></label>
      <label><FormFieldCaption required>Return Date & Time</FormFieldCaption><input required type="datetime-local" min={form.pickupAt || undefined} value={form.returnAt} onChange={(event) => set('returnAt', event.target.value)} /></label>
      <label><FormFieldCaption required>Pickup Location</FormFieldCaption><input required value={form.pickupLocation} onChange={(event) => set('pickupLocation', event.target.value)} placeholder="e.g. Riyadh Airport, Terminal 2" /></label>
      <label><FormFieldCaption required>Destination / Drop-off Location</FormFieldCaption><input required value={form.destination} onChange={(event) => set('destination', event.target.value)} placeholder="e.g. Olaya City Office" /></label>
    </div><AssignmentAlertFields form={form} initial={initial} onChange={set} /><p className="booking-help">All pickup and return times use Saudi Arabia time (KSA, UTC+03:00).</p></div>
    <div className="booking-form-section"><h3>Amount & Status</h3>{form.customerId && <div className="booking-quote-panel"><strong>Customer agreed rates</strong>{quote ? <><p>{quote.number} v{quote.version} · effective {quote.effectiveFrom} to {quote.effectiveTo || 'open'} · {quote.taxPercent}% VAT</p><div className="booking-form-grid"><label>Quoted vehicle / class<select value={form.quoteVehicle} onChange={(event) => set('quoteVehicle', event.target.value)}><option value="">Select quoted class</option>{[...new Set(matchingRoutes.map((rate) => rate.vehicle))].map((value) => <option key={value}>{value}</option>)}</select></label><label>Chargeable extra km<input type="number" min="0" value={form.extraKm} onChange={(event) => set('extraKm', event.target.value)} /></label><label>Overtime hours<input type="number" min="0" step="0.5" value={form.overtimeHours} onChange={(event) => set('overtimeHours', event.target.value)} /></label><label>One-way distance (km)<input type="number" min="0" value={form.oneWayKm} onChange={(event) => set('oneWayKm', event.target.value)} /></label><label className="booking-check-field"><input type="checkbox" checked={form.extraDriver} onChange={(event) => set('extraDriver', event.target.checked)} /><span>Additional driver charge applies</span></label></div>{quoteEstimate?.match && matchingRoutes.some((rate) => rate.id === quoteEstimate.match.id) ? <div className="booking-quote-preview"><span>{quoteEstimate.match.from} → {quoteEstimate.match.to} · {quoteEstimate.match.vehicle}</span><strong>{money(quoteEstimate.total)} incl. VAT</strong><button type="button" className="booking-secondary" onClick={applyQuote}>Apply agreed rate</button></div> : <p>No exact route/class rate matches. Check pickup, destination and quoted class; monthly rates are billed by cycle.</p>}</> : <p>No approved quote covers this pickup date. Enter a manual price or arrange a quote in Customer.</p>}{form.quoteSnapshot && <p className="booking-quote-applied">Applied {form.quoteSnapshot.quoteNumber} v{form.quoteSnapshot.version} · rate snapshot saved with this booking.</p>}</div>}<div className="booking-form-grid">
      <label><FormFieldCaption required>Billing Unit</FormFieldCaption><select required value={form.rateUnit} onChange={(event) => { const rateUnit = event.target.value; const vehicle = vehicles.find((item) => item.id === Number(form.vehicleId)); setForm((current) => ({ ...current, rateUnit, unitPrice: !isAdvance && vehicle ? String(vehicleRateForUnit(vehicle, rateUnit)) : current.unitPrice, quoteSnapshot: null })); setError('') }}><option>Trip</option><option>Hour</option><option>Day</option><option>Month</option></select></label>
      <label><FormFieldCaption required>Unit Price (SAR)</FormFieldCaption><input required type="number" min="0.01" step="0.01" value={form.unitPrice} onChange={(event) => set('unitPrice', event.target.value)} placeholder="0.00" /></label>
      <label><FormFieldCaption required>Total Amount (SAR)</FormFieldCaption><input required type="number" min="0.01" step="0.01" value={form.totalAmount} onChange={(event) => set('totalAmount', event.target.value)} placeholder="0.00" /></label>
      {initial ? <label>Net Received<input readOnly value={sar(netPaid(initial))} /></label> : <label>Deposit Received (SAR)<input type="number" min="0" step="0.01" value={form.deposit} onChange={(event) => set('deposit', event.target.value)} placeholder="0.00" /></label>}
      {(initial || isAdvance) && <label>Status<select value={form.status} onChange={(event) => set('status', event.target.value)}>{(initial ? ({ Pending: ['Pending', 'Confirmed', 'Cancelled'], Confirmed: ['Confirmed', 'Cancelled'], Active: ['Active', 'Completed'] }[initial.status] || [initial.status]) : ['Pending', 'Confirmed']).map((status) => <option key={status}>{status}</option>)}</select></label>}
      {!initial && !isAdvance && <label className="booking-wide-field booking-check-field"><input type="checkbox" checked={form.handoverNow} onChange={(event) => set('handoverNow', event.target.checked)} /><span>Vehicle handed over now — start rental as Active</span></label>}
      <label className="booking-wide-field">Notes<textarea rows="3" value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Pickup instructions or internal notes" /></label>
    </div><p className="booking-help">Unit price is the base rate per billing unit. Enter the agreed booking total separately, including any adjustments.</p></div>
    {error && <p className="booking-error" role="alert">{error}</p>}
    <div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="booking-primary" disabled={saving}><Icon name="check" size={16} /> {saving ? 'Saving…' : initial ? 'Save Changes' : isAdvance ? 'Create Advance Booking' : 'Create Quick Booking'}</button></div>
  </form>
}

function HandoverDialog({ booking, bookings, vehicles, drivers, onSave, onCancel }) {
  const [vehicleId, setVehicleId] = useState(String(booking.vehicleId || ''))
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [driverId, setDriverId] = useState(String(booking.driverId || ''))
  const [handedOver, setHandedOver] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const withDriver = booking.driverMode !== 'Self-drive'
  const candidates = vehicles.filter((vehicle) => vehicleBookingCandidate(vehicle, booking.vehicleId) && (!booking.requestedType || vehicle.type === booking.requestedType))
  const shownVehicles = candidates.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.registration}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase())).slice(0, 30)
  const selectedVehicle = candidates.find((vehicle) => vehicle.id === Number(vehicleId))
  if (selectedVehicle && !shownVehicles.some((vehicle) => vehicle.id === selectedVehicle.id)) shownVehicles.unshift(selectedVehicle)
  const activeDrivers = drivers.filter((driver) => driver.status === 'Active' || driver.id === booking.driverId)
  const save = async (event) => {
    event.preventDefault()
    if (withDriver) { const issue = driverBookingIssue(drivers.find(d => d.id === Number(driverId)), booking.returnAt); if (issue) { setError('Driver assignment blocked: '+issue); return } }
    if (saving) return
    if (handedOver && vehicleReadiness(selectedVehicle).length) { setError('Handover blocked: '+vehicleReadiness(selectedVehicle).join('. ')); return }
    if (!selectedVehicle || (withDriver && !driverId)) { setError('Select an available vehicle and, for a driven trip, a driver.'); return }
    const vehicleConflict = bookings.some((other) => other.id !== booking.id && other.vehicleId === Number(vehicleId) && !['Completed', 'Cancelled'].includes(other.status) && rentalDate(booking.pickupAt) < rentalDate(other.returnAt) && rentalDate(booking.returnAt) > rentalDate(other.pickupAt))
    if (vehicleConflict) { setError('This vehicle overlaps another booking.'); return }
    const driverConflict = withDriver && bookings.some((other) => other.id !== booking.id && other.driverId === Number(driverId) && !['Completed', 'Cancelled'].includes(other.status) && rentalDate(booking.pickupAt) < rentalDate(other.returnAt) && rentalDate(booking.returnAt) > rentalDate(other.pickupAt))
    if (driverConflict) { setError('This driver overlaps another booking.'); return }
    setSaving(true)
    try { await onSave({ vehicleId: Number(vehicleId), driverId: withDriver ? Number(driverId) : null, driverMode: withDriver ? 'Assigned' : 'Self-drive', status: handedOver ? 'Active' : 'Confirmed', handedOverAt: handedOver ? localDateTime(new Date()) : '' }) }
    catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }
  return <form data-permission-scope="bookings.edit" className="booking-form" onSubmit={save}><p className="booking-dialog-note">{booking.bookingType === 'Advance' ? 'Assign the reserved vehicle and driver from the saved alert time or on the pickup day.' : 'Confirm the vehicle and driver before handover.'} Booking <strong>{booking.bookingId}</strong> is scheduled for {formatDateTime(booking.pickupAt)}.</p><div className="booking-form-grid">
    <div className="booking-vehicle-picker"><label>Search {booking.requestedType || 'available'} vehicles<input type="search" value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Make, model or registration" /></label><label><FormFieldCaption required>Vehicle</FormFieldCaption><select required value={vehicleId} onChange={(event) => { setVehicleId(event.target.value); setError('') }}><option value="">Select {booking.requestedType || 'vehicle'}</option>{shownVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.registration}</option>)}</select></label><small>{shownVehicles.length} of {candidates.length} matching vehicles shown</small>{!candidates.length && <p className="booking-help" role="status">No matching vehicles are available and listed for booking. Review availability, booking visibility and the requested type in Fleet.</p>}</div>
    {withDriver ? <label><FormFieldCaption required>Driver</FormFieldCaption><select required value={driverId} onChange={(event) => { setDriverId(event.target.value); setError('') }}><option value="">Select driver</option>{activeDrivers.map((driver) => { const issue = driverBookingIssue(driver, booking.returnAt); return <option key={driver.id} value={driver.id} disabled={Boolean(issue)}>{driver.name} · {driver.employeeId}{issue ? ` — ${issue}` : ''}</option> })}</select></label> : <div className="booking-self-drive-note">Self-drive · no driver assignment needed</div>}
    <VehicleReadinessNotice vehicle={selectedVehicle}/><label className="booking-wide-field booking-check-field"><input type="checkbox" disabled={dayKey(booking.pickupAt) > dayKey(new Date())} checked={handedOver} onChange={(event) => setHandedOver(event.target.checked)} /><span>Vehicle has been handed over — mark rental Active</span></label>
  </div>{error && <p className="booking-error" role="alert">{error}</p>}<div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="booking-primary" disabled={saving}><Icon name="assign" size={16} /> {saving ? 'Saving…' : handedOver ? 'Assign & Start Rental' : 'Save Assignment'}</button></div></form>
}

function PaymentsDialog({ booking, onApply, onCancel }) {
  const { cancelled, defaultKind, refundable } = paymentChoices(booking)
  const [kind, setKind] = useState(defaultKind)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const max = kind === 'Refund' ? netPaid(booking) : balanceDue(booking)
  const submit = async (event) => {
    event.preventDefault()
    if (saving) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || value > max) { setError(`Enter an amount greater than zero and no more than ${sar(max)}.`); return }
    setSaving(true)
    try { await onApply(kind, value); setAmount(''); setError(''); setMessage(`${kind} of ${sar(value)} recorded.`) }
    catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }
  return <div className="booking-dialog-body"><p className="booking-dialog-note">Manage payments for <strong>{booking.bookingId}</strong>. Each transaction is recorded when you submit it.</p>
    <div className="booking-payment-summary"><div><span>Total</span><strong>{sar(booking.totalAmount)}</strong></div><div><span>Net received</span><strong>{sar(netPaid(booking))}</strong></div><div><span>Balance due</span><strong>{sar(balanceDue(booking))}</strong></div><div><span>Payment status</span><strong>{paymentStatus(booking)}</strong></div></div>
    {cancelled && <p className="booking-readiness" role="note">This booking is cancelled. New payments are blocked. {refundable > 0 ? `Up to ${sar(refundable)} of the net amount received can be refunded. Confirm the agreed cancellation terms before recording a refund.` : 'There is no remaining payment to refund.'}</p>}
    <form data-permission-scope={kind==='Refund'?'payments.refund':'bookings.edit'} onSubmit={submit} className="booking-payment-form"><label>Transaction Type<select value={kind} onChange={(event) => { setKind(event.target.value); setAmount(''); setError(''); setMessage('') }}>{!cancelled && <option>Payment</option>}<option>Refund</option></select></label><label><FormFieldCaption required>Amount (SAR)</FormFieldCaption><input type="number" min="0.01" step="0.01" max={max} value={amount} onChange={(event) => { setAmount(event.target.value); setError(''); setMessage('') }} placeholder="0.00" /></label>
      {error && <p className="booking-error" role="alert">{error}</p>}{message && <p className="booking-success" role="status">{message}</p>}
      <div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={onCancel}><Icon name="check" size={16} /> Done</button><button type="submit" className="booking-primary" disabled={saving || max <= 0}><Icon name="wallet" size={16} /> Record {kind}</button></div>
    </form>
  </div>
}

function BookingDetail({ booking, vehicles, drivers, onBack, onEdit, onHandover, onPayments, onInvoice, invoiceAvailable, onExport, onCancelBooking, onCompleteBooking }) {
  if (!booking) return <section className="booking-panel booking-not-found"><h2>Booking not found</h2><p>This booking record is no longer available.</p><button className="booking-primary" type="button" onClick={onBack}><Icon name="back" size={16} /> Back to Bookings</button></section>
  const priority = bookingPriority(booking)
  const vehicle = `${vehicleName(booking, vehicles)} · ${vehicleRegistration(booking, vehicles)}`
  const canHandover = canAssignRental(booking)
  return <div className="booking-detail"><button type="button" className="booking-back" onClick={onBack}><Icon name="back" /> Back to Bookings</button>
    <section className="booking-panel booking-detail-hero"><div className="booking-detail-main"><span className="booking-eyebrow">{booking.bookingType?.toUpperCase() || 'ADVANCE'} BOOKING</span><h2>{booking.bookingId}</h2><p>{booking.customerName} · {vehicle}</p><div className="booking-badges"><span className={`booking-status status-${booking.status.toLowerCase()}`}>{booking.status}</span><span className={`booking-payment-status payment-${paymentStatus(booking).toLowerCase().replaceAll(' ', '-')}`}>{paymentStatus(booking)}</span><span className={`booking-priority priority-${priority.tone}`}>{priority.label}</span></div></div><div className="booking-detail-actions">{canHandover && <button type="button" className="booking-primary" onClick={onHandover}><Icon name="assign" /> Assign Resources</button>}<button type="button" className="booking-secondary" onClick={onEdit} disabled={['Completed', 'Cancelled'].includes(booking.status)}><Icon name="edit" /> Edit Booking</button><button type="button" className="booking-secondary" onClick={onPayments}><Icon name="wallet" /> Payments</button>{(booking.status === 'Completed' || invoiceAvailable) && <button type="button" className="booking-secondary" onClick={onInvoice}><Icon name="invoice" /> {invoiceAvailable ? 'View Invoice' : 'Create Invoice'}</button>}<button type="button" className="booking-secondary" onClick={onExport}><Icon name="download" /> Download Details</button></div></section>
    <EmailDeliveryPanel kind="Individual" recordId={booking.id} recipient={booking.customerEmail} /><div className="booking-detail-grid"><section className="booking-panel booking-detail-card"><h3>Trip & Customer</h3><dl className="booking-detail-list"><div><dt>Booking type</dt><dd>{booking.bookingType || 'Advance'}</dd></div><div><dt>Customer</dt><dd>{booking.customerName}</dd></div><div><dt>Phone</dt><dd>{booking.customerPhone}</dd></div><div><dt>Email</dt><dd>{booking.customerEmail || '—'}</dd></div><div><dt>Email updates</dt><dd>{booking.emailNotifications ? 'Enabled' : 'Off'}</dd></div><div><dt>Requested type</dt><dd>{booking.requestedType || '—'}</dd></div><div><dt>Vehicle</dt><dd>{vehicle}</dd></div><div><dt>Driver</dt><dd>{driverName(booking, drivers)}</dd></div><div><dt>Pickup</dt><dd>{formatDateTime(booking.pickupAt)}</dd></div><div><dt>Assignment alert</dt><dd>{booking.assignmentAlertAt ? formatDateTime(booking.assignmentAlertAt) : 'Standard reminder schedule'}</dd></div><div><dt>Pickup location</dt><dd>{booking.pickupLocation || '—'}</dd></div><div><dt>Return</dt><dd className={isOverdue(booking) ? 'booking-overdue-text' : ''}>{formatDateTime(booking.returnAt)}{isOverdue(booking) && ' · Overdue'}</dd></div><div><dt>Destination</dt><dd>{booking.destination || '—'}</dd></div><div><dt>Booked on</dt><dd>{formatDateTime(booking.bookedAt)}</dd></div></dl></section>
      <section className="booking-panel booking-detail-card"><h3>Payment Summary</h3><div className="booking-amount-hero"><strong>{sar(booking.totalAmount)}</strong><span>Total booking amount</span></div><dl className="booking-detail-list"><div><dt>Unit price</dt><dd>{unitPriceLabel(booking)}</dd></div>{booking.quoteSnapshot && <><div><dt>Agreed quote</dt><dd>{booking.quoteSnapshot.quoteNumber} · v{booking.quoteSnapshot.version}</dd></div>{booking.quoteSnapshot.lines.map((line, index) => <div key={`${line.description}-${index}`}><dt>{line.description}</dt><dd>{line.quantity} {line.unit} · {sar(line.quantity * line.unitPrice)}</dd></div>)}</>}<div><dt>Received</dt><dd>{sar(booking.receivedAmount)}</dd></div><div><dt>Refunded</dt><dd>{sar(booking.refundedAmount)}</dd></div><div><dt>Net paid</dt><dd>{sar(netPaid(booking))}</dd></div><div><dt>Balance due</dt><dd>{sar(balanceDue(booking))}</dd></div></dl><div className="booking-detail-card-actions"><button type="button" className="booking-secondary" onClick={onPayments}><Icon name="wallet" size={16} /> Manage Payments</button>{['Pending', 'Confirmed'].includes(booking.status) && <button type="button" className="booking-danger-link" onClick={onCancelBooking}>Cancel Booking</button>}</div></section></div>
    {booking.status === 'Active' && <section className="booking-panel booking-detail-card"><h3>Return & Completion</h3><p>Mark the rental completed after the vehicle is returned. You can then prepare its invoice.</p><button type="button" className="booking-primary" onClick={onCompleteBooking}><Icon name="check" size={16} /> Mark Completed</button></section>}
    {booking.notes && <section className="booking-panel booking-detail-card booking-notes"><h3>Notes</h3><p>{booking.notes}</p></section>}
  </div>
}

export default function BookingPage({ initialDialog = null, onInitialDialogOpened, bookings, setBookings, vehicles, drivers, customers = [], quotes = [], viewBookingId, onViewBooking, onBackBookings, invoices, onInvoice, onResourcesChanged }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All booking statuses')
  const [paymentFilter, setPaymentFilter] = useState('All payment statuses')
  const [typeFilter, setTypeFilter] = useState('All booking types')
  const [driverFilter, setDriverFilter] = useState('All driver types')
  const [period, setPeriod] = useState('This month')
  const [dateBasis, setDateBasis] = useState('Booked on')
  const [customStart, setCustomStart] = useState(dayKey(shiftDays(new Date(), -6)))
  const [customEnd, setCustomEnd] = useState(dayKey(new Date()))
  const [sort, setSort] = useState('Priority first')
  const [menu, setMenu] = useState(null)
  const [dialog, setDialog] = useState(() => ['quick', 'advance'].includes(initialDialog) ? initialDialog : null)
  const [dialogBookingId, setDialogBookingId] = useState(null)
  useEffect(() => { if (initialDialog) onInitialDialogOpened?.() }, [initialDialog, onInitialDialogOpened])
  const now = new Date()
  const today = dayKey(now)
  const bounds = periodBounds(period, customStart, customEnd, now)
  const selected = bookings.find((booking) => booking.id === dialogBookingId)
  const profile = bookings.find((booking) => booking.id === viewBookingId)
  const matchingDate = (booking, start, end) => inDateRange(dateFieldValue(booking, dateBasis), start, end)
  const periodBookings = bookings.filter((booking) => matchingDate(booking, bounds.start, bounds.end))
  const currentRevenue = periodBookings.filter((booking) => booking.status !== 'Cancelled').reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0)
  const previousRevenue = bounds.previousStart ? bookings.filter((booking) => matchingDate(booking, bounds.previousStart, bounds.previousEnd) && booking.status !== 'Cancelled').reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0) : null
  const revenueChange = previousRevenue === null ? 'All records' : previousRevenue === 0 ? currentRevenue > 0 ? 'New revenue' : 'No change' : `${currentRevenue >= previousRevenue ? '+' : ''}${Math.round((currentRevenue - previousRevenue) / previousRevenue * 100)}% vs previous period`
  const activeCount = bookings.filter((booking) => booking.status === 'Active').length
  const pickupToday = bookings.filter((booking) => booking.status === 'Confirmed' && dayKey(booking.pickupAt) === today).length
  const overdueCount = bookings.filter((booking) => isOverdue(booking, now)).length
  const returnsDue = bookings.filter((booking) => booking.status === 'Active' && dayKey(booking.returnAt) === today && !isOverdue(booking, now)).length

  const term = query.trim().toLowerCase()
  const filtered = bookings.filter((booking) => {
      const searchable = `${booking.bookingId} ${booking.customerName} ${booking.customerPhone} ${booking.customerEmail || ''} ${booking.bookingType || ''} ${vehicleName(booking, vehicles)} ${vehicleRegistration(booking, vehicles)} ${driverName(booking, drivers)}`.toLowerCase()
      return (!term || searchable.includes(term)) && matchingDate(booking, bounds.start, bounds.end)
        && (statusFilter === 'All booking statuses' || booking.status === statusFilter)
        && (paymentFilter === 'All payment statuses' || paymentStatus(booking) === paymentFilter)
        && (typeFilter === 'All booking types' || booking.bookingType === typeFilter)
        && (driverFilter === 'All driver types' || booking.driverMode === driverFilter)
    }).sort((a, b) => {
      if (sort === 'Newest booked') return rentalDate(b.bookedAt) - rentalDate(a.bookedAt)
      if (sort === 'Pickup soonest') return rentalDate(a.pickupAt) - rentalDate(b.pickupAt)
      if (sort === 'Return soonest') return rentalDate(a.returnAt) - rentalDate(b.returnAt)
      return bookingPriority(b, now).score - bookingPriority(a, now).score || rentalDate(a.pickupAt) - rentalDate(b.pickupAt)
    })

  const stream = useRegisterStream({ rows: filtered, resetKey: JSON.stringify([query, statusFilter, paymentFilter, typeFilter, driverFilter, period, dateBasis, customStart, customEnd, sort]), detailOpen: Boolean(viewBookingId) })
  const tableRef = useRentalTableHeader(Boolean(viewBookingId))
  const entries = streamEntries(stream.visible, sort, now)
  const highCount = filtered.filter((booking) => bookingPriority(booking, now).score >= 70).length
  const openDialog = (kind, booking = null) => { setDialog(kind); setDialogBookingId(booking?.id || null); setMenu(null) }
  const closeDialog = useCallback(() => { setDialog(null); setDialogBookingId(null) }, [])
  useRentalDialog(Boolean(dialog), closeDialog)
  const reset = () => { setQuery(''); setStatusFilter('All booking statuses'); setPaymentFilter('All payment statuses'); setTypeFilter('All booking types'); setDriverFilter('All driver types'); setPeriod('This month'); setDateBasis('Booked on'); setSort('Priority first') }
  const changeFilter = (setter, value) => { setter(value); setMenu(null) }
  const [actionError, setActionError] = useState('')
  const replaceBooking = (saved) => setBookings((current) => current.some((booking) => booking.id === saved.id)
    ? current.map((booking) => booking.id === saved.id ? saved : booking) : [saved, ...current])
  const saveBooking = async (record) => {
    const saved = await saveBookingRecord(record)
    void onResourcesChanged?.()
    replaceBooking(saved); closeDialog()
    if (!record.id) onViewBooking(saved.id)
  }
  const applyPayment = async (kind, amount) => { const saved = await bookingPayment(selected.id, kind, amount); replaceBooking(saved) }
  const saveHandover = async (assignment) => {
    if (!canAssignRental(selected)) return
    const saved = await assignBooking(selected.id, assignment); replaceBooking(saved); closeDialog()
    void onResourcesChanged?.()
  }
  const cancelBooking = async () => {
    if (!selected || ['Completed', 'Cancelled'].includes(selected.status)) return
    try { const saved = await bookingStatus(selected.id, 'Cancelled'); replaceBooking(saved); closeDialog(); setActionError('') }
    catch (cause) { setActionError(cause.message) }
  }
  const completeBooking = async () => {
    if (!profile || profile.status !== 'Active') return
    try {
      const saved = await bookingStatus(profile.id, 'Completed', { actualReturnAt: localDateTime(new Date()) })
      replaceBooking(saved); setActionError('')
      void onResourcesChanged?.()
    } catch (cause) { setActionError(cause.message) }
  }
  const invoiceFor = (booking) => invoices.find((invoice) => invoice.status !== 'Voided' && invoice.sources.some((source) => source.kind === 'Individual' && source.id === booking?.id))
  const showMenu = (event, booking) => { if (menu?.id === booking.id) { setMenu(null); return }; const rect = event.currentTarget.getBoundingClientRect(); setMenu({ id: booking.id, trigger: event.currentTarget, x: Math.max(8, Math.min(rect.right - 214, window.innerWidth - 222)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 340)) }) }

  return <div className="booking-page rental-register-page">
    {actionError && <p className="booking-error" role="alert">{actionError}</p>}
    {viewBookingId ? <BookingDetail booking={profile} vehicles={vehicles} drivers={drivers} onBack={onBackBookings} onEdit={() => openDialog('edit', profile)} onHandover={() => openDialog('handover', profile)} onPayments={() => invoiceFor(profile) ? onInvoice(profile) : openDialog('payments', profile)} onInvoice={() => onInvoice(profile)} invoiceAvailable={Boolean(invoiceFor(profile))} onExport={() => downloadBookingDetails(profile, vehicles, drivers)} onCancelBooking={() => openDialog('cancel', profile)} onCompleteBooking={completeBooking} /> : <>
      <RentalHeading title="Bookings" description="Track reservations, handovers, returns, and payments."><div className="admin-page-actions" role="group" aria-label="Booking actions"><div className="admin-page-action-buttons"><button type="button" className="booking-secondary" disabled={!filtered.length} onClick={() => downloadCsv('bookings-filtered.csv', bookingListCsv(filtered, vehicles, drivers))}><Icon name="download" /> Export List CSV</button><button type="button" className="booking-secondary" aria-label="Create quick booking" onClick={() => openDialog('quick')}><Icon name="plus" /> Quick Booking</button><button type="button" className="booking-primary" aria-label="Create advance booking" onClick={() => openDialog('advance')}><Icon name="calendar" /> Advance Booking</button></div></div></RentalHeading>
      <RentalKpis label="Booking KPIs" items={[
        { label: 'Total Bookings', value: periodBookings.length, icon: 'calendar', detail: 'Bookings in the selected period', context: `${period} · ${dateBasis.toLowerCase()}` },
        { label: 'Active Rentals', value: activeCount, icon: 'key', tone: 'green', detail: 'Handed over, awaiting return', context: 'Current rentals', summary: 'Handed over, awaiting return' },
        { label: 'Upcoming Pickups', value: pickupToday, icon: 'arrow', tone: 'purple', detail: 'Confirmed for pickup today', context: `${pickupToday} pending handover`, summary: `${pickupToday} pending handover today` },
        { label: 'Returns Due Today', value: returnsDue, icon: 'return', tone: 'amber', detail: 'Scheduled to return today', context: `${overdueCount} overdue return${overdueCount === 1 ? '' : 's'} separately`, summary: `${overdueCount} overdue return${overdueCount === 1 ? '' : 's'} (excluded)` },
        { label: 'Booking Revenue', value: sar(currentRevenue), icon: 'wallet', detail: 'Non-cancelled booking value', context: revenueChange, summary: `${revenueChange} · non-cancelled value` },
      ]} />
      <section className="booking-panel booking-list" aria-labelledby="booking-list-title"><div className="booking-list-head"><div><h2 id="booking-list-title">Bookings <span>{filtered.length}</span></h2><p>Urgent handovers and overdue returns appear first by default.</p></div><div className="booking-list-legend"><span><i className="booking-dot danger" />{highCount} high priority</span><span><i className="booking-dot info" />{overdueCount} overdue overall</span></div></div>
        <RentalFilters search={<label className="booking-search"><Icon name="search" /><input type="search" aria-label="Search bookings" placeholder="Search ID, customer, vehicle, driver, email..." value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} /></label>} summary={<><span>Saudi Arabia time (KSA, UTC+03:00). {filtered.length} matching bookings.</span><span className="rental-urgent">{highCount} high priority · {overdueCount} overdue overall</span><span>{sort === 'Priority first' ? 'Urgent assignments, pickups and returns appear first.' : sort === 'Highest value' ? 'Highest value first.' : 'Grouped by ' + (sort === 'Newest booked' ? 'booking date' : sort === 'Return soonest' ? 'return date' : 'pickup date') + '.'}</span></>}><label>Booking type<select aria-label="Filter booking type" value={typeFilter} onChange={(event) => changeFilter(setTypeFilter, event.target.value)}><option value="All booking types">All types</option><option>Quick</option><option>Advance</option></select></label><label>Booking status<select aria-label="Filter booking status" value={statusFilter} onChange={(event) => changeFilter(setStatusFilter, event.target.value)}><option value="All booking statuses">All statuses</option>{BOOKING_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label>Payment status<select aria-label="Filter payment status" value={paymentFilter} onChange={(event) => changeFilter(setPaymentFilter, event.target.value)}><option value="All payment statuses">All statuses</option>{PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label>Driver type<select aria-label="Filter driver type" value={driverFilter} onChange={(event) => changeFilter(setDriverFilter, event.target.value)}><option value="All driver types">All types</option><option>Assigned</option><option>Unassigned</option><option>Self-drive</option></select></label><label>Period<select aria-label="Booking period" value={period} onChange={(event) => changeFilter(setPeriod, event.target.value)}><option>Today</option><option>Last 7 days</option><option>Last 30 days</option><option>This month</option><option>Last month</option><option>Custom range</option><option>All time</option></select></label><label>Date based on<select aria-label="Date based on" value={dateBasis} onChange={(event) => changeFilter(setDateBasis, event.target.value)}><option>Booked on</option><option>Pickup date</option><option>Return date</option></select></label>{period === 'Custom range' && <><label>From<input type="date" aria-label="From date" value={customStart} onChange={(event) => changeFilter(setCustomStart, event.target.value)} /></label><label>To<input type="date" aria-label="To date" value={customEnd} onChange={(event) => changeFilter(setCustomEnd, event.target.value)} /></label></>}<label>Sort by<select aria-label="Sort bookings" value={sort} onChange={(event) => changeFilter(setSort, event.target.value)}><option>Priority first</option><option>Newest booked</option><option>Pickup soonest</option><option>Return soonest</option></select></label><button type="button" className="booking-reset" aria-label="Reset filters" onClick={reset}>Reset</button></RentalFilters>
        {!bounds.valid && <p className="booking-error booking-filter-error" role="alert">The start date must be on or before the end date.</p>}
        <div className="booking-table-scroll"><table className="booking-table" ref={tableRef}><thead><tr><th>Booking ID</th><th>Customer</th><th>Vehicle</th><th>Driver</th><th>Pickup / Return</th><th>Total Amount</th><th>Paid / Balance Due</th><th>Booking Status</th><th>Payment Status</th><th>Actions</th></tr></thead><tbody>{entries.map((entry) => { if (entry.kind === 'date') return <DateBand key={entry.key} entry={entry} columns={10} />; const booking = entry.row; const priority = bookingPriority(booking, now); const payStatus = paymentStatus(booking); return <tr key={booking.id} data-register-record={booking.id} className={priority.score >= 80 ? 'booking-priority-row' : ''}><td><button type="button" className="booking-id-link" onClick={(event) => stream.rememberPosition(onViewBooking, booking.id, event.currentTarget)}>{booking.bookingId}</button><span className={`booking-type-tag type-${(booking.bookingType || 'advance').toLowerCase()}`}>{booking.bookingType || 'Advance'}</span>{priority.score >= 70 && <span className={`booking-row-priority priority-${priority.tone}`}>{priority.label}</span>}</td><td><div className="booking-person"><span className="booking-avatar">{initials(booking.customerName)}</span><span><strong>{booking.customerName}</strong><small>{booking.customerPhone}</small></span></div></td><td><strong>{vehicleName(booking, vehicles)}</strong><small>{vehicleRegistration(booking, vehicles)}</small></td><td><span className={booking.driverMode === 'Unassigned' ? 'booking-muted' : ''}>{driverName(booking, drivers)}</span></td><td><span className="booking-date-line"><b>Pickup</b>{formatDateTime(booking.pickupAt)}</span><span className={`booking-date-line ${isOverdue(booking, now) ? 'booking-overdue-text' : ''}`}><b>Return</b>{formatDateTime(booking.returnAt)}{isOverdue(booking, now) && <em>Overdue</em>}</span></td><td className="booking-money">{sar(booking.totalAmount)}</td><td><span className="booking-paid">Paid {sar(netPaid(booking))}</span><span className={`booking-balance ${balanceDue(booking) > 0 ? 'due' : ''}`}>Due {sar(balanceDue(booking))}</span></td><td><span className={`booking-status status-${booking.status.toLowerCase()}`}>{booking.status}</span></td><td><span className={`booking-payment-status payment-${payStatus.toLowerCase().replaceAll(' ', '-')}`}>{payStatus}</span></td><td><button type="button" className="booking-more" aria-label={`More actions for ${booking.bookingId}`} aria-haspopup="menu" aria-expanded={menu?.id === booking.id} onClick={(event) => showMenu(event, booking)}><Icon name="more" size={20} /></button></td></tr> })}</tbody></table>{!stream.visible.length && <div className="booking-empty"><strong>No bookings match these filters</strong><p>Try another date range, status, or search term.</p><button type="button" onClick={reset}>Reset filters</button></div>}</div>
        <StreamFooter {...stream} noun="bookings" />
      </section>
      {menu && <RentalMenu menu={menu} onClose={() => setMenu(null)} label="Booking actions"><button role="menuitem" type="button" onClick={() => { stream.rememberPosition(onViewBooking, menu.id, menu.trigger); setMenu(null) }}><Icon name="eye" /> View Booking</button><button role="menuitem" type="button" onClick={() => { downloadBookingDetails(bookings.find((item) => item.id === menu.id), vehicles, drivers); setMenu(null) }}><Icon name="download" /> Download Details</button><button role="menuitem" type="button" onClick={() => openDialog('edit', bookings.find((item) => item.id === menu.id))} disabled={['Completed', 'Cancelled'].includes(bookings.find((item) => item.id === menu.id)?.status)}><Icon name="edit" /> Edit Booking</button>{canAssignRental(bookings.find((item) => item.id === menu.id)) && <button role="menuitem" type="button" onClick={() => openDialog('handover', bookings.find((item) => item.id === menu.id))}><Icon name="assign" /> Assign Resources</button>}<button role="menuitem" type="button" onClick={() => { const booking = bookings.find((item) => item.id === menu.id); if (invoiceFor(booking)) { onInvoice(booking); setMenu(null) } else openDialog('payments', booking) }}><Icon name="wallet" /> Payments</button>{(bookings.find((item) => item.id === menu.id)?.status === 'Completed' || invoiceFor(bookings.find((item) => item.id === menu.id))) && <button role="menuitem" type="button" onClick={() => { onInvoice(bookings.find((item) => item.id === menu.id)); setMenu(null) }}><Icon name="invoice" /> {invoiceFor(bookings.find((item) => item.id === menu.id)) ? 'View Invoice' : 'Create Invoice'}</button>}<div className="booking-menu-separator" /><button role="menuitem" type="button" className="danger" disabled={!['Pending', 'Confirmed'].includes(bookings.find((item) => item.id === menu.id)?.status)} onClick={() => openDialog('cancel', bookings.find((item) => item.id === menu.id))}><Icon name="cancel" /> Cancel Booking</button></RentalMenu>}
    </>}
    {dialog && <div className="booking-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className={`booking-dialog ${['quick', 'advance', 'edit'].includes(dialog) ? 'wide' : ''}`} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="booking-dialog-title"><div className="booking-dialog-heading"><div><span className="booking-demo-mark">RENTAL OPERATIONS</span><h2 id="booking-dialog-title">{({ quick: 'Quick Booking', advance: 'Advance Booking', edit: 'Edit Booking', handover: 'Assign & Handover', payments: 'Payments', cancel: 'Cancel Booking' })[dialog]}</h2></div><button type="button" aria-label="Close dialog" onClick={closeDialog}><Icon name="close" size={20} /></button></div>
      {actionError && <p className="booking-error" role="alert">{actionError}</p>}
      {['quick', 'advance', 'edit'].includes(dialog) && <BookingForm key={selected?.id || dialog} initial={selected} bookingType={dialog === 'quick' ? 'Quick' : 'Advance'} bookings={bookings} vehicles={vehicles} drivers={drivers} customers={customers} quotes={quotes} onCancel={closeDialog} onSave={saveBooking} />}
      {dialog === 'handover' && selected && <HandoverDialog booking={selected} bookings={bookings} vehicles={vehicles} drivers={drivers} onSave={saveHandover} onCancel={closeDialog} />}
      {dialog === 'payments' && selected && <PaymentsDialog booking={selected} onApply={applyPayment} onCancel={closeDialog} />}

      {dialog === 'cancel' && selected && <div className="booking-dialog-body"><p className="booking-dialog-note">Cancel <strong>{selected.bookingId}</strong> for {selected.customerName}? The booking will remain in the list with a Cancelled status.</p>{netPaid(selected) > 0 && <p className="booking-cancel-note">This booking has {sar(netPaid(selected))} net received. Cancellation does not issue a refund; use Payments to record it separately.</p>}<div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={closeDialog}>Keep Booking</button><button type="button" className="booking-danger" onClick={cancelBooking}>Cancel Booking</button></div></div>}
    </div></div>}
  </div>
}
