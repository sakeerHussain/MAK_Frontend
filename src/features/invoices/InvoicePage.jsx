import BookingChargeReview from './BookingChargeReview.jsx'
import {bookingChargeReview, needsBookingChargeReview} from './BookingChargeImport.js'
import BillingProfileDialog from './BillingProfileDialog.jsx'
import {applyBillingProfile} from './BillingProfileData.js'
import InvoiceTermsFields from './InvoiceTermsFields.jsx'
import { initializeInvoiceSchedule } from './PaymentTerms.js'
import CreditNoteDialog from './CreditNoteDialog.jsx'
import useRentalDialog from '../../shared/hooks/useRentalDialog.js'
import DiscardDraftDialog from './DiscardDraftDialog.jsx'
import ActionIcon from '../../app/ActionIcon.jsx'
import EmailDeliveryPanel from '../../shared/components/EmailDeliveryPanel.jsx'
import { useEffect, useState } from 'react'
import { dayKey, sar } from '../bookings/BookingData.js'
import { releaseDraftRecords, invoiceDraftFromSources, invoicePaymentStatus, invoiceTaxSummary, invoiceTotals, lineAmounts, sourceIsBilled, validateInvoice } from './InvoiceData.js'
import { downloadCreditNote, downloadInvoiceDocument } from './InvoiceExport.js'
import InvoiceDocument from './InvoiceDocument.jsx'
import InvoiceList from './InvoiceList.jsx'
import { getBillingProfile, issueCreditNote, discardInvoice, invoicePayment, issueInvoice, saveInvoice } from './InvoiceApi.js'
import '../bookings/BookingPage.css'
import './InvoicePage.css'

const editableLine = (line) => ({ ...line, quantity: String(line.quantity), unitPrice: String(line.unitPrice), discountPercent: String(line.discountPercent || 0), taxPercent: line.taxPercent === '' || line.taxPercent == null ? '' : String(line.taxPercent) })
const cleanInvoice = (invoice) => ({ ...invoice,
  issuer: Object.fromEntries(Object.entries(invoice.issuer).map(([key, value]) => [key, value.trim()])),
  billTo: Object.fromEntries(Object.entries(invoice.billTo).map(([key, value]) => [key, value.trim()])),
  account: Object.fromEntries(Object.entries(invoice.account || {}).map(([key, value]) => [key, value.trim()])),
  lines: invoice.lines.map((line) => ({ ...line, description: line.description.trim(), unit: line.unit.trim(), quantity: Number(line.quantity), unitPrice: Number(line.unitPrice), discountPercent: Number(line.discountPercent || 0), taxPercent: line.taxPercent === '' ? '' : Number(line.taxPercent || 0) })),
  paymentTerms: invoice.paymentTerms.trim(), poNumber: (invoice.poNumber || '').trim(), transactionType: (invoice.transactionType || '').trim(), paymentContact: (invoice.paymentContact || '').trim(), notes: invoice.notes.trim(),
})

const partyFields = [
  ['name', 'Name'], ['buildingNumber', 'Building Number'], ['street', 'Street'], ['additionalNumber', 'Additional Number'],
  ['district', 'District'], ['city', 'City'], ['country', 'Country'], ['postalCode', 'ZIP / Postal Code'],
  ['phone', 'Phone'], ['taxNumber', 'VAT Number'], ['otherId', 'Other ID'],
]

function PartyFields({ kind, values, onChange, corporate }) {
  return <div className="invoice-form-grid">{partyFields.map(([key, label]) => {
    const required = key === 'name' || (key === 'street' && (kind === 'Seller' || corporate)) || (corporate && (key === 'city' || key === 'country'))
    return <label key={key}><span className="invoice-field-caption">{kind} {label}{required && <span className="invoice-required">*</span>}</span><input value={values[key] ?? (key === 'street' ? values.address || '' : key === 'otherId' ? values.registrationNumber || '' : '')} onChange={(event) => onChange(key, event.target.value)} /></label>
  })}{kind === 'Buyer' && <label><span className="invoice-field-caption">Billing Email<span className="invoice-required">*</span></span><input type="email" value={values.email || ''} onChange={(event) => onChange('email', event.target.value)} /></label>}</div>
}

