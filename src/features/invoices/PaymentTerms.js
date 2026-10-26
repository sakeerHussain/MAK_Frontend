import { rentalDay, shiftRentalDays } from '../../shared/lib/rentalTime.js'

export const PAYMENT_TERM_OPTIONS = ['Due on receipt','Net 7','Net 15','Net 30','Net 45','Net 60','Net 90']
export function paymentTermDays(value) {
  const text=String(value||'').trim().replace(/\s+/g,' ').toLowerCase()
  if(['due on receipt','on receipt','immediate'].includes(text))return 0
  const match=text.match(/^(?:net\s*)?(\d{1,3})(?:\s*days?)?$/)
  if(!match)return null
  const days=Number(match[1]);return days<=365?days:null
}
export const normalizePaymentTerms = value => {
  const days=paymentTermDays(value)
  return days===null?String(value||'').trim():days===0?'Due on receipt':`Net ${days}`
}
export function termsDueDate(value, now=new Date()) {
  const days=paymentTermDays(value)
  return days===null?'':rentalDay(shiftRentalDays(now,days))
}
export function initializeInvoiceSchedule(invoice,now=new Date()) {
  const raw=String(invoice.paymentTerms||'').trim()
  const paymentTerms=normalizePaymentTerms(raw||(invoice.kind==='Corporate'?'Net 30':'Net 7'))
  const dueDateMode=invoice.dueDateMode||(raw&&paymentTermDays(raw)!==null?'Terms':invoice.id?'Manual':paymentTermDays(paymentTerms)!==null?'Terms':'Manual')
  return {paymentTerms,dueDateMode,dueDate:dueDateMode==='Terms'?termsDueDate(paymentTerms,now):invoice.dueDate||'',dueDateOverrideReason:invoice.dueDateOverrideReason||''}
}
export function scheduleError(invoice,now=new Date()) {
  const {dueDateMode,paymentTerms}=initializeInvoiceSchedule(invoice,now)
  if(dueDateMode==='Terms')return paymentTermDays(paymentTerms)===null?'Choose recognized Net terms or use a manual due date.':''
  if(dueDateMode!=='Manual')return 'Choose a valid due-date calculation mode.'
  if(!invoice.dueDate||invoice.dueDate<rentalDay(now))return 'Select a manual due date of today or later.'
  const reason=String(invoice.dueDateOverrideReason||'').trim()
  if(reason.length<3||reason.length>500)return 'Enter a reason of 3 to 500 characters for the manual due date.'
  return ''
}
