import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import { DOCUMENT_TYPES, REQUIRED_DOCUMENT_TYPES, documentStatus, vehicleOwner } from './FleetData.js'
import './VehicleDetailsPage.css'

const maintenanceItems = [
  ['Service', 'serviceIntervalKm', 'lastServiceKm'],
  ['Oil', 'oilIntervalKm', 'lastOilKm'],
  ['Tyres', 'tyreIntervalKm', 'lastTyreKm'],
  ['Brakes', 'brakeIntervalKm', 'lastBrakeKm'],
]
const display = (value) => value === null || value === undefined || value === '' ? '—' : value
const money = (value, currency) => value === null || value === undefined || value === '' ? '—' : `${currency || 'USD'} ${Number(value).toFixed(2)}`
const km = (value) => value === null || value === undefined || value === '' ? '—' : `${Number(value).toLocaleString()} km`
const statusClass = (status) => status.toLowerCase().replaceAll(' ', '-')

function CarDrawing() {
  return <svg viewBox="0 0 360 210" role="img" aria-label="No vehicle photo uploaded" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M53 131h255c11 0 20 9 20 20v21H32v-20c0-12 9-21 21-21z M88 131l22-49c5-12 16-19 29-19h82c13 0 24 7 29 19l23 49 M119 89h121 M81 131l-13 18 M281 131l13 18" />
    <circle cx="92" cy="173" r="23" fill="#fff" /><circle cx="270" cy="173" r="23" fill="#fff" />
    <path d="M33 151h30 M299 151h29 M180 64v66" />
  </svg>
}
function Info({ label, value }) {
  return <div className="vehicle-info-item"><dt>{label}</dt><dd>{display(value)}</dd></div>
}

