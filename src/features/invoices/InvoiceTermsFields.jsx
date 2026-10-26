import PaymentTermsControl from './PaymentTermsControl.jsx'
import { initializeInvoiceSchedule, paymentTermDays, normalizePaymentTerms, termsDueDate } from './PaymentTerms.js'

export default function InvoiceTermsFields({ draft, onChange }) {
  const schedule=initializeInvoiceSchedule(draft)
  const days=paymentTermDays(schedule.paymentTerms)
  const setTerms=value=>{
    const mode=paymentTermDays(value)===null?'Manual':'Terms'
    onChange({paymentTerms:normalizePaymentTerms(value),dueDateMode:mode,dueDate:mode==='Terms'?termsDueDate(value):draft.dueDate||''})
  }
  return <section style={{gridColumn:'1 / -1'}}><div className="invoice-form-grid">
    <PaymentTermsControl value={draft.paymentTerms} onChange={setTerms}/>
    <label>Due-date calculation<select value={schedule.dueDateMode} onChange={event=>onChange({dueDateMode:event.target.value,dueDate:event.target.value==='Terms'?termsDueDate(schedule.paymentTerms):draft.dueDate||'',dueDateOverrideReason:event.target.value==='Terms'?'':draft.dueDateOverrideReason||''})}><option value="Terms" disabled={days===null}>From payment terms</option><option value="Manual">Manual override</option></select></label>
    <label>Due Date<input type="date" readOnly={schedule.dueDateMode==='Terms'} value={schedule.dueDateMode==='Terms'?termsDueDate(schedule.paymentTerms):draft.dueDate||''} onInput={event=>onChange({dueDate:event.currentTarget.value})} onChange={event=>onChange({dueDate:event.target.value})}/></label>
    {schedule.dueDateMode==='Manual'&&<label>Manual due-date reason<input maxLength={500} value={draft.dueDateOverrideReason||''} onChange={event=>onChange({dueDateOverrideReason:event.target.value})} placeholder="Required before issuing"/></label>}
  </div><p className="invoice-help">{schedule.dueDateMode==='Terms'?`${days===0?'Due on receipt':`Due ${days} calendar days after issue`}. The due date is recalculated on the actual KSA issue date. It is locked once issued.`:days===null?'These custom terms cannot be calculated automatically. Set a due date and explain the agreement before issuing.':'Manual override: the selected date is kept when issuing. A reason is required.'}</p></section>
}
