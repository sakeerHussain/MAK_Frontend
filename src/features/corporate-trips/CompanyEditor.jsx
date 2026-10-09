import { useState } from 'react'
import { normalizeCompanyName } from './CompanyData.js'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const initialForm = {
  name: '', registrationNumber: '', taxNumber: '', billingContactName: '', billingEmail: '', billingPhone: '',
  billingAddress: '', billingCity: '', billingCountry: '', paymentTerms: '',
  waitingRatePerHour: '0', includedWaitingMinutes: '0', waitingBillingIncrementMinutes: '15',
}

export default function CompanyEditor({ companies, onSave, onCancel, compact = false, initial = null }) {
  const [form, setForm] = useState(() => initial ? Object.fromEntries(Object.keys(initialForm).map((key) => [key, String(initial[key] ?? initialForm[key])])) : initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setError('') }
  const save = async () => {
    if (saving) return
    const company = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
    if (!company.name || !company.billingEmail || !company.billingPhone || !company.billingAddress || !company.billingCity || !company.billingCountry) { setError('Complete the required company and billing fields.'); return }
    if (!emailPattern.test(company.billingEmail)) { setError('Enter a valid billing email.'); return }
    if (companies.some((item) => item.id !== initial?.id && normalizeCompanyName(item.name) === normalizeCompanyName(company.name))) { setError('This company already exists. Choose it from the suggestions.'); return }
    const waitingRatePerHour = Number(company.waitingRatePerHour)
    const includedWaitingMinutes = Number(company.includedWaitingMinutes)
    const waitingBillingIncrementMinutes = Number(company.waitingBillingIncrementMinutes)
    if (company.waitingRatePerHour === '' || company.includedWaitingMinutes === '' || !Number.isFinite(waitingRatePerHour) || waitingRatePerHour < 0 || !Number.isInteger(includedWaitingMinutes) || includedWaitingMinutes < 0 || ![5, 15, 30, 60].includes(waitingBillingIncrementMinutes)) { setError('Enter a valid waiting rate, included minutes, and billing increment.'); return }
    setSaving(true)
    try { await onSave({ ...initial, ...company, name: company.name.replace(/\s+/g, ' '), billingEmail: company.billingEmail.toLowerCase(), waitingRatePerHour, includedWaitingMinutes, waitingBillingIncrementMinutes }) }
    catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }
  return <div className={`booking-form company-editor ${compact ? 'compact' : ''}`} onKeyDown={(event) => { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') { event.preventDefault(); save() } }}>
    <p className="booking-form-lead">{initial ? 'Update the billing profile used for future invoice drafts.' : 'Save company billing details and waiting defaults.'} The contact coordinating each trip is entered on that booking.</p>
    <section className="booking-form-section"><h3>Company</h3><div className="booking-form-grid">
      <label><FormFieldCaption required>Company Name</FormFieldCaption><input required value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Company or account name" /></label>
      <label>Registration Number<input value={form.registrationNumber} onChange={(event) => set('registrationNumber', event.target.value)} placeholder="Company registration number" /></label>
      <label>Tax Number<input value={form.taxNumber} onChange={(event) => set('taxNumber', event.target.value)} placeholder="Tax identification number" /></label>
    </div></section>
    <section className="booking-form-section"><h3>Billing</h3><div className="booking-form-grid">
      <label>Billing Contact Name<input value={form.billingContactName} onChange={(event) => set('billingContactName', event.target.value)} placeholder="Accounts payable contact" /></label>
      <label><FormFieldCaption required>Billing Email</FormFieldCaption><input required type="email" value={form.billingEmail} onChange={(event) => set('billingEmail', event.target.value)} placeholder="billing@company.com" /></label>
      <label><FormFieldCaption required>Billing Phone</FormFieldCaption><input required type="tel" value={form.billingPhone} onChange={(event) => set('billingPhone', event.target.value)} placeholder="+966 5X XXX XXXX" /></label>
      <label><FormFieldCaption required>Billing Address</FormFieldCaption><input required value={form.billingAddress} onChange={(event) => set('billingAddress', event.target.value)} placeholder="Street and building" /></label>
      <label><FormFieldCaption required>City</FormFieldCaption><input required value={form.billingCity} onChange={(event) => set('billingCity', event.target.value)} placeholder="Riyadh" /></label>
      <label><FormFieldCaption required>Country</FormFieldCaption><input required value={form.billingCountry} onChange={(event) => set('billingCountry', event.target.value)} placeholder="Saudi Arabia" /></label>
      <label>Payment Terms<input value={form.paymentTerms} onChange={(event) => set('paymentTerms', event.target.value)} placeholder="e.g. Due on receipt or Net 30" /></label>
    </div></section>
    <section className="booking-form-section"><h3>Booking Defaults</h3><div className="booking-form-grid">
      <label><FormFieldCaption required>Default Waiting Rate (SAR/hour)</FormFieldCaption><input required type="number" min="0" step="0.01" value={form.waitingRatePerHour} onChange={(event) => set('waitingRatePerHour', event.target.value)} /></label>
      <label><FormFieldCaption required>Included Waiting Minutes per Trip</FormFieldCaption><input required type="number" min="0" step="1" value={form.includedWaitingMinutes} onChange={(event) => set('includedWaitingMinutes', event.target.value)} /></label>
      <label><FormFieldCaption required>Billing Increment (minutes)</FormFieldCaption><select required value={form.waitingBillingIncrementMinutes} onChange={(event) => set('waitingBillingIncrementMinutes', event.target.value)}>{[5, 15, 30, 60].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></label>
    </div><p className="booking-help">Waiting beyond the included minutes is rounded up to the next billing increment. These defaults can be adjusted on each trip.</p></section>
    {error && <p className="booking-error" role="alert">{error}</p>}
    <div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={onCancel}>Cancel</button><button type="button" className="booking-primary" disabled={saving} onClick={save}>{initial ? 'Save Billing Profile' : 'Save Company'}</button></div>
  </div>
}
