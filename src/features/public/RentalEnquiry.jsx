import { useEffect, useRef, useState } from 'react'
import Icon from '../../app/Icon.jsx'
import { fleetCategories, locations, rentalPreferences } from './LandingData.js'

export default function RentalEnquiry({ initial, lenisRef, onClose }) {
  const dialog = useRef(null)
  const [pickup, setPickup] = useState(initial.pickup || '')
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState('')
  const today = new Date().toLocaleDateString('en-CA')
  useEffect(() => {
    const activeElement = document.activeElement
    const oldOverflow = document.body.style.overflow
    const lenis = lenisRef.current
    document.body.style.overflow = 'hidden'
    lenis?.stop()
    dialog.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const controls = [...dialog.current.querySelectorAll('button, input, select, textarea, a[href]')].filter((item) => !item.disabled && item.getClientRects().length)
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = oldOverflow; lenis?.start(); activeElement?.focus() }
  }, [lenisRef, onClose])

  const submit = (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    if (values.returnDate && values.pickupDate && values.returnDate < values.pickupDate) { setError('Return date must be on or after pickup date.'); return }
    setError('')
    const labels = { name: 'Name', email: 'Email', phone: 'Phone', company: 'Company', category: 'Vehicle category', preference: 'Rental preference', location: 'Pickup location', pickupDate: 'Pickup date', returnDate: 'Return date', notes: 'Journey details' }
    const text = ['MAK RENTALS - RENTAL ENQUIRY', 'Prepared locally. This enquiry has not been sent and is not a confirmed booking.', '', ...Object.entries(labels).map(([key, label]) => `${label}: ${values[key] || 'Not specified'}`), '', 'Confirm vehicle availability, rates and rental terms with the MAK team.'].join('\r\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'MAK-rental-enquiry.txt'
    document.body.appendChild(anchor); anchor.click(); anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setDownloaded(true)
  }

  return <div className="mak-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={dialog} className="mak-enquiry" role="dialog" aria-modal="true" aria-labelledby="mak-enquiry-title" aria-describedby="mak-enquiry-description" tabIndex={-1} data-lenis-prevent>
      <div className="mak-enquiry-header"><div><span className="mak-eyebrow">YOUR NEXT JOURNEY</span><h2 id="mak-enquiry-title">Let's make a <em>plan.</em></h2></div><button type="button" className="mak-round-button" aria-label="Close rental enquiry" onClick={onClose}><Icon name="close" size={20} /></button></div>
      <p id="mak-enquiry-description">Prepare your rental details and download a copy. This preview does not send the enquiry or reserve a vehicle.</p>
      <form onSubmit={submit} onChange={() => setDownloaded(false)} className="mak-enquiry-form">
        <label><span>Full name <span className="mak-required" aria-hidden="true">*</span></span><input name="name" autoComplete="name" required placeholder="Your full name" /></label>
        <label><span>Email <span className="mak-required" aria-hidden="true">*</span></span><input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
        <label><span>Phone <span className="mak-required" aria-hidden="true">*</span></span><input name="phone" type="tel" autoComplete="tel" required placeholder="Include country code" /></label>
        <label><span>Company <small>Optional</small></span><input name="company" autoComplete="organization" placeholder="For business enquiries" /></label>
        <label><span>Vehicle category</span><select name="category" defaultValue={initial.category || 'All vehicles'}>{fleetCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Rental preference</span><select name="preference" defaultValue={initial.preference || 'Self-drive'}>{rentalPreferences.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="mak-form-wide"><span>Pickup location</span><input name="location" list="mak-enquiry-locations" autoComplete="off" defaultValue={initial.location || 'Al Khobar'} placeholder="City or pickup address" /><datalist id="mak-enquiry-locations">{locations.map((item) => <option key={item} value={item} />)}</datalist></label>
        <label><span>Pickup date</span><input name="pickupDate" type="date" min={today} value={pickup} onChange={(event) => { setPickup(event.target.value); setDownloaded(false) }} /></label>
        <label><span>Return date</span><input name="returnDate" type="date" min={pickup || today} defaultValue={initial.returnDate || ''} /></label>
        <label className="mak-form-wide"><span>Tell us about your journey <small>Optional</small></span><textarea name="notes" rows={3} defaultValue={initial.notes || ''} placeholder="Destinations, passengers, driver requirements or project details" /></label>
        <p className="mak-form-note mak-form-wide"><Icon name="document" size={17} />Only share journey details here. Leave out identity documents and payment information.</p>
        {error && <p role="alert" className="mak-form-error mak-form-wide">{error}</p>}
        {downloaded && <p role="status" className="mak-download-status mak-form-wide"><Icon name="check" size={18} />Your enquiry has been prepared for download. It has not been sent to MAK.</p>}
        <div className="mak-form-actions mak-form-wide"><button type="button" className="mak-text-button" onClick={onClose}>Close</button><button type="submit" className="mak-button">Download enquiry <Icon name="download" size={17} /></button></div>
      </form>
    </section>
  </div>
}
