import { useState } from 'react'
import { dayKey, localDateTime, shiftDays, sar } from '../bookings/BookingData.js'
import { billableWaitingMinutes, resourceConflict, tripCharges, tripPassengers, tripStops, waitingMinutes } from './CorporateData.js'
import { TYPE_OPTIONS } from '../fleet/FleetData.js'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import CompanyEditor from './CompanyEditor.jsx'
import { normalizeCompanyName } from './CompanyData.js'
import { activeQuoteFor, customerKey, money, normalizePlace, normalizeStops, pricePreview } from '../customers/CustomerData.js'

const newId = () => crypto.randomUUID()
const rateFor = (vehicle, unit) => vehicle?.[{ Hour: 'hourlyRate', Day: 'dailyRate', Month: 'monthlyRate' }[unit]] ?? ''
const cleanStop = (stop) => ({ id: stop.id, location: stop.location.trim(), waitingMinutes: Number(stop.waitingMinutes || 0) })
const cleanPassenger = (passenger) => ({ id: passenger.id, name: passenger.name.trim(), phone: passenger.phone.trim() })

export default function CorporateTripForm({ initial, kind, trips, bookings, companies, quotes, onAddCompany, vehicles, drivers, onSave, onCancel }) {
  const isAdvance = (initial?.bookingType || kind) === 'Advance'
  const [form, setForm] = useState(() => {
    const now = new Date()
    return {
      companyId: initial?.companyId || null, companyName: initial?.companyName || '', contactName: initial?.contactName || '', contactPhone: initial?.contactPhone || '', contactEmail: initial?.contactEmail || '',
      emailNotifications: initial?.emailNotifications ?? true,
      projectManager: initial?.projectManager || '', projectCode: initial?.projectCode || '', projectRemarks: initial?.projectRemarks || '',
      passengerCount: String(initial?.passengerCount || 1), passengers: tripPassengers(initial || {}), stops: tripStops(initial || {}),
      pickupAt: initial?.pickupAt || localDateTime(isAdvance ? shiftDays(now, 1) : now),
      returnAt: initial?.returnAt || localDateTime(shiftDays(now, isAdvance ? 3 : 1)),
      requestedType: initial?.requestedType || 'Sedan', serviceMode: initial?.serviceMode || 'With driver',
      vehicleId: String(initial?.vehicleId || ''), driverId: String(initial?.driverId || ''),
      rateUnit: initial?.rateUnit || 'Day', unitPrice: initial?.unitPrice != null ? String(initial.unitPrice) : '',
      quoteVehicle: initial?.quoteSnapshot?.vehicle || initial?.requestedType || 'Sedan', extraKm: String(initial?.extraKm || 0), overtimeHours: String(initial?.overtimeHours || 0), extraDriver: Boolean(initial?.extraDriver), oneWayKm: String(initial?.oneWayKm || 0), quoteSnapshot: initial?.quoteSnapshot || null,
      quantity: String(initial?.quantity || 1), waitingRatePerHour: String(initial?.waitingRatePerHour || 0),
      includedWaitingMinutes: String(initial?.includedWaitingMinutes ?? 0), waitingBillingIncrementMinutes: String(initial?.waitingBillingIncrementMinutes ?? 15), taxPercent: String(initial?.taxPercent || 0),
      status: initial?.status || 'Confirmed', handoverNow: false, notes: initial?.notes || '',
    }
  })
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [showCompanyEditor, setShowCompanyEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (name, value) => { setForm((current) => ({ ...current, [name]: value, ...(name === 'requestedType' ? { quoteVehicle: value } : {}), ...(['pickupAt', 'requestedType', 'quoteVehicle', 'extraKm', 'overtimeHours', 'extraDriver', 'oneWayKm', 'rateUnit', 'unitPrice', 'quantity', 'waitingRatePerHour', 'includedWaitingMinutes', 'waitingBillingIncrementMinutes', 'taxPercent'].includes(name) ? { quoteSnapshot: null } : {}) })); setError('') }
  const setPassenger = (id, name, value) => { setForm((current) => ({ ...current, passengers: current.passengers.map((passenger) => passenger.id === id ? { ...passenger, [name]: value } : passenger) })); setError('') }
  const setStop = (id, name, value) => { setForm((current) => ({ ...current, stops: current.stops.map((stop) => stop.id === id ? { ...stop, [name]: value } : stop), quoteSnapshot: null })); setError('') }
  const addPassenger = () => setForm((current) => ({ ...current, passengers: [...current.passengers, { id: newId(), name: '', phone: '' }], passengerCount: String(Math.max(Number(current.passengerCount) || 0, current.passengers.length + 1)) }))
  const removePassenger = (id) => setForm((current) => ({ ...current, passengers: current.passengers.filter((passenger) => passenger.id !== id) }))
  const addStop = () => setForm((current) => ({ ...current, stops: [...current.stops.slice(0, -1), { id: newId(), location: '', waitingMinutes: 0 }, current.stops.at(-1)], quoteSnapshot: null }))
  const removeStop = (id) => setForm((current) => ({ ...current, stops: current.stops.filter((stop) => stop.id !== id), quoteSnapshot: null }))
  const moveStop = (index, direction) => setForm((current) => {
    const next = [...current.stops]
    const other = index + direction
    if (index <= 0 || index >= next.length - 1 || other <= 0 || other >= next.length - 1) return current
    ;[next[index], next[other]] = [next[other], next[index]]
    return { ...current, stops: next, quoteSnapshot: null }
  })
  const eligibleVehicles = vehicles.filter((vehicle) => vehicle.status === 'Available' || vehicle.id === initial?.vehicleId)
  const shownVehicles = eligibleVehicles.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.registration}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase())).slice(0, 30)
  const selectedVehicle = eligibleVehicles.find((vehicle) => vehicle.id === Number(form.vehicleId))
  if (selectedVehicle && !shownVehicles.some((vehicle) => vehicle.id === selectedVehicle.id)) shownVehicles.unshift(selectedVehicle)
  const activeDrivers = drivers.filter((driver) => driver.status === 'Active' || driver.id === initial?.driverId)
  const matchedCompany = companies.find((company) => normalizeCompanyName(company.name) === normalizeCompanyName(form.companyName))
  const quote = matchedCompany ? activeQuoteFor(quotes, customerKey('Corporate', matchedCompany.id), dayKey(form.pickupAt)) : null
  const via = form.stops.slice(1, -1).map((stop) => stop.location.trim()).join(', ')
  const from = form.stops[0]?.location || ''
  const to = form.stops.at(-1)?.location || ''
  const matchingRoutes = quote?.routes.filter((rate) => normalizePlace(rate.from) === normalizePlace(from) && normalizePlace(rate.to) === normalizePlace(to) && normalizeStops(rate.via) === normalizeStops(via) && [selectedVehicle?.type || form.requestedType, selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : ''].some((vehicle) => normalizePlace(vehicle) === normalizePlace(rate.vehicle))) || []
  const quoteEstimate = quote ? pricePreview(quote, { kind: 'Fixed route', from, via, to, vehicle: form.quoteVehicle, extraKm: form.extraKm, overtimeHours: form.overtimeHours, extraDriver: form.extraDriver, oneWayKm: form.oneWayKm }) : null
  const applyQuote = () => {
    if (!quoteEstimate?.match || !matchingRoutes.some((rate) => rate.id === quoteEstimate.match.id)) return
    const waiting = Math.round(billableWaitingMinutes(form.stops, form.includedWaitingMinutes, form.waitingBillingIncrementMinutes) * Number(form.waitingRatePerHour || 0) / 60 * 100) / 100
    const lines = [...quoteEstimate.lines, ...(waiting > 0 ? [{ description: 'Billable waiting', unit: 'Service', quantity: 1, unitPrice: waiting }] : [])]
    const subtotal = Math.round((quoteEstimate.subtotal + waiting) * 100) / 100
    const taxAmount = Math.round(subtotal * Number(quote.taxPercent || 0)) / 100
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100
    const snapshot = { quoteId: quote.id, quoteNumber: quote.number, version: quote.version, ruleId: quoteEstimate.match.id, vehicle: form.quoteVehicle, companyId: matchedCompany.id,
      stops: JSON.stringify(form.stops.map((stop) => [stop.location, stop.waitingMinutes])), pickupDate: dayKey(form.pickupAt), extraKm: Number(form.extraKm), overtimeHours: Number(form.overtimeHours), extraDriver: form.extraDriver, oneWayKm: Number(form.oneWayKm),
      waitingRatePerHour: Number(form.waitingRatePerHour), includedWaitingMinutes: Number(form.includedWaitingMinutes), waitingBillingIncrementMinutes: Number(form.waitingBillingIncrementMinutes),
      taxPercent: Number(quote.taxPercent), lines, subtotal, taxAmount, totalAmount }
    setForm((current) => ({ ...current, quoteSnapshot: snapshot, rateUnit: 'Trip', unitPrice: String(quoteEstimate.match.amount), quantity: '1', taxPercent: String(quote.taxPercent) }))
    setError('')
  }
  const chooseCompany = (name) => {
    const company = companies.find((item) => normalizeCompanyName(item.name) === normalizeCompanyName(name))
    setForm((current) => ({ ...current, companyId: company?.id || null, companyName: company?.name || name, quoteSnapshot: null,
      ...(company && company.id !== current.companyId ? {
        waitingRatePerHour: String(company.waitingRatePerHour ?? 0), includedWaitingMinutes: String(company.includedWaitingMinutes ?? 0), waitingBillingIncrementMinutes: String(company.waitingBillingIncrementMinutes ?? 15),
      } : {}),
    }))
    setError('')
  }
  const addCompany = async (details) => {
    const company = await onAddCompany(details)
    setForm((current) => ({ ...current, companyId: company.id, companyName: company.name, quoteSnapshot: null,
      waitingRatePerHour: String(company.waitingRatePerHour), includedWaitingMinutes: String(company.includedWaitingMinutes), waitingBillingIncrementMinutes: String(company.waitingBillingIncrementMinutes),
    }))
    setShowCompanyEditor(false)
    setError('')
  }
  const charges = form.quoteSnapshot ? { ...tripCharges(form), subtotal: form.quoteSnapshot.subtotal, taxAmount: form.quoteSnapshot.taxAmount, totalAmount: form.quoteSnapshot.totalAmount } : tripCharges(form)
  const namedPassengers = form.passengers.filter((passenger) => passenger.name.trim() && passenger.phone.trim()).length

  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    const pickup = new Date(form.pickupAt)
    const returnAt = new Date(form.returnAt)
    const passengerCount = Number(form.passengerCount)
    const unitPrice = Number(form.unitPrice)
    const quantity = Number(form.quantity)
    const waitingRatePerHour = Number(form.waitingRatePerHour)
    const includedWaitingMinutes = Number(form.includedWaitingMinutes)
    const waitingBillingIncrementMinutes = Number(form.waitingBillingIncrementMinutes)
    const taxPercent = Number(form.taxPercent)
    const stops = form.stops.map(cleanStop)
    const passengers = form.passengers.map(cleanPassenger)
    if (!form.companyName.trim() || !form.contactName.trim() || !form.contactPhone.trim() || !form.contactEmail.trim()) { setError('Enter the company and primary contact details.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) { setError('Enter a valid contact email address.'); return }
    if (!form.projectManager.trim() || !form.projectCode.trim()) { setError('Enter the project manager and project code.'); return }
    if (!Number.isInteger(passengerCount) || passengerCount < 1) { setError('Enter at least one expected passenger.'); return }
    if (!passengers.length || !passengers[0].name || !passengers[0].phone) { setError('Enter the lead passenger name and phone.'); return }
    if (passengers.some((passenger) => !passenger.name || !passenger.phone)) { setError('Complete or remove each added passenger.'); return }
    if (passengers.length > passengerCount) { setError('Named passengers cannot exceed the expected passenger count.'); return }
    if (!isAdvance && passengers.length !== passengerCount) { setError('Add every passenger before creating a quick trip.'); return }
    if (stops.length < 2 || stops.some((stop) => !stop.location)) { setError('Enter a pickup, drop-off, and every added stop.'); return }
    if (stops.some((stop) => !Number.isFinite(stop.waitingMinutes) || stop.waitingMinutes < 0 || stop.waitingMinutes > 1440)) { setError('Waiting at each location must be between 0 and 1,440 minutes.'); return }
    if (!form.pickupAt || !form.returnAt || Number.isNaN(pickup.getTime()) || Number.isNaN(returnAt.getTime()) || returnAt <= pickup) { setError('Enter a valid pickup and a later return time.'); return }
    if (!initial && isAdvance && dayKey(pickup) <= dayKey(new Date())) { setError('Scheduled trips must begin on a future date.'); return }
    if (!initial && !isAdvance && Math.abs(pickup.getTime() - new Date().getTime()) > 30 * 60000) { setError('Quick trips must begin within 30 minutes of now.'); return }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(quantity) || quantity <= 0) { setError('Enter a positive unit price and quantity.'); return }
    if (form.quoteSnapshot && (form.quoteSnapshot.companyId !== matchedCompany?.id || form.quoteSnapshot.stops !== JSON.stringify(form.stops.map((stop) => [stop.location, stop.waitingMinutes])) || form.quoteSnapshot.pickupDate !== dayKey(form.pickupAt) || form.quoteSnapshot.vehicle !== form.quoteVehicle || form.quoteSnapshot.extraKm !== Number(form.extraKm) || form.quoteSnapshot.overtimeHours !== Number(form.overtimeHours) || form.quoteSnapshot.extraDriver !== form.extraDriver || form.quoteSnapshot.oneWayKm !== Number(form.oneWayKm) || form.quoteSnapshot.waitingRatePerHour !== waitingRatePerHour || form.quoteSnapshot.includedWaitingMinutes !== includedWaitingMinutes || form.quoteSnapshot.waitingBillingIncrementMinutes !== waitingBillingIncrementMinutes || form.quoteSnapshot.taxPercent !== taxPercent || Number(form.quoteSnapshot.lines[0]?.unitPrice) !== unitPrice || quantity !== 1)) { setError('The agreed quote price is out of date. Apply it again or use a manual price.'); return }
    if (form.waitingRatePerHour === '' || form.includedWaitingMinutes === '' || !Number.isFinite(waitingRatePerHour) || waitingRatePerHour < 0 || !Number.isInteger(includedWaitingMinutes) || includedWaitingMinutes < 0 || ![5, 15, 30, 60].includes(waitingBillingIncrementMinutes) || !Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) { setError('Enter valid waiting settings and a tax percentage from 0 to 100.'); return }
    if (!isAdvance && !form.vehicleId) { setError('Choose an available vehicle for a quick trip.'); return }
    if (!isAdvance && form.serviceMode === 'With driver' && !form.driverId) { setError('Choose a driver or select Self-drive.'); return }
    if (selectedVehicle && passengerCount > Number(selectedVehicle.seats || 0)) { setError(`This vehicle has ${selectedVehicle.seats} seats, fewer than the expected passengers.`); return }
    if (form.vehicleId && resourceConflict('vehicle', form.vehicleId, form.pickupAt, form.returnAt, initial?.id, trips, bookings)) { setError('The selected vehicle overlaps another trip or booking.'); return }
    if (form.serviceMode === 'With driver' && form.driverId && resourceConflict('driver', form.driverId, form.pickupAt, form.returnAt, initial?.id, trips, bookings)) { setError('The selected driver overlaps another trip or booking.'); return }
    const status = !initial && !isAdvance ? form.handoverNow ? 'Active' : 'Confirmed' : form.status
    if (['Active', 'Completed'].includes(status) && (!form.vehicleId || (form.serviceMode === 'With driver' && !form.driverId))) { setError('Assign the vehicle and driver before starting this trip.'); return }
    if (status === 'Active' && passengers.length !== passengerCount) { setError('Complete the passenger list before handover.'); return }
    setSaving(true)
    try { await onSave({
      ...initial, bookingType: isAdvance ? 'Advance' : 'Quick', companyId: matchedCompany?.id || null, companyName: (matchedCompany?.name || form.companyName).trim(), contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(), contactEmail: form.contactEmail.trim().toLowerCase(), emailNotifications: form.emailNotifications,
      projectManager: form.projectManager.trim(), projectCode: form.projectCode.trim(), projectRemarks: form.projectRemarks.trim(),
      passengerCount, passengers, stops, pickupLocation: stops[0].location, destination: stops.at(-1).location,
      pickupAt: form.pickupAt, returnAt: form.returnAt, requestedType: isAdvance ? form.requestedType : selectedVehicle?.type || form.requestedType,
      serviceMode: form.serviceMode, vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
      driverId: form.serviceMode === 'With driver' && form.driverId ? Number(form.driverId) : null,
      rateUnit: form.rateUnit, unitPrice, quantity, waitingRatePerHour, includedWaitingMinutes, waitingBillingIncrementMinutes, taxPercent, ...tripCharges({ unitPrice, quantity, waitingRatePerHour, includedWaitingMinutes, waitingBillingIncrementMinutes, stops, taxPercent }),
      ...(form.quoteSnapshot ? { subtotal: form.quoteSnapshot.subtotal, taxAmount: form.quoteSnapshot.taxAmount, totalAmount: form.quoteSnapshot.totalAmount } : {}),
      extraKm: Number(form.extraKm), overtimeHours: Number(form.overtimeHours), extraDriver: form.extraDriver, oneWayKm: Number(form.oneWayKm), quoteSnapshot: form.quoteSnapshot, chargeLines: form.quoteSnapshot?.lines || null,
      status, notes: form.notes.trim(), billingStatus: initial?.billingStatus || 'Unbilled', bookedAt: initial?.bookedAt || localDateTime(new Date()),
      handedOverAt: ['Active', 'Completed'].includes(status) ? initial?.handedOverAt || localDateTime(new Date()) : '',
    }) } catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }

  return <form className="booking-form corporate-form" onSubmit={save} noValidate>
    <section className="booking-form-section"><h3>Corporate Account</h3><div className="booking-form-grid">
      <div className="corporate-company-picker"><label><FormFieldCaption required>Company Name</FormFieldCaption><input required list="corporate-company-suggestions" value={form.companyName} onChange={(event) => chooseCompany(event.target.value)} placeholder="Choose or type a company" autoComplete="off" /></label><datalist id="corporate-company-suggestions">{companies.map((company) => <option key={company.id} value={company.name} />)}</datalist><button type="button" onClick={() => setShowCompanyEditor((value) => !value)}>{showCompanyEditor ? 'Close company form' : '+ Add New Company'}</button><small>{matchedCompany ? 'Existing company selected' : 'Type a new name or add a company now'}</small></div>
      <label><FormFieldCaption required>Trip Contact</FormFieldCaption><input required value={form.contactName} onChange={(event) => set('contactName', event.target.value)} placeholder="Person coordinating this trip" /></label>
      <label><FormFieldCaption required>Contact Phone</FormFieldCaption><input required type="tel" value={form.contactPhone} onChange={(event) => set('contactPhone', event.target.value)} placeholder="+966 5X XXX XXXX" /></label>
      <label><FormFieldCaption required>Contact Email</FormFieldCaption><input required type="email" value={form.contactEmail} onChange={(event) => set('contactEmail', event.target.value)} placeholder="contact@company.com" /></label>
      <label className="booking-wide-field booking-check-field"><input type="checkbox" checked={form.emailNotifications} onChange={(event) => set('emailNotifications', event.target.checked)} /><span>Email trip confirmations and updates</span></label>
    </div>{showCompanyEditor && <div className="corporate-inline-company"><CompanyEditor companies={companies} onSave={addCompany} onCancel={() => setShowCompanyEditor(false)} compact /></div>}</section>
    <section className="booking-form-section"><h3>Project</h3><div className="booking-form-grid">
      <label><FormFieldCaption required>Project Manager</FormFieldCaption><input required value={form.projectManager} onChange={(event) => set('projectManager', event.target.value)} placeholder="Client-side project manager" /></label>
      <label><FormFieldCaption required>Project Code</FormFieldCaption><input required value={form.projectCode} onChange={(event) => set('projectCode', event.target.value)} placeholder="e.g. PRJ-420" /></label>
      <label className="booking-wide-field">Project Remarks<textarea rows="2" value={form.projectRemarks} onChange={(event) => set('projectRemarks', event.target.value)} placeholder="Project instructions or context" /></label>
    </div></section>
    <section className="booking-form-section"><div className="corporate-section-heading"><div><h3>Passengers</h3><p className="booking-form-lead">The first passenger is the lead. Add all names for a quick trip; scheduled trips can complete the list before handover.</p></div><button type="button" className="booking-secondary" onClick={addPassenger}>+ Add Passenger</button></div><div className="booking-form-grid"><label><FormFieldCaption required>Expected Passengers</FormFieldCaption><input required type="number" min="1" step="1" value={form.passengerCount} onChange={(event) => set('passengerCount', event.target.value)} /></label><div className="corporate-roster-count">{namedPassengers} named of {form.passengerCount || 0} expected</div></div><div className="corporate-repeat-list">{form.passengers.map((passenger, index) => <div className="corporate-repeat-row" key={passenger.id}><div className="corporate-repeat-title"><strong>{index === 0 ? 'Lead Passenger' : `Passenger ${index + 1}`}</strong>{index > 0 && <button type="button" onClick={() => removePassenger(passenger.id)}>Remove</button>}</div><div className="booking-form-grid"><label><FormFieldCaption required>Name</FormFieldCaption><input required value={passenger.name} onChange={(event) => setPassenger(passenger.id, 'name', event.target.value)} placeholder="Passenger full name" /></label><label><FormFieldCaption required>Contact Number</FormFieldCaption><input required type="tel" value={passenger.phone} onChange={(event) => setPassenger(passenger.id, 'phone', event.target.value)} placeholder="+966 5X XXX XXXX" /></label></div></div>)}</div></section>
    <section className="booking-form-section"><h3>Itinerary</h3><p className="booking-form-lead">Locations run in the order shown. Record planned waiting at any location, including pickup and drop-off.</p><div className="booking-form-grid"><label><FormFieldCaption required>Pickup Date & Time</FormFieldCaption><input required type="datetime-local" value={form.pickupAt} onChange={(event) => set('pickupAt', event.target.value)} /></label><label><FormFieldCaption required>Return Date & Time</FormFieldCaption><input required type="datetime-local" min={form.pickupAt || undefined} value={form.returnAt} onChange={(event) => set('returnAt', event.target.value)} /></label></div><div className="corporate-repeat-list">{form.stops.map((stop, index) => <div className="corporate-repeat-row" key={stop.id}><div className="corporate-repeat-title"><strong>{index === 0 ? 'Pickup' : index === form.stops.length - 1 ? 'Drop-off' : `Stop ${index}`}</strong>{index > 0 && index < form.stops.length - 1 && <span className="corporate-stop-actions"><button type="button" disabled={index === 1} onClick={() => moveStop(index, -1)}>↑ Move up</button><button type="button" disabled={index === form.stops.length - 2} onClick={() => moveStop(index, 1)}>↓ Move down</button><button type="button" onClick={() => removeStop(stop.id)}>Remove</button></span>}</div><div className="booking-form-grid"><label><FormFieldCaption required>Location</FormFieldCaption><input required value={stop.location} onChange={(event) => setStop(stop.id, 'location', event.target.value)} placeholder="Address or location" /></label><label>Planned Waiting (minutes)<input type="number" min="0" max="1440" step="1" value={stop.waitingMinutes} onChange={(event) => setStop(stop.id, 'waitingMinutes', event.target.value)} /></label></div></div>)}</div><button type="button" className="booking-secondary corporate-add-stop" onClick={addStop}>+ Add Location</button><p className="booking-help">Times use this browser’s local time zone.</p></section>
    <section className="booking-form-section"><h3>Vehicle & Assignment</h3><p className="booking-form-lead">{isAdvance ? 'Reserve a vehicle class now. Assign the specific vehicle and driver on the trip day.' : 'Select a vehicle and driver for a trip starting now.'}</p><div className="booking-form-grid"><label><FormFieldCaption required>Service Mode</FormFieldCaption><select required value={form.serviceMode} onChange={(event) => { setForm((current) => ({ ...current, serviceMode: event.target.value, driverId: event.target.value === 'Self-drive' ? '' : current.driverId })); setError('') }}><option>With driver</option><option>Self-drive</option></select></label>
      {isAdvance ? <label><FormFieldCaption required>Requested Vehicle Type</FormFieldCaption><select required value={form.requestedType} onChange={(event) => set('requestedType', event.target.value)}>{TYPE_OPTIONS.map((type) => <option key={type}>{type}</option>)}</select></label> : <div className="booking-vehicle-picker"><label>Search Available Vehicles<input type="search" value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Make, model or registration" /></label><label><FormFieldCaption required>Vehicle</FormFieldCaption><select required value={form.vehicleId} onChange={(event) => { const vehicleId = event.target.value; const vehicle = vehicles.find((item) => item.id === Number(vehicleId)); setForm((current) => ({ ...current, vehicleId, unitPrice: vehicleId ? String(rateFor(vehicle, current.rateUnit)) : '', quoteVehicle: vehicle?.type || current.quoteVehicle, quoteSnapshot: null })); setError('') }}><option value="">Select vehicle</option>{shownVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.registration} · {vehicle.seats} seats</option>)}</select></label><small>{shownVehicles.length} of {eligibleVehicles.length} available vehicles shown</small></div>}
      {isAdvance && initial?.vehicleId && <label>Assigned Vehicle<input readOnly value={`${selectedVehicle?.make || ''} ${selectedVehicle?.model || ''} · ${selectedVehicle?.registration || ''}`} /></label>}
      {!isAdvance && form.serviceMode === 'With driver' && <label><FormFieldCaption required>Driver</FormFieldCaption><select required value={form.driverId} onChange={(event) => set('driverId', event.target.value)}><option value="">Select driver</option>{activeDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.employeeId}</option>)}</select></label>}
    </div></section>
