// Manual bookings may predate priced charge lines. Never infer an extra charge or VAT rate from a residual.
const present=value=>value!==undefined&&value!==null&&String(value).trim()!==''
const round=value=>Math.round((Number(value)+Number.EPSILON)*100)/100
export const needsBookingChargeReview=record=>!record.quoteSnapshot?.lines?.length
export function bookingChargeLines(record){
  const reference=record.bookingId
  const tax=present(record.taxPercent)?record.taxPercent:''
  if(Array.isArray(record.chargeLines)&&record.chargeLines.length)return record.chargeLines.map(line=>({
    id:crypto.randomUUID(),sourceRef:reference,description:`${line.description} · ${reference}`,
    quantity:line.quantity,unit:line.unit,unitPrice:line.unitPrice,discountPercent:line.discountPercent??0,
    taxPercent:present(line.taxPercent)?line.taxPercent:tax,
  }))
  const priced=present(record.unitPrice)&&Number.isFinite(Number(record.unitPrice))&&Number(record.unitPrice)>0
  const quantity=priced&&Number(record.quantity)>0?Number(record.quantity):1
  // A total-only legacy record can seed a rental amount, but still requires explicit review of every charge and VAT.
  const unitPrice=priced?Number(record.unitPrice):round(Number(record.totalAmount)/(1+Number(tax||0)/100))
  return [{id:crypto.randomUUID(),sourceRef:reference,description:`Vehicle rental · ${reference}`,
    quantity,unit:priced?record.rateUnit||'Trip':'Trip',unitPrice,discountPercent:0,taxPercent:tax}]
}
export const bookingChargeReview=record=>({required:true,confirmed:false,bookingTotal:Number(record.totalAmount),
  recordedExtras:[Number(record.extraKm)>0?`${record.extraKm} extra km`:'',Number(record.overtimeHours)>0?`${record.overtimeHours} overtime hours`:'',record.extraDriver?'Additional driver':''].filter(Boolean).join(' · ')})
export function chargeReviewError(invoice){
  if(!invoice.bookingChargeReview?.required)return ''
  for(const line of invoice.lines){
    if(!present(line.taxPercent)||!Number.isFinite(Number(line.taxPercent)))return 'Enter the tax rate for every rental and extra charge, including 0% where confirmed.'
  }
  const total=invoice.lines.reduce((sum,line)=>{
    const gross=round(Number(line.quantity)*Number(line.unitPrice));const net=round(gross-round(gross*Number(line.discountPercent||0)/100))
    return sum+net+round(net*Number(line.taxPercent)/100)
  },0)
  if(!Number.isFinite(total)||Math.abs(round(total)-Number(invoice.bookingChargeReview.bookingTotal))>0.001)return 'Reconcile rental, extras and tax with the saved booking total before confirming the breakdown.'
  if(!invoice.bookingChargeReview.confirmed)return 'Confirm the rental, extras and tax breakdown before issuing this invoice.'
  return ''
}
