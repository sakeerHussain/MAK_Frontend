import { useState } from 'react'
import ActionIcon from '../../app/ActionIcon.jsx'
import { blankCustomer, prepareCustomerForm } from './CustomerEditorData.js'
import './CustomerPage.css'

const Field = ({ label, required, children, wide = false }) => <label className={`customer-field ${wide ? 'wide' : ''}`}><span>{label}{required && <b aria-hidden="true"> *</b>}</span>{children}</label>

export default function CustomerEditor({ initial, type, onSave, onCancel, rows = [], lockType = false }) {
  const [kind, setKind] = useState(type || 'Individual')
  const [form, setForm] = useState(initial || blankCustomer(kind))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }
  const switchKind = (value) => { setKind(value); setForm(blankCustomer(value)); setError('') }
  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    setError('')
    let record
    try { record = prepareCustomerForm(kind, form, rows, initial) }
    catch (cause) { setError(cause.message); return }
    setSaving(true)
    try { await onSave(kind,record) }
    catch (cause) { setError(cause.message || 'Could not save this customer.') }
    finally { setSaving(false) }
  }
  return <section className="customer-card customer-editor"><div className="customer-section-head"><div><span className="customer-eyebrow">CUSTOMER ACCOUNT</span><h2>{initial ? 'Edit customer' : lockType && kind === 'Corporate' ? 'Add Corporate Customer' : 'Add customer'}</h2><p>Customer details are used for quotes, bookings, and billing.</p></div><button type="button" className="customer-secondary" onClick={onCancel}><ActionIcon name="back" size={15} /> Back</button></div>
    <form aria-busy={saving} data-permission-scope={`customers.${initial ? 'edit' : 'create'}`} onSubmit={save}><fieldset className="customer-api-content" disabled={saving}>{!initial && !lockType && <div className="customer-type-pick" role="group" aria-label="Customer type">{['Individual', 'Corporate'].map((option) => <button key={option} type="button" className={kind === option ? 'selected' : ''} onClick={() => switchKind(option)}>{option}</button>)}</div>}
      <div className="customer-form-grid"><Field label={kind === 'Corporate' ? 'Company name' : 'Full name'} required><input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required /></Field>
        {kind === 'Corporate' ? <><Field label="Billing contact name"><input value={form.billingContactName || ''} onChange={(e) => set('billingContactName', e.target.value)} /></Field><Field label="Billing phone" required><input value={form.billingPhone || ''} onChange={(e) => set('billingPhone', e.target.value)} required /></Field><Field label="Billing email" required><input type="email" value={form.billingEmail || ''} onChange={(e) => set('billingEmail', e.target.value)} required /></Field><Field label="Registration / CR number"><input value={form.registrationNumber || ''} onChange={(e) => set('registrationNumber', e.target.value)} /></Field><Field label="VAT number"><input value={form.taxNumber || ''} onChange={(e) => set('taxNumber', e.target.value)} /></Field><Field label="Billing address" wide><input value={form.billingAddress || ''} onChange={(e) => set('billingAddress', e.target.value)} /></Field><Field label="City"><input value={form.billingCity || ''} onChange={(e) => set('billingCity', e.target.value)} /></Field><Field label="Country"><input value={form.billingCountry || ''} onChange={(e) => set('billingCountry', e.target.value)} /></Field><Field label="Payment terms"><input value={form.paymentTerms || ''} onChange={(e) => set('paymentTerms', e.target.value)} placeholder="Net 30 days" /></Field><Field label="Default waiting rate (SAR/hour)"><input type="number" min="0" step="0.01" value={form.waitingRatePerHour ?? ''} onChange={(e) => set('waitingRatePerHour', e.target.value)} /></Field><Field label="Included waiting minutes"><input type="number" min="0" value={form.includedWaitingMinutes ?? ''} onChange={(e) => set('includedWaitingMinutes', e.target.value)} /></Field><Field label="Billing increment minutes"><input type="number" min="1" value={form.waitingBillingIncrementMinutes ?? ''} onChange={(e) => set('waitingBillingIncrementMinutes', e.target.value)} /></Field></> : <><Field label="Phone" required><input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} required /></Field><Field label="Email" required><input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} required /></Field><Field label="Address" wide><input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field></>}
        <Field label="Status"><select value={form.status || 'Active'} onChange={(e) => set('status', e.target.value)}><option>Active</option><option>Inactive</option></select></Field></div>
      {error && <p className="customer-error" role="alert">{error}</p>}<div className="customer-form-actions"><button type="button" className="customer-secondary" onClick={onCancel}>Cancel</button><button className="customer-primary" type="submit"><ActionIcon name="check" size={16} />{saving ? ' Saving…' : ' Save customer'}</button></div>
    </fieldset></form></section>
}

