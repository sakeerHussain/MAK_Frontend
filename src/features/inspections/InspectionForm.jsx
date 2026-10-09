import { useState } from 'react'
import Icon from '../../app/Icon.jsx'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { prepareUpload } from '../../shared/lib/upload.js'
import { blankInspection, CONDITIONS, FUEL_LEVELS, INSPECTION_TYPES, validateInspection } from './InspectionData.js'

export default function InspectionForm({ initial, vehicles, bookings, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...blankInspection(), ...initial, vehicleId: String(initial?.vehicleId || ''), bookingId: String(initial?.bookingId || ''), odometerKm: initial?.odometerKm ?? '', photos: [...(initial?.photos || [])] }))
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === form.vehicleId)
  const matchingVehicles = vehicles.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.registration} ${vehicle.vehicleId || ''}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase()))
  const shownVehicles = matchingVehicles.slice(0, 30)
  if (selectedVehicle && !shownVehicles.some((vehicle) => vehicle.id === selectedVehicle.id)) shownVehicles.unshift(selectedVehicle)
  const matchingBookings = bookings.filter((booking) => Number(booking.vehicleId) === Number(form.vehicleId) && form.vehicleId)

  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }
  const changeVehicle = (vehicleId) => { setForm((current) => ({ ...current, vehicleId, bookingId: '' })); setError('') }
  const addPhotos = async (files) => {
    if (!files.length) return
    if (form.photos.length + files.length > 10) { setError('Add no more than 10 inspection photos.'); return }
    setUploading(true); setError('')
    try {
      const prepared = await Promise.all(files.map(async (file) => ({ ...await prepareUpload(file, 'image'), file })))
      setForm((current) => ({ ...current, photos: [...current.photos, ...prepared.map((photo) => ({ ...photo, id: crypto.randomUUID() }))] }))
    } catch (reason) { setError(reason.message.replace('Car photos', 'Inspection photos')) }
    finally { setUploading(false) }
  }
  const submit = async (event) => {
    event.preventDefault()
    const problem = validateInspection(form, vehicles, bookings)
    if (problem) { setError(problem); return }
    setSaving(true); setError('')
    try { await onSave({ ...form, vehicleId: Number(form.vehicleId), bookingId: form.bookingId ? Number(form.bookingId) : null, inspector: form.inspector.trim(), odometerKm: Number(form.odometerKm), fuelLevel: Number(form.fuelLevel), notes: form.notes.trim() }) }
    catch (reason) { setError(reason.message) }
    finally { setSaving(false) }
  }

  return <form className="inspection-form" onSubmit={submit} noValidate>
    <fieldset disabled={saving} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
    <section className="inspection-form-section"><h3>Vehicle & Inspection</h3><div className="inspection-form-grid">
      <div className="inspection-vehicle-picker"><label>Search Fleet<input type="search" value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Make, model, reg no., vehicle ID" /></label><label><FormFieldCaption required>Car</FormFieldCaption><select value={form.vehicleId} onChange={(event) => changeVehicle(event.target.value)}><option value="">Select a car</option>{shownVehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.make} {vehicle.model} ({vehicle.registration})</option>)}</select></label><small>{matchingVehicles.length > 30 ? `Showing first 30 of ${matchingVehicles.length} cars. Refine your search.` : `${matchingVehicles.length} matching cars`}</small></div>
      <label><FormFieldCaption required>Inspection Type</FormFieldCaption><select value={form.type} onChange={(event) => set('type', event.target.value)}>{INSPECTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label><FormFieldCaption required>Condition</FormFieldCaption><select value={form.condition} onChange={(event) => set('condition', event.target.value)}>{CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
      <label><FormFieldCaption required>Inspection Date</FormFieldCaption><input type="date" value={form.inspectionDate} onChange={(event) => set('inspectionDate', event.target.value)} /></label>
    </div></section>
    <section className="inspection-form-section"><h3>Readings & Assignment</h3><div className="inspection-form-grid">
      <label><FormFieldCaption required>Inspector</FormFieldCaption><input value={form.inspector} onChange={(event) => set('inspector', event.target.value)} placeholder="Name of person inspecting the car" /></label>
      <label><FormFieldCaption required>Odometer (km)</FormFieldCaption><input type="number" min="0" step="1" value={form.odometerKm} onChange={(event) => set('odometerKm', event.target.value)} placeholder="Current reading" /></label>
      <label><FormFieldCaption required>Fuel Level</FormFieldCaption><select value={form.fuelLevel} onChange={(event) => set('fuelLevel', event.target.value)}>{FUEL_LEVELS.map((level) => <option value={level} key={level}>{level}%{level === 0 ? ' · Empty' : level === 100 ? ' · Full' : ''}</option>)}</select></label>
      <label><span>Booking ID <span className="inspection-optional">(optional)</span></span><select value={form.bookingId} onChange={(event) => set('bookingId', event.target.value)} disabled={!form.vehicleId}><option value="">No linked booking</option>{matchingBookings.map((booking) => <option value={booking.id} key={booking.id}>{booking.bookingId} · {booking.customerName}</option>)}</select><small>{form.vehicleId ? 'Only bookings assigned to this car are shown.' : 'Select a car to see its bookings.'}</small></label>
    </div></section>
    <section className="inspection-form-section"><h3>Condition Evidence</h3><label className="inspection-notes-label">Damage / Condition Notes<textarea rows="4" value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Describe damage, cleanliness, equipment, or other findings" /></label>
      <div className="inspection-photo-heading"><div><strong>Photo Upload</strong><small>Optional · PNG, JPG, or WebP · up to 5 MB each · maximum 10</small></div><label className="inspection-photo-picker"><Icon name="upload" size={16} /> {uploading ? 'Preparing photos...' : 'Add Photos'}<input type="file" accept=".png,.jpg,.jpeg,.webp" multiple aria-label="Upload inspection photos" disabled={uploading} onChange={(event) => { addPhotos(Array.from(event.target.files || [])); event.target.value = '' }} /></label></div>
      {form.photos.length > 0 && <div className="inspection-photo-grid">{form.photos.map((photo) => <div className="inspection-photo" key={photo.id}><img src={photo.previewUrl} alt={photo.name} /><span title={photo.name}>{photo.name}</span><button type="button" aria-label={`Remove ${photo.name}`} onClick={() => set('photos', form.photos.filter((item) => item.id !== photo.id))}><Icon name="close" size={13} /></button></div>)}</div>}
    </section>
    {error && <p className="inspection-error" role="alert">{error}</p>}
    <div className="inspection-form-actions"><button type="button" className="inspection-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="inspection-primary" disabled={uploading}><Icon name="check" size={16} /> {saving ? 'Saving...' : initial ? 'Save Changes' : 'Save Inspection'}</button></div>
    </fieldset>
  </form>
}
