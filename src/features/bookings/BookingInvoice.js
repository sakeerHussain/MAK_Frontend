import { balanceDue, formatDateTime, netPaid, sar } from './BookingData.js'

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

export function downloadBookingInvoice(booking, vehicle, driverName) {
  const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : `${booking.requestedType || 'Vehicle'} requested · awaiting assignment`
  const rows = [
    ['Booking reference', booking.bookingId],
    ['Booking type', booking.bookingType || 'Advance'],
    ['Customer', booking.customerName],
    ['Phone', booking.customerPhone],
    ['Email', booking.customerEmail || '—'],
    ['Vehicle', vehicleName],
    ['Driver', driverName],
    ['Pickup', formatDateTime(booking.pickupAt)],
    ['Pickup location', booking.pickupLocation || '—'],
    ['Return', formatDateTime(booking.returnAt)],
    ['Destination', booking.destination || '—'],
    ['Unit price', booking.unitPrice ? `${sar(booking.unitPrice)} / ${(booking.rateUnit || 'Day').toLowerCase()}` : '—'],
  ].map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${escapeHtml(booking.bookingId)}</title><style>body{max-width:760px;margin:48px auto;padding:0 24px;font:15px/1.5 Arial,sans-serif;color:#303849}header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #7b70ef;padding-bottom:22px}h1{margin:0;font-size:30px}.muted{color:#7d8999}.tag{color:#7b70ef;font-weight:700}table{border-collapse:collapse;width:100%;margin:30px 0}th,td{padding:11px;border-bottom:1px solid #e7ebf2;text-align:left}th{width:180px;color:#718094}.totals{margin-left:auto;width:min(300px,100%)}.totals div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e7ebf2}.totals .grand{font-size:19px;font-weight:bold;color:#303849}footer{margin-top:55px;color:#8b96a5;font-size:12px}@media print{body{margin:24px auto}}</style></head><body><header><div><div class="tag">RENTAL ADMIN</div><h1>Invoice</h1><div class="muted">${escapeHtml(booking.bookingId)}</div></div><div class="muted">Issued ${escapeHtml(new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date()))}<br>Currency: SAR</div></header><table>${rows}</table><div class="totals"><div class="grand"><span>Total</span><span>${escapeHtml(sar(booking.totalAmount))}</span></div><div><span>Net received</span><span>${escapeHtml(sar(netPaid(booking)))}</span></div><div><span>Balance due</span><span>${escapeHtml(sar(balanceDue(booking)))}</span></div></div><footer>Generated from the Rental Admin frontend preview. This is a sample invoice and is not a tax invoice.</footer></body></html>`
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${booking.bookingId}-invoice.html`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
