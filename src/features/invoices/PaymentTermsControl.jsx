import { useState } from 'react'
import { normalizePaymentTerms, PAYMENT_TERM_OPTIONS } from './PaymentTerms.js'

export default function PaymentTermsControl({ value, onChange, allowEmpty=false }) {
  const normalized=normalizePaymentTerms(value)
  const [custom,setCustom]=useState(()=>Boolean(value)&&!PAYMENT_TERM_OPTIONS.includes(normalized))
  const isCustom=custom||Boolean(value)&&!PAYMENT_TERM_OPTIONS.includes(normalized)
  return <div><label>Payment Terms<select value={isCustom?'Custom':normalized} onChange={event=>{const next=event.target.value;setCustom(next==='Custom');onChange(next==='Custom'?'':next)}}>{allowEmpty&&<option value="">Not specified</option>}{PAYMENT_TERM_OPTIONS.map(option=><option key={option}>{option}</option>)}<option>Custom</option></select></label>{isCustom&&<label>Custom Payment Terms<input maxLength={100} value={value} onChange={event=>onChange(event.target.value)} placeholder="e.g. Net 120 or contract terms" /></label>}</div>
}