export default function VehicleDetailsPage({ car, onBack, onEdit, onUploadDocuments, onUpdateStatus }) {
  const [activeImage, setActiveImage] = useState(0)
  if (!car) return <section className="vehicle-not-found"><h2>Vehicle not found</h2><p>This vehicle is no longer in the fleet list.</p><button type="button" onClick={onBack}>Back to Fleet</button></section>
  const images = car.carImages || []
  const image = images[Math.min(activeImage, images.length - 1)]
  const docs = documentStatus(car)
  const today = new Date().toISOString().slice(0, 10)
  const features = Array.isArray(car.featureTags) ? car.featureTags : String(car.featureTags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
  return <div className="vehicle-detail-page">
    <div className="vehicle-detail-toolbar"><button type="button" className="vehicle-back-link" onClick={onBack}><ActionIcon name="back" size={16} /> <ActionIcon name="back" size={16} /> Back to Fleet</button></div>
    <section className="vehicle-hero-card" aria-label="Vehicle overview">
      <div className="vehicle-gallery">
        <div className={`vehicle-gallery-main ${image ? '' : 'empty'}`}>{image ? <img src={image.previewUrl} alt={`${car.make} ${car.model} photo ${activeImage + 1}`} /> : <div className="vehicle-gallery-placeholder"><CarDrawing /><strong>No vehicle images yet</strong><span>Photos added in Edit Car will appear here.</span></div>}{images.length > 0 && <span className="vehicle-gallery-count">{Math.min(activeImage + 1, images.length)} / {images.length}</span>}</div>
        {images.length > 0 && <div className="vehicle-gallery-thumbnails" aria-label="Vehicle images">{images.map((item, index) => <button type="button" key={`${item.name}-${index}`} className={index === activeImage ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`Show vehicle photo ${index + 1}`} aria-pressed={index === activeImage}><img src={item.previewUrl} alt="" /></button>)}</div>}
      </div>
      <div className="vehicle-summary">
        <div className="vehicle-summary-badges"><span className={`fleet-status ${statusClass(car.status)}`}>{car.status}</span><span className={`fleet-documents ${docs.toLowerCase()}`}><i />{docs} documents</span></div>
        <h2>{car.make} {car.model}</h2><p className="vehicle-summary-subtitle">{car.year} · {car.type} · {car.registration}</p>
        <div className="vehicle-summary-meta">
          <Info label="Registration No." value={car.registration} />
          <Info label="Vehicle ID" value={car.vehicleId} />
          <Info label="Owner" value={vehicleOwner(car)} />
          <Info label="On-site?" value={car.onSite ? 'Yes' : 'No'} />
        </div>
        <div className="vehicle-price"><span>Daily rental rate</span><strong>{money(car.dailyRate ?? car.rate, car.rateCurrency)}</strong><small>/ day</small></div>
        <div className="vehicle-other-rates"><div><span>Hourly</span><strong>{money(car.hourlyRate, car.rateCurrency)}</strong></div><div><span>Monthly</span><strong>{money(car.monthlyRate, car.rateCurrency)}</strong></div></div>
        <div className="vehicle-summary-actions"><button type="button" className="vehicle-edit-button" onClick={onEdit}>Edit Car</button><button type="button" className="vehicle-outline-button" onClick={onUpdateStatus}>Update Status</button><button type="button" className="vehicle-outline-button" onClick={onUploadDocuments}>Upload Documents</button></div>
      </div>
    </section>

    <div className="vehicle-detail-grid">
      <section className="vehicle-detail-card" aria-labelledby="vehicle-spec-title"><div className="vehicle-card-heading"><div><h3 id="vehicle-spec-title">Vehicle Information</h3><p>Identification and specifications</p></div></div><dl className="vehicle-info-grid">
        <Info label="Make" value={car.make} /><Info label="Model" value={car.model} />
        <Info label="Year of Registration" value={car.year} /><Info label="Color" value={car.color} />
        <Info label="Door No." value={car.doorNo} /><Info label="Chassis No." value={car.chassisNo} />
        <Info label="Type" value={car.type} /><Info label="Seats" value={car.seats} />
        <Info label="Transmission" value={car.transmission} /><Info label="Fuel Type" value={car.fuelType} />
      </dl>{features.length > 0 && <div className="vehicle-feature-tags"><span>Feature Tags</span><div>{features.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div></div>}</section>
      <section className="vehicle-detail-card" aria-labelledby="vehicle-availability-title"><div className="vehicle-card-heading"><div><h3 id="vehicle-availability-title">Ownership & Availability</h3><p>Assignment and booking visibility</p></div></div><dl className="vehicle-info-grid">
        <Info label="Ownership" value={car.ownership} /><Info label="Owner" value={vehicleOwner(car)} />
        {car.ownership === 'Vendor' && <Info label="Vendor" value={car.vendor} />}
        <Info label="Custodian" value={car.custodian} /><Info label="Status" value={car.status} />
        <Info label="On-site?" value={car.onSite ? 'Yes' : 'No'} />
        <Info label="Listed for Booking" value={car.listedForBooking ? 'Yes' : 'No'} />
        <Info label="Show on Public Site" value={car.showOnPublicSite ? 'Yes' : 'No'} />
      </dl></section>
      <section className="vehicle-detail-card vehicle-card-wide" aria-labelledby="vehicle-maintenance-title"><div className="vehicle-card-heading"><div><h3 id="vehicle-maintenance-title">Maintenance Schedule</h3><p>Due mileage based on the last service or replacement reading</p></div><span className="vehicle-odometer">Current odometer <strong>{km(car.currentOdometerKm)}</strong></span></div><div className="vehicle-maintenance-scroll"><table className="vehicle-maintenance-table"><thead><tr><th>Item</th><th>Interval</th><th>Last reading</th><th>Next due</th><th>Remaining</th></tr></thead><tbody>{maintenanceItems.map(([label, intervalKey, lastKey]) => {
        const interval = Number(car[intervalKey]), last = Number(car[lastKey]), current = Number(car.currentOdometerKm)
        const scheduled = car[intervalKey] !== null && car[intervalKey] !== '' && car[intervalKey] !== undefined && interval > 0 && car[lastKey] !== null && car[lastKey] !== '' && car[lastKey] !== undefined
        const next = scheduled ? interval + last : null
        const remaining = next !== null && car.currentOdometerKm !== null && car.currentOdometerKm !== '' && car.currentOdometerKm !== undefined ? next - current : null
        return <tr key={label}><td><strong>{label}</strong></td><td>{km(car[intervalKey])}</td><td>{km(car[lastKey])}</td><td>{km(next)}</td><td>{remaining === null ? <span className="vehicle-muted">Not scheduled</span> : remaining <= 0 ? <span className="vehicle-due">Due / {Math.abs(remaining).toLocaleString()} km overdue</span> : <span className="vehicle-okay">{remaining.toLocaleString()} km left</span>}</td></tr>
      })}</tbody></table></div></section>
      <section className="vehicle-detail-card vehicle-card-wide" aria-labelledby="vehicle-documents-title"><div className="vehicle-card-heading"><div><h3 id="vehicle-documents-title">Documents</h3><p>Istimara, Insurance, and Fahas are required for a complete record</p></div><button type="button" className="vehicle-card-action" onClick={onUploadDocuments}>Upload Documents</button></div><div className="vehicle-document-grid">{DOCUMENT_TYPES.map((type) => {
        const record = (car.documentRecords || []).find((item) => item.type === type)
        const expired = Boolean(record?.expiryDate && record.expiryDate < today)
        return <div className="vehicle-document-card" key={type}>{record?.previewUrl ? <img className="vehicle-document-thumbnail" src={record.previewUrl} alt={`${type} document preview`} /> : <span className="vehicle-document-placeholder">{record ? 'PDF' : '—'}</span>}<div><strong>{type}</strong><small>{REQUIRED_DOCUMENT_TYPES.includes(type) ? 'Required' : 'Optional'}</small><span className={expired ? 'expired' : record ? 'complete' : 'missing'}>{expired ? 'Expired' : record ? 'Uploaded' : REQUIRED_DOCUMENT_TYPES.includes(type) ? 'Missing' : 'Not uploaded'}</span>{record && <p title={record.name}>{record.name}{record.expiryDate && <><br />Expires {record.expiryDate}</>}</p>}</div></div>
      })}</div></section>
    </div>
  </div>
}
