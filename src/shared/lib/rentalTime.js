// Scheduling contract: offset-free rental timestamps are KSA wall time.
export const RENTAL_TIME_ZONE = 'Asia/Riyadh'
export function rentalDate(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (typeof value !== 'string' || !value) return new Date(NaN)
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  return new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}+03:00`)
}
const parts = value => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone:RENTAL_TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(rentalDate(value)).map(p => [p.type,p.value]))
export function rentalDay(value) {
  if (Number.isNaN(rentalDate(value).getTime())) return ''
  const p=parts(value); return `${p.year}-${p.month}-${p.day}`
}
export function rentalDateTime(value) {
  const p=parts(value); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
export const shiftRentalDays = (value, days) => new Date(rentalDate(value).getTime()+days*86400000)
export const formatRentalDateTime = value => !value || Number.isNaN(rentalDate(value).getTime()) ? '—' : `${new Intl.DateTimeFormat('en-GB',{timeZone:RENTAL_TIME_ZONE,day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).format(rentalDate(value))} KSA`