function InvoiceEditor({ initial, billingProfile, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => ({ ...initial, ...initializeInvoiceSchedule(initial), issuer: { ...initial.issuer }, billTo: { ...initial.billTo }, account: { ...(initial.account || {}) }, lines: initial.lines.map(editableLine) }))
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const totals = invoiceTotals(draft)
  const change = (key, value) => { setDraft((current) => ({ ...current, [key]: value, ...(key==='lines'&&current.bookingChargeReview?{bookingChargeReview:{...current.bookingChargeReview,confirmed:false}}:{}) })); setError(''); setReviewing(false) }
  const changeSchedule = (patch) => { setDraft((current)=>({...current,...patch})); setError(''); setReviewing(false) }
  const changeParty = (party, key, value) => { setDraft((current) => ({ ...current, [party]: { ...current[party], [key]: value } })); setError(''); setReviewing(false) }
  const changeAccount = (key, value) => { setDraft((current) => ({ ...current, account: { ...current.account, [key]: value } })); setError(''); setReviewing(false) }
  const changeLine = (id, key, value) => { setDraft((current) => ({ ...current, ...(current.bookingChargeReview?{bookingChargeReview:{...current.bookingChargeReview,confirmed:false}}:{}), lines: current.lines.map((line) => line.id === id ? { ...line, [key]: value } : line) })); setError(''); setReviewing(false) }
  const save = async (issue = false) => {
    if (saving) return
    const message = validateInvoice(draft, issue)
    if (message) { setError(message); setReviewing(false); return }
    if (issue && !reviewing) { setReviewing(true); setError(''); return }
    setSaving(true)
    try { await onSave(cleanInvoice(draft), issue) }
    catch (cause) { setError(cause.message); setReviewing(false) }
    finally { setSaving(false) }
  }
  return <div data-permission-scope={`invoices.${initial.id ? 'edit' : 'create'}`} className="invoice-page"><div className="invoice-page-actions"><div><button type="button" className="booking-back" onClick={onCancel}><ActionIcon name="back" size={15} /> Back to Invoices</button>{initial.id ? <span className="invoice-draft-reference">Draft #{initial.id}</span> : null}<p>Linked to {initial.sources.map((source) => source.reference).join(' · ')}. Save your changes before closing.</p></div><span className="invoice-pill tone-draft">Draft</span></div>
    <div className="invoice-editor-layout"><div className="invoice-editor-main">
      <section className="invoice-card"><h3>Invoice Metadata</h3><div className="invoice-form-grid"><label><span className="invoice-field-caption">Invoice #</span><input readOnly value={draft.invoiceNumber || 'Assigned when issued'} /></label><label><span className="invoice-field-caption">Invoice Issue Date</span><input readOnly value={dayKey(draft.issuedAt) || 'Set when issued'} /></label><InvoiceTermsFields draft={draft} onChange={changeSchedule} /><label><span className="invoice-field-caption">P.O. #</span><input value={draft.poNumber || ''} onChange={(event) => change('poNumber', event.target.value)} /></label><label><span className="invoice-field-caption">Transaction Type</span><select value={draft.transactionType || 'Vehicle Rental'} onChange={(event) => change('transactionType', event.target.value)}><option>Vehicle Rental</option><option>Corporate Trip</option><option>Other Service</option></select></label><label><span className="invoice-field-caption">Currency</span><input readOnly value="SAR" /></label></div></section>
      <section className="invoice-card"><h3>Seller Details</h3><p>MAK billing profile version {draft.billingProfileVersion ?? 'not recorded'}. Changes here apply only to this draft.</p>{billingProfile&&<button type="button" className="booking-secondary" disabled={saving} onClick={async()=>{setSaving(true);try{const currentProfile=await getBillingProfile();setDraft(current=>applyBillingProfile(current,currentProfile));setError('');setReviewing(false)}catch(failure){setError(failure.message)}finally{setSaving(false)}}}>Apply Saved MAK Profile</button>}<PartyFields kind="Seller" values={draft.issuer} onChange={(key, value) => changeParty('issuer', key, value)} /></section>
      <section className="invoice-card"><h3>Buyer Details</h3><PartyFields kind="Buyer" values={draft.billTo} corporate={draft.kind === 'Corporate'} onChange={(key, value) => changeParty('billTo', key, value)} /></section>
<BookingChargeReview draft={draft} total={totals.total} onChange={value=>change('bookingChargeReview',value)} />
<section className="invoice-card"><div className="invoice-section-head"><div><h3>Line Items</h3><p>Each charge stays linked to a source booking or trip. Discounts and tax are calculated per line.</p></div><button type="button" className="booking-secondary" onClick={() => { setDraft((current) => ({ ...current, ...(current.bookingChargeReview?{bookingChargeReview:{...current.bookingChargeReview,confirmed:false}}:{}), lines: [...current.lines, { id: crypto.randomUUID(), sourceRef: current.sources[0].reference, description: '', quantity: '1', unit: 'Service', unitPrice: '', discountPercent: '0', taxPercent: current.bookingChargeReview?.required ? '' : '0' }] })); setReviewing(false) }}><ActionIcon name="plus" size={14} /> {draft.bookingChargeReview?.required?'Add Extra Charge':'Add Line'}</button></div><div className="invoice-line-list">{draft.lines.map((line, index) => <div className="invoice-line-editor" key={line.id}><div className="invoice-line-head"><strong>Line Item #{index + 1}</strong><button type="button" disabled={draft.lines.length === 1} onClick={() => change('lines', draft.lines.filter((item) => item.id !== line.id))}>Remove</button></div><div className="invoice-form-grid"><label className="invoice-wide"><span className="invoice-field-caption">Nature of goods or services<span className="invoice-required">*</span></span><input value={line.description} onChange={(event) => changeLine(line.id, 'description', event.target.value)} placeholder="Describe the charge" /></label><label>Source<select value={line.sourceRef} onChange={(event) => changeLine(line.id, 'sourceRef', event.target.value)}>{draft.sources.map((source) => <option key={source.reference} value={source.reference}>{source.reference}</option>)}</select></label><label>Unit<input value={line.unit} onChange={(event) => changeLine(line.id, 'unit', event.target.value)} /></label><label>Quantity<input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => changeLine(line.id, 'quantity', event.target.value)} /></label><label>Unit Price (SAR)<input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => changeLine(line.id, 'unitPrice', event.target.value)} /></label><label>Discount %<input type="number" min="0" max="100" step="0.01" value={line.discountPercent} onChange={(event) => changeLine(line.id, 'discountPercent', event.target.value)} /></label><label>Tax Rate (%)<input type="number" min="0" max="100" step="0.01" value={line.taxPercent} onChange={(event) => changeLine(line.id, 'taxPercent', event.target.value)} /></label></div><div className="invoice-line-breakdown"><span>Taxable Amount <strong>{sar(lineAmounts(line).net)}</strong></span><span>Tax Amount <strong>{sar(lineAmounts(line).tax)}</strong></span><span>Item Subtotal (Including VAT) <strong>{sar(lineAmounts(line).total)}</strong></span></div></div>)}</div></section>
      <section className="invoice-card"><h3>Notes</h3><label className="invoice-textarea-label"><span>Notes / Message</span><textarea rows="3" value={draft.notes} onChange={(event) => change('notes', event.target.value)} placeholder="Visible invoice note" /></label></section>
      <section className="invoice-card"><h3>Payment Details</h3><div className="invoice-form-grid"><label><span className="invoice-field-caption">Contact Person</span><input value={draft.paymentContact || ''} onChange={(event) => change('paymentContact', event.target.value)} /></label></div></section>
      <section className="invoice-card"><h3>Account Details</h3><div className="invoice-form-grid">{[['accountName', 'Account Name'], ['bankName', 'Bank Name'], ['branchName', 'Branch Name'], ['accountNumber', 'Account Number'], ['iban', 'IBAN No.']].map(([key, label]) => <label key={key}><span className="invoice-field-caption">{label}</span><input value={draft.account?.[key] || ''} onChange={(event) => changeAccount(key, event.target.value)} /></label>)}</div><label>Payment Instructions<textarea maxLength={2000} value={draft.paymentInstructions||''} onChange={event=>change('paymentInstructions',event.target.value)}/></label><p>Applying the saved MAK profile replaces the seller and payment details in this draft. Save the draft to keep these changes.</p></section>
    </div><aside className="invoice-editor-side"><section className="invoice-card invoice-summary-card"><h3>Invoice Totals</h3><p>{draft.sources.length} linked {draft.sources.length === 1 ? 'record' : 'records'} · {draft.lines.length} line {draft.lines.length === 1 ? 'item' : 'items'}</p><div><span>Total Amount</span><strong>{sar(totals.total)}</strong></div><div><span>Total Taxable Amount (Excluding VAT)</span><strong>{sar(totals.subtotal)}</strong></div><div><span>Total VAT</span><strong>{sar(totals.tax)}</strong></div><div className="invoice-summary-grand"><span>Total Amount Due</span><strong>{sar(totals.totalAmountDue)}</strong></div><div><span>Payments already recorded</span><strong>{sar(totals.paid)}</strong></div><div><span>Balance Due</span><strong>{sar(totals.balance)}</strong></div><p className="invoice-help">Total Amount Due is the invoice total before payments; Balance Due reflects payments and refunds.</p></section><section className="invoice-card invoice-editor-tax"><h3>Tax Summary</h3><div className="invoice-tax-list">{invoiceTaxSummary(draft).map((row) => <div key={row.rate}><span>{row.rate}% VAT</span><span>{sar(row.taxable)} taxable</span><strong>{sar(row.tax)}</strong></div>)}</div><div className="invoice-tax-total"><span>Total Taxable Amount</span><strong>{sar(totals.subtotal)}</strong></div><div className="invoice-tax-total"><span>Total Tax Amount</span><strong>{sar(totals.tax)}</strong></div></section></aside></div>
    {error && <p className="booking-error" role="alert">{error}</p>}
    {reviewing && <div className="invoice-review" role="status"><strong>Ready to issue?</strong><p>{draft.billTo.name} will be billed {sar(totals.total)} across {draft.lines.length} line items, due {initializeInvoiceSchedule(draft).dueDate}. Once issued, these invoice details will be locked.</p><button type="button" className="booking-primary invoice-accent-button" data-permission={`invoices.${initial.id?'edit':'create'}&invoices.issue`} onClick={() => save(true)} disabled={saving}><ActionIcon name="check" size={15} /> Confirm Issue</button></div>}
    <div className="invoice-sticky-actions"><button type="button" className="booking-secondary" onClick={onCancel}>Cancel</button><button type="button" className="booking-secondary" onClick={() => save(false)} disabled={saving}><ActionIcon name="edit" size={15} /> Save Draft</button><button type="button" className="booking-primary invoice-accent-button" data-permission={`invoices.${initial.id?'edit':'create'}&invoices.issue`} onClick={() => save(true)} disabled={saving}><ActionIcon name="check" size={15} /> {reviewing ? 'Confirm Issue' : 'Review & Issue'}</button></div>
  </div>
}

function PaymentDialog({ invoice, onSave, onClose }) {
  const [kind, setKind] = useState(() => invoiceTotals(invoice).refundDue > 0 ? 'Refund' : 'Payment')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(dayKey(new Date()))
  const [method, setMethod] = useState('Bank transfer')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const totals = invoiceTotals(invoice)
  const max = kind === 'Refund' ? totals.refundDue : totals.balance
  useRentalDialog(true, onClose)
  const submit = async (event) => {
    event.preventDefault()
    if (saving) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || value > max || !date) { setError(`Enter a valid date and amount up to ${sar(max)}.`); return }
    setSaving(true)
    try { await onSave({ kind, amount: roundMoney(value), date, method, reference: reference.trim() }) }
    catch (cause) { setError(cause.message) }
    finally { setSaving(false) }
  }
  return <div className="booking-overlay"><div className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-payment-title"><div className="booking-dialog-heading"><h2 id="invoice-payment-title">Record {kind}</h2><button type="button" aria-label="Close" onClick={onClose}>×</button></div><form data-permission-scope={kind==='Refund'?'payments.refund':'invoices.edit'} className="booking-form" onSubmit={submit}><p className="booking-dialog-note">{invoice.invoiceNumber} · balance {sar(totals.balance)} · received {sar(totals.paid)} · refund due {sar(totals.refundDue)}</p><p className="booking-dialog-note">Refunds are limited to customer credit. Create a credit note to reduce the invoice before refunding.</p><div className="booking-form-grid"><label>Transaction Type<select value={kind} onChange={(event) => { setKind(event.target.value); setAmount(''); setError('') }}><option>Payment</option><option>Refund</option></select></label><label>Amount (SAR)<input required type="number" min="0.01" max={max} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Method<select value={method} onChange={(event) => setMethod(event.target.value)}><option>Bank transfer</option><option>Card</option><option>Cash</option><option>Other</option></select></label><label className="booking-wide-field">Reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Transaction or receipt reference" /></label></div>{error && <p className="booking-error" role="alert">{error}</p>}<div className="booking-dialog-actions"><button type="button" className="booking-secondary" onClick={onClose}>Cancel</button><button type="submit" className="booking-primary" disabled={saving || max <= 0}><ActionIcon name="wallet" size={16} /> Record {kind}</button></div></form></div></div>
}

function InvoiceDetail({ invoice, onBack, onEdit, onIssue, onPayment, onCredit, onDiscard, onOpenSource }) {
  const [showPayment, setShowPayment] = useState(false)
  const [showCredit,setShowCredit]=useState(false)
  const [error, setError] = useState('')
  const totals = invoiceTotals(invoice)
  const status = invoicePaymentStatus(invoice)
return <div className="invoice-page"><div className="invoice-page-actions"><div><button type="button" className="booking-back" onClick={onBack}><ActionIcon name="back" size={15} /> Back to Invoices</button><h2>{invoice.invoiceNumber || `Draft #${invoice.id}`}</h2><p>{invoice.kind} invoice · {invoice.sources.map((source) => source.reference).join(' · ')}</p></div><div className="invoice-action-buttons"><span className={`invoice-pill tone-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>{invoice.status === 'Draft' && <button type="button" className="booking-secondary" onClick={onEdit}><ActionIcon name="edit" size={15} /> Edit Draft</button>}{invoice.status === 'Draft' && <button type="button" className="booking-secondary" onClick={onDiscard}>Discard Draft</button>}{invoice.status === 'Draft' && <button type="button" className="booking-primary" onClick={() => { const message = validateInvoice(invoice, true); if (message) setError(message); else onIssue(invoice) }}><ActionIcon name="check" size={15} /> Issue Invoice</button>}{invoice.status === 'Issued' && totals.credited < totals.total && <button type="button" className="booking-secondary" onClick={()=>setShowCredit(true)}>Create Credit Note</button>}{invoice.status === 'Issued' && <button type="button" className="booking-secondary" onClick={() => setShowPayment(true)}><ActionIcon name="wallet" size={15} /> Record Payment / Refund</button>}<button type="button" className="booking-secondary" onClick={async () => { try { await downloadInvoiceDocument(invoice) } catch (failure) { setError(failure.message) } }}><ActionIcon name="download" size={15} /> Download</button></div></div>{error && <p className="booking-error" role="alert">{error}</p>}
    <EmailDeliveryPanel kind="Invoice" recordId={invoice.id} canSend={invoice.status === 'Issued'} recipient={invoice.billTo.email} />
    <InvoiceDocument invoice={invoice} />
    <div className="invoice-detail-grid"><section className="invoice-card"><h3>Linked Records</h3>{invoice.sources.map((source) => <button className="invoice-source-link" type="button" key={`${source.kind}-${source.id}`} onClick={() => onOpenSource(source)}><strong>{source.reference}</strong><span>{source.kind} · completed {source.serviceDate}</span><span>Open record →</span></button>)}</section><section className="invoice-card"><h3>Payments</h3><div className="invoice-payment-list">{invoice.payments.length ? invoice.payments.map((payment) => <div key={payment.id}><span>{payment.date} · {payment.method}<small>{payment.reference || payment.kind}</small></span><strong className={payment.kind === 'Refund' ? 'refund' : ''}>{payment.kind === 'Refund' ? '−' : '+'}{sar(payment.amount)}</strong></div>) : <p>No payments recorded.</p>}</div><div className="invoice-payment-balance">Remaining balance <strong>{sar(totals.balance)}</strong></div></section></div>
    {invoice.status==='Issued'&&<section className="invoice-card"><h3>Credit Notes</h3><p>Original invoice: {sar(totals.total)} · Credited: {sar(totals.credited)} · Adjusted: {sar(totals.adjusted)} · Refund due: {sar(totals.refundDue)}</p>{totals.refundDue>0&&<p role="status">Return {sar(totals.refundDue)} using Record Payment / Refund. This will settle the customer credit without reopening the invoice balance.</p>}{!(invoice.creditNotes||[]).length&&<p>No credit notes issued. Create a credit note before recording a customer refund.</p>}{(invoice.creditNotes||[]).map(note=><div className="invoice-card" key={note.id}><strong>{note.number} · {sar(note.total)}</strong><p>{dayKey(note.issuedAt)} KSA · {note.reason}</p><p>Net credit {sar(note.net)} · VAT credit {sar(note.tax)}</p><button type="button" className="booking-secondary" onClick={async()=>{try{await downloadCreditNote(invoice.id,note)}catch(failure){setError(failure.message)}}}>Download {note.number}</button></div>)}</section>}
    {showCredit&&<CreditNoteDialog invoice={invoice} onClose={()=>setShowCredit(false)} onConfirm={async(record,credit)=>{await onCredit(record,credit);setShowCredit(false)}}/>}
    <p className="invoice-preview-note">Amounts are shown in SAR. Use Download to print or share a copy.</p>
    {showPayment && <PaymentDialog invoice={invoice} onSave={async (payment) => { await onPayment(invoice, payment); setShowPayment(false) }} onClose={() => setShowPayment(false)} />}
  </div>
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100

export default function InvoicePage({ route, invoices, setInvoices, bookings, setBookings, trips, setTrips, companies, onOpen, onEdit, onBack, onBillings, onOpenSource }) {
  const [actionError, setActionError] = useState('')
  const [discarding, setDiscarding] = useState(null)
  const [showBillingProfile,setShowBillingProfile]=useState(false)
  const [billingProfile,setBillingProfile]=useState(null)
  const [profileError,setProfileError]=useState('')
  useEffect(()=>{let active=true;getBillingProfile().then(profile=>{if(active)setBillingProfile(profile)}).catch(failure=>{if(active)setProfileError(failure.message)});return()=>{active=false}},[])
  const stored = invoices.find((invoice) => invoice.id === route.id)
  const sourceBooking=stored?.kind==='Individual'?bookings.find(record=>record.id===stored.sources[0]?.id):null
  const current=stored&&stored.status==='Draft'&&sourceBooking&&needsBookingChargeReview(sourceBooking)?{...stored,bookingChargeReview:{...bookingChargeReview(sourceBooking),...stored.bookingChargeReview,required:true,bookingTotal:Number(sourceBooking.totalAmount)}}:stored
  let seed = null
  let seedError = ''
  if (route.mode === 'new' && billingProfile && route.seedKind && route.seedIds?.length) {
    try {
      for (const id of route.seedIds) if (sourceIsBilled(invoices, route.seedKind, id)) throw new Error('One or more selected records already belong to an invoice.')
      seed = invoiceDraftFromSources(route.seedIds.map((id) => ({ kind: route.seedKind, id })), bookings, trips, companies, billingProfile)
    } catch (error) { seedError = error.message }
  }
  const save = async (draft, issue) => {
    const saved = await saveInvoice(draft, issue)
    setInvoices((existing) => existing.some((item) => item.id === saved.id) ? existing.map((item) => item.id === saved.id ? saved : item) : [saved, ...existing])
    applyBookingSummary(saved)
    onOpen(saved.id)
  }
  const issue = async (invoice) => {
    try {
      const saved = await issueInvoice(invoice.id)
      setInvoices((existing) => existing.map((item) => item.id === saved.id ? saved : item))
      setActionError('')
    } catch (cause) { setActionError(cause.message) }
  }
  const addPayment = async (invoice, payment) => {
    const saved = await invoicePayment(invoice.id, payment)
    setInvoices((existing) => existing.map((item) => item.id === saved.id ? saved : item))
    applyBookingSummary(saved)
  }
  const addCredit = async (invoice, credit) => {
    const saved = await issueCreditNote(invoice.id,credit)
    setInvoices((existing)=>existing.map((item)=>item.id===saved.id?saved:item))
    applyBookingSummary(saved)
  }
  const discard = async (invoice) => {
    await discardInvoice(invoice.id)
    setInvoices((existing) => existing.filter((item) => item.id !== invoice.id))
    setBookings((existing) => releaseDraftRecords(existing, invoice))
    setTrips((existing) => releaseDraftRecords(existing, invoice))
    setDiscarding(null)
    setActionError('')
    onBillings()
  }
  const applyBookingSummary = (saved) => {
    if (saved.bookingPaymentSummary) setBookings((existing) => existing.map((booking) =>
      booking.id === saved.bookingPaymentSummary.id ? { ...booking, ...saved.bookingPaymentSummary } : booking))
  }
  if (route.mode === 'new' && !billingProfile) return <section className="invoice-card"><h2>{profileError?'Unable to load MAK billing profile':'Loading MAK billing profile…'}</h2>{profileError&&<><p role="alert">{profileError}</p><button type="button" className="booking-secondary" onClick={()=>{setProfileError('');getBillingProfile().then(setBillingProfile).catch(error=>setProfileError(error.message))}}>Retry Loading Profile</button></>}</section>
  if (route.mode === 'new' && !seed) return <section className="invoice-card invoice-empty"><h2>Select completed work to invoice</h2><p>{seedError || 'Choose a completed booking or one or more corporate trips in the Billings workbench.'}</p><button type="button" className="booking-primary" onClick={onBillings}><ActionIcon name="invoices" size={16} /> Open Billings Workbench</button></section>
  if (route.mode === 'new' || route.mode === 'edit') return route.mode === 'edit' && (!current || current.status !== 'Draft') ? <section className="invoice-card invoice-empty"><h2>Draft unavailable</h2><button type="button" className="booking-secondary" onClick={onBack}><ActionIcon name="back" size={16} /> Back to Invoices</button></section> : <InvoiceEditor key={route.mode === 'new' ? route.seedIds.join('-') : current.id} initial={route.mode === 'new' ? seed : current} billingProfile={billingProfile} onSave={save} onCancel={onBack} />
  const content = route.mode === 'detail' ? current ? <>{actionError && <p className="booking-error" role="alert">{actionError}</p>}<InvoiceDetail invoice={current} onBack={onBack} onEdit={() => onEdit(current.id)} onIssue={issue} onPayment={addPayment} onCredit={addCredit} onDiscard={() => setDiscarding(current)} onOpenSource={onOpenSource} /></> : <section className="invoice-card invoice-empty"><h2>Invoice not found</h2><button type="button" className="booking-secondary" onClick={onBack}><ActionIcon name="back" size={16} /> Back to Invoices</button></section>
    : <InvoiceList invoices={invoices} onBillings={onBillings} onOpen={onOpen} onEdit={onEdit} onDiscard={setDiscarding} onBillingProfile={()=>setShowBillingProfile(true)} />
  return <>{content}{showBillingProfile&&<BillingProfileDialog onSaved={setBillingProfile} onClose={()=>setShowBillingProfile(false)}/>} {discarding && <DiscardDraftDialog invoice={discarding} onConfirm={discard} onClose={() => setDiscarding(null)} />}</>
}
