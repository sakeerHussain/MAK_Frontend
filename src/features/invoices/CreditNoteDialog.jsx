import { useCallback, useState } from 'react'
import { creditableLines, invoiceTotals, roundAmount } from './InvoiceData.js'
import { sar } from '../bookings/BookingData.js'
import useRentalDialog from '../../shared/hooks/useRentalDialog.js'

export default function CreditNoteDialog({ invoice, onConfirm, onClose }) {
  const [reason,setReason]=useState('')
  const [amounts,setAmounts]=useState({})
  const [requestId]=useState(()=>crypto.randomUUID())
  const [review,setReview]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const close=useCallback(()=>{if(!saving)onClose()},[onClose,saving])
  useRentalDialog(true,close)
  const lines=creditableLines(invoice), totals=invoiceTotals(invoice)
  const selected=lines.filter(line=>Number(amounts[line.lineIndex])>0).map(line=>({lineIndex:line.lineIndex,amount:Number(amounts[line.lineIndex])}))
  const credit=roundAmount(selected.reduce((sum,line)=>sum+line.amount,0))
  const submit=async event=>{
    event.preventDefault()
    if(saving)return
    if(reason.trim().length<3 || !selected.length || lines.some(line=>Number(amounts[line.lineIndex]||0)>line.remaining)){setError('Enter a reason and a credit within each remaining line amount.');return}
    if(!review){setReview(true);setError('');return}
    setSaving(true);setError('')
    try{await onConfirm(invoice,{requestId,reason:reason.trim(),lines:selected})}catch(failure){setError(failure.message);setSaving(false)}
  }
  return <div className="booking-overlay"><div className="booking-dialog wide" role="dialog" aria-modal="true" aria-labelledby="credit-note-title" aria-busy={saving}>
    <div className="booking-dialog-heading"><h2 id="credit-note-title">Create Credit Note · {invoice.invoiceNumber}</h2><button type="button" aria-label="Close credit note" disabled={saving} onClick={close}>×</button></div>
    <form data-permission-scope="invoices.credit" className="booking-form" onSubmit={submit}>
      <p>Credit all or part of the original invoice lines. The original invoice remains unchanged. VAT is allocated from the original charges. Refunds are recorded separately.</p>
      <label>Reason for credit<textarea required minLength={3} maxLength={500} value={reason} disabled={saving} onChange={event=>{setReason(event.target.value);setReview(false)}} /></label>
      <p><button type="button" className="booking-secondary" disabled={saving} onClick={()=>{setAmounts(Object.fromEntries(lines.map(line=>[line.lineIndex,line.remaining])));setReview(false)}}>Credit Remaining Invoice</button></p>
      <div className="booking-form-grid">{lines.map(line=><label key={line.lineIndex}>{line.description} · available {sar(line.remaining)}<input aria-label={`Credit line ${line.lineIndex+1} (SAR including VAT)`} type="number" min="0" max={line.remaining} step="0.01" disabled={saving||line.remaining<=0} value={amounts[line.lineIndex]??''} onChange={event=>{setAmounts({...amounts,[line.lineIndex]:event.target.value});setReview(false)}} /></label>)}</div>
      {review&&<div className="finance-notice" role="status"><div><strong>Issue credit note for {sar(credit)}?</strong><p>Adjusted invoice: {sar(totals.adjusted-credit)}. Balance due: {sar(Math.max(0,totals.adjusted-credit-totals.paid))}. Refund due: {sar(Math.max(0,totals.paid-(totals.adjusted-credit)))}.</p><p>Issued credit notes are retained permanently and cannot be edited.</p></div></div>}
      {error&&<p className="booking-error" role="alert">{error}</p>}
      <div className="booking-dialog-actions"><button type="button" className="booking-secondary" disabled={saving} onClick={close}>Cancel</button><button type="submit" className="booking-primary" disabled={saving||credit<=0}>{saving?'Issuing…':review?'Issue Credit Note':'Review Credit Note'}</button></div>
    </form>
  </div></div>
}
