import { balanceDue, formatDateTime, netPaid, paymentStatus, sar } from './BookingData.js'
import { detailDocument, downloadHtml, rowsToCsv } from '../../shared/lib/recordExport.js'

const vehicleLabel = (booking, vehicles) => {
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId)
  return vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : `${booking.requestedType || 'Vehicle'} requested · unassigned`
}
const driverLabel = (booking, drivers) => booking.driverMode === 'Self-drive' ? 'Self-drive' : drivers.find((item) => item.id === booking.driverId)?.name || 'Unassigned'

export function bookingDetailsHtml(booking, vehicles, drivers) {
  return detailDocument('Booking Details', booking.bookingId, [
    { title: 'Customer & Booking', rows: [['Booking type', booking.bookingType], ['Booking status', booking.status], ['Customer', booking.customerName], ['Phone', booking.customerPhone], ['Email', booking.customerEmail || '—'], ['Booked on', formatDateTime(booking.bookedAt)]] },
    { title: 'Trip & Assignment', rows: [['Assignment alert', booking.assignmentAlertAt ? formatDateTime(booking.assignmentAlertAt) : 'Standard reminder schedule'], ['Pickup', formatDateTime(booking.pickupAt)], ['Pickup location', booking.pickupLocation || '—'], ['Return', formatDateTime(booking.returnAt)], ['Destination', booking.destination || '—'], ['Vehicle', vehicleLabel(booking, vehicles)], ['Driver', driverLabel(booking, drivers)]] },
    { title: 'Amount & Payment', rows: [['Unit price', booking.unitPrice ? `${sar(booking.unitPrice)} / ${(booking.rateUnit || 'Day').toLowerCase()}` : '—'], ['Total amount', sar(booking.totalAmount)], ['Received', sar(booking.receivedAmount)], ['Refunded', sar(booking.refundedAmount)], ['Net paid', sar(netPaid(booking))], ['Balance due', sar(balanceDue(booking))], ['Payment status', paymentStatus(booking)]] },
    { title: 'Notes', rows: [['Internal notes', booking.notes || '—']] },
  ])
}
export const downloadBookingDetails = (booking, vehicles, drivers) => downloadHtml(`${booking.bookingId}-booking-details.html`, bookingDetailsHtml(booking, vehicles, drivers))

export function bookingListCsv(bookings, vehicles, drivers) {
  const headers = ['Booking ID','Type','Customer','Phone','Email','Assignment Alert (KSA)','Pickup','Pickup Location','Return','Destination','Vehicle','Driver','Unit Price (SAR)','Billing Unit','Total (SAR)','Net Paid (SAR)','Balance Due (SAR)','Booking Status','Payment Status','Booked On']
  const rows = bookings.map((booking) => [booking.bookingId, booking.bookingType, booking.customerName, booking.customerPhone, booking.customerEmail, booking.assignmentAlertAt ? formatDateTime(booking.assignmentAlertAt) : 'Standard reminder schedule', formatDateTime(booking.pickupAt), booking.pickupLocation, formatDateTime(booking.returnAt), booking.destination, vehicleLabel(booking, vehicles), driverLabel(booking, drivers), booking.unitPrice, booking.rateUnit, booking.totalAmount, netPaid(booking), balanceDue(booking), booking.status, paymentStatus(booking), formatDateTime(booking.bookedAt)])
  return rowsToCsv(headers, rows)
}