<section className="booking-form-section"><h3>Charges</h3>{matchedCompany && <div className="booking-quote-panel"><strong>Company agreed rates</strong>{quote ? <><p>{quote.number} v{quote.version} · effective {quote.effectiveFrom} to {quote.effectiveTo || 'open'} · {quote.taxPercent}% VAT</p><div className="booking-form-grid"><label>Quoted vehicle / class<select value={form.quoteVehicle} onChange={(event) => set('quoteVehicle', event.target.value)}><option value="">Select quoted class</option>{[...new Set(matchingRoutes.map((rate) => rate.vehicle))].map((value) => <option key={value}>{value}</option>)}</select></label><label>Chargeable extra km<input type="number" min="0" value={form.extraKm} onChange={(event) => set('extraKm', event.target.value)} /></label><label>Overtime hours<input type="number" min="0" step="0.5" value={form.overtimeHours} onChange={(event) => set('overtimeHours', event.target.value)} /></label><label>One-way distance (km)<input type="number" min="0" value={form.oneWayKm} onChange={(event) => set('oneWayKm', event.target.value)} /></label><label className="booking-check-field"><input type="checkbox" checked={form.extraDriver} onChange={(event) => set('extraDriver', event.target.checked)} /><span>Additional driver charge applies</span></label></div>{quoteEstimate?.match && matchingRoutes.some((rate) => rate.id === quoteEstimate.match.id) ? <div className="booking-quote-preview"><span>{quoteEstimate.match.from}{quoteEstimate.match.via ? ` → ${quoteEstimate.match.via}` : ''} → {quoteEstimate.match.to} · {quoteEstimate.match.vehicle}</span><strong>{money(quoteEstimate.total)} before planned waiting</strong><button type="button" className="booking-secondary" onClick={applyQuote}>Apply agreed rate</button></div> : <p>No exact route/class rate matches this itinerary. For multi-stop trips, quote the ordered stops as one package. Monthly rates are billed by cycle.</p>}</> : <p>No approved quote covers this pickup date. Enter a manual price or arrange a quote in Customer.</p>}{form.quoteSnapshot && <p className="booking-quote-applied">Applied {form.quoteSnapshot.quoteNumber} v{form.quoteSnapshot.version} · {money(form.quoteSnapshot.totalAmount)} including waiting and VAT.</p>}</div>}<div className="booking-form-grid"><label><FormFieldCaption required>Billing Unit</FormFieldCaption><select required value={form.rateUnit} onChange={(event) => { const rateUnit = event.target.value; const vehicle = vehicles.find((item) => item.id === Number(form.vehicleId)); setForm((current) => ({ ...current, rateUnit, unitPrice: !isAdvance && vehicle ? String(rateFor(vehicle, rateUnit)) : current.unitPrice })); setError('') }}><option>Trip</option><option>Hour</option><option>Day</option><option>Month</option></select></label><label><FormFieldCaption required>Unit Price (SAR)</FormFieldCaption><input required type="number" min="0.01" step="0.01" value={form.unitPrice} onChange={(event) => set('unitPrice', event.target.value)} placeholder="0.00" /></label><label><FormFieldCaption required>Quantity</FormFieldCaption><input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => set('quantity', event.target.value)} /></label><label>Waiting Rate (SAR / hour)<input type="number" min="0" step="0.01" value={form.waitingRatePerHour} onChange={(event) => set('waitingRatePerHour', event.target.value)} /></label><label>Included Waiting (minutes)<input type="number" min="0" step="1" value={form.includedWaitingMinutes} onChange={(event) => set('includedWaitingMinutes', event.target.value)} /></label><label>Waiting Billing Increment<select value={form.waitingBillingIncrementMinutes} onChange={(event) => set('waitingBillingIncrementMinutes', event.target.value)}>{[5, 15, 30, 60].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></label><label>Tax %<input type="number" min="0" max="100" step="0.01" value={form.taxPercent} onChange={(event) => set('taxPercent', event.target.value)} /></label>{isAdvance && !initial && <label>Trip Status<select value={form.status} onChange={(event) => set('status', event.target.value)}><option>Pending</option><option>Confirmed</option></select></label>}{initial && ['Pending', 'Confirmed'].includes(initial.status) && <label>Trip Status<select value={form.status} onChange={(event) => set('status', event.target.value)}><option disabled={initial.status === 'Confirmed'}>Pending</option><option>Confirmed</option></select></label>}{!initial && !isAdvance && <label className="booking-wide-field booking-check-field"><input type="checkbox" checked={form.handoverNow} onChange={(event) => set('handoverNow', event.target.checked)} /><span>Vehicle handed over now — mark trip Active</span></label>}<label className="booking-wide-field">Internal Notes<textarea rows="2" value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Operational notes" /></label></div><div className="corporate-charge-summary"><div><span>Base ({form.quantity || 0} × {sar(form.unitPrice)})</span><strong>{sar(charges.base)}</strong></div><div><span>Waiting ({waitingMinutes(form.stops)} planned · {billableWaitingMinutes(form.stops, form.includedWaitingMinutes, form.waitingBillingIncrementMinutes)} billable min)</span><strong>{sar(charges.waiting)}</strong></div>{form.quoteSnapshot && <div><span>Quoted extras</span><strong>{sar(form.quoteSnapshot.subtotal - charges.base - charges.waiting)}</strong></div>}<div><span>Subtotal</span><strong>{sar(charges.subtotal)}</strong></div><div><span>Tax ({form.taxPercent || 0}%)</span><strong>{sar(charges.taxAmount)}</strong></div><div className="corporate-charge-total"><span>Total (SAR)</span><strong>{sar(charges.totalAmount)}</strong></div></div><p className="booking-help">Confirm the applicable tax rate and waiting charge for this agreement.</p></section>
    {error && <p className="booking-error" role="alert">{error}</p>}
    <div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="booking-primary" disabled={saving}>{initial ? 'Save Changes' : isAdvance ? 'Schedule Corporate Trip' : 'Create Quick Trip'}</button></div>
  </form>
}
