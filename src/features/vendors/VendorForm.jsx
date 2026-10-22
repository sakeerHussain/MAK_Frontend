import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import Icon from '../../app/Icon.jsx'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { prepareUpload } from '../../shared/lib/upload.js'
import { ATTACHMENT_TYPES, BANK_CURRENCIES, blankContact, blankVendor, BUSINESS_CLASSIFICATIONS, CREDIT_TERMS, validateVendor, VENDOR_STATUSES, VENDOR_TYPES } from './VendorData.js'

const bankFields = [['beneficiaryName', 'Beneficiary Name'], ['bankName', 'Bank Name'], ['iban', 'IBAN'], ['accountNumber', 'Account Number'], ['swiftCode', 'SWIFT Code']]

export default function VendorForm({ initial, vendors, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...blankVendor(), ...initial, contacts: initial?.contacts?.map((contact) => ({ ...contact })) || [blankContact()], bank: { ...blankVendor().bank, ...initial?.bank }, attachments: [...(initial?.attachments || [])] }))
  const [attachmentType, setAttachmentType] = useState(ATTACHMENT_TYPES[0])
  const [pendingFile, setPendingFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const setField = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }
  const setBank = (key, value) => { setForm((current) => ({ ...current, bank: { ...current.bank, [key]: value } })); setError('') }
  const setContact = (id, key, value) => { setForm((current) => ({ ...current, contacts: current.contacts.map((contact) => contact.id === id ? { ...contact, [key]: value } : contact) })); setError('') }
  const addContact = () => setForm((current) => ({ ...current, contacts: [...current.contacts, blankContact()] }))
  const removeContact = (id) => setForm((current) => ({ ...current, contacts: current.contacts.filter((contact) => contact.id !== id) }))
  const chooseFile = async (file) => {
    if (!file) return
    setBusy(true); setError('')
    try { setPendingFile({ ...await prepareUpload(file, 'document'), file }) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  const attach = () => {
    if (!pendingFile) { setError('Choose an attachment file first.'); return }
    setForm((current) => ({ ...current, attachments: [...current.attachments.filter((item) => item.type !== attachmentType), { type: attachmentType, ...pendingFile }] }))
    setPendingFile(null); setError('')
  }
  const save = async (event) => {
    event.preventDefault()
    const problem = validateVendor(form, vendors)
    if (problem) { setError(problem); return }
    const trimmed = (value) => String(value || '').trim()
    setBusy(true); setError('')
    try {
      await onSave({ ...form, name: trimmed(form.name), crNumber: trimmed(form.crNumber), vatNumber: trimmed(form.vatNumber), nationalAddress: trimmed(form.nationalAddress), commission: Number(form.commission), contacts: form.contacts.map((contact) => ({ ...contact, name: trimmed(contact.name), mobile: trimmed(contact.mobile), email: trimmed(contact.email) })), bank: Object.fromEntries(Object.entries(form.bank).map(([key, value]) => [key, trimmed(value)])) })
    } catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  return <form className="vendor-form" onSubmit={save} noValidate>
    <section className="vendor-form-section"><h3>Vendor Overview</h3><div className="vendor-form-grid">
      <label>Vendor Type<select value={form.vendorType} onChange={(event) => setField('vendorType', event.target.value)}>{VENDOR_TYPES.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label><FormFieldCaption required>Vendor Name</FormFieldCaption><input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Registered or individual name" /></label>
      <label>CR No. (Commercial Registration)<input value={form.crNumber} onChange={(event) => setField('crNumber', event.target.value)} placeholder="Numbers or letters" /></label>
      <label>VAT No.<input inputMode="numeric" maxLength={15} value={form.vatNumber} onChange={(event) => setField('vatNumber', event.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="15-digit tax identification number" /></label>
      <label className="vendor-wide">National Address<input value={form.nationalAddress} onChange={(event) => setField('nationalAddress', event.target.value)} placeholder="Building, street, district, city, postal code" /></label>
      <label>Business Classification<select value={form.classification} onChange={(event) => setField('classification', event.target.value)}><option value="">Select classification</option>{BUSINESS_CLASSIFICATIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label><FormFieldCaption required>Commission %</FormFieldCaption><input type="number" min="0" max="100" step="0.01" value={form.commission} onChange={(event) => setField('commission', event.target.value)} placeholder="0.00" /></label>
      <label>Status<select value={form.status} onChange={(event) => setField('status', event.target.value)}>{VENDOR_STATUSES.map((option) => <option key={option}>{option}</option>)}</select></label>
    </div></section>
    <section className="vendor-form-section"><div className="vendor-section-heading"><div><h3>Contact People</h3><p>The first person appears in the vendor table as the primary contact.</p></div><button type="button" className="vendor-secondary" onClick={addContact}><ActionIcon name="plus" size={15} /> Add Contact</button></div><div className="vendor-contact-list">{form.contacts.map((contact, index) => <div className="vendor-contact-row" key={contact.id}><div className="vendor-contact-row-head"><strong>{index === 0 ? 'Primary contact' : `Contact ${index + 1}`}</strong>{form.contacts.length > 1 && <button type="button" className="vendor-link-danger" onClick={() => removeContact(contact.id)}>Remove</button>}</div><div className="vendor-form-grid three"><label><FormFieldCaption required>Name</FormFieldCaption><input value={contact.name} onChange={(event) => setContact(contact.id, 'name', event.target.value)} /></label><label><FormFieldCaption required>Mobile No.</FormFieldCaption><input type="tel" value={contact.mobile} onChange={(event) => setContact(contact.id, 'mobile', event.target.value)} placeholder="+966 50 000 0000" /></label><label>Email ID<input type="email" value={contact.email} onChange={(event) => setContact(contact.id, 'email', event.target.value)} placeholder="contact@example.com" /></label></div></div>)}</div></section>
    <section className="vendor-form-section"><h3>Commercial Terms</h3><div className="vendor-form-grid three"><label>Credit Terms<select value={form.creditTerms} onChange={(event) => setField('creditTerms', event.target.value)}>{CREDIT_TERMS.map((days) => <option key={days} value={days}>{days} Days</option>)}</select></label><label>Contract Start Date<input type="date" value={form.contractStart} onChange={(event) => setField('contractStart', event.target.value)} /></label><label>Contract End Date<input type="date" min={form.contractStart || undefined} value={form.contractEnd} onChange={(event) => setField('contractEnd', event.target.value)} /></label></div></section>
    <section className="vendor-form-section"><h3>Bank Details</h3><div className="vendor-form-grid">{bankFields.map(([key, label]) => <label key={key}>{label}<input value={form.bank[key] || ''} onChange={(event) => setBank(key, event.target.value)} /></label>)}<label>Currency<select value={form.bank.currency} onChange={(event) => setBank('currency', event.target.value)}>{BANK_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></label></div></section>
    <section className="vendor-form-section"><h3>Attachments</h3><p className="vendor-form-help">Choose a document type and attach a PNG, JPG, WebP, or PDF file up to 5 MB. Adding another file of the same type replaces it.</p><div className="vendor-attachment-controls"><label>Attachment Type<select value={attachmentType} onChange={(event) => { setAttachmentType(event.target.value); setPendingFile(null) }}>{ATTACHMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="vendor-file-picker"><Icon name="upload" size={18} /><span><strong>{pendingFile?.name || 'Choose attachment'}</strong><small>PNG, JPG, WebP, or PDF</small></span><em>Browse</em><input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" aria-label="Choose vendor attachment" onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = '' }} /></label><button type="button" className="vendor-secondary" onClick={attach} disabled={busy || !pendingFile}>Attach</button></div>{form.attachments.length > 0 && <div className="vendor-attachment-list">{form.attachments.map((item) => <div key={item.type}><Icon name="document" size={17} /><span><strong>{item.type}</strong><small>{item.name}</small></span><button type="button" onClick={() => setForm((current) => ({ ...current, attachments: current.attachments.filter((attachment) => attachment.type !== item.type) }))}>Remove</button></div>)}</div>}</section>
    {error && <p className="vendor-error" role="alert">{error}</p>}
    <div className="vendor-form-actions"><button type="button" className="vendor-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="vendor-primary" disabled={busy}><ActionIcon name="check" size={16} /> {busy ? 'Saving…' : initial?.id ? 'Save Changes' : 'Save Vendor'}</button></div>
  </form>
}
