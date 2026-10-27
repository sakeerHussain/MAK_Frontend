import { formatDateTime, sar } from '../bookings/BookingData.js'
import { detailDocument, downloadHtml, rowsToCsv } from '../../shared/lib/recordExport.js'
import { billableWaitingMinutes, tripPassengers, tripStops, waitingMinutes } from './CorporateData.js'

const vehicleLabel = (trip, vehicles) => {
  const vehicle = vehicles.find((item) => item.id === trip.vehicleId)
  return vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : `${trip.requestedType} requested · unassigned`
}
const driverLabel = (trip, drivers) => trip.serviceMode === 'Self-drive' ? 'Self-drive' : drivers.find((item) => item.id === trip.driverId)?.name || 'Unassigned'
const passengerText = (trip) => tripPassengers(trip).map((passenger, index) => `${index + 1}. ${passenger.name} — ${passenger.phone}`).join('\n')
const itineraryText = (trip) => tripStops(trip).map((stop, index, stops) => `${index === 0 ? 'Pickup' : index === stops.length - 1 ? 'Drop-off' : `Stop ${index}`}: ${stop.location} (${Number(stop.waitingMinutes || 0)} min waiting)`).join('\n')

export function corporateTripDetailsHtml(trip, vehicles, drivers) {
  return detailDocument('Corporate Trip Details', trip.tripId, [
    { title: 'Corporate Account', rows: [['Company', trip.companyName], ['Trip type', trip.bookingType], ['Trip status', trip.status], ['Primary contact', trip.contactName], ['Phone', trip.contactPhone], ['Email', trip.contactEmail], ['Booked on', formatDateTime(trip.bookedAt)]] },
    { title: 'Project & Passengers', rows: [['Project manager', trip.projectManager || '—'], ['Project code', trip.projectCode || '—'], ['Project remarks', trip.projectRemarks || '—'], ['Expected passengers', trip.passengerCount], ['Named passengers', passengerText(trip)]] },
    { title: 'Itinerary & Assignment', rows: [['Assignment alert', trip.assignmentAlertAt ? formatDateTime(trip.assignmentAlertAt) : 'Standard reminder schedule'], ['Pickup', formatDateTime(trip.pickupAt)], ['Return', formatDateTime(trip.returnAt)], ['Locations', itineraryText(trip)], ['Vehicle', vehicleLabel(trip, vehicles)], ['Driver', driverLabel(trip, drivers)]] },
    { title: 'Charges & Billing', rows: [['Unit price', `${sar(trip.unitPrice)} / ${(trip.rateUnit || 'Day').toLowerCase()}`], ['Quantity', trip.quantity || 1], ['Planned waiting', `${waitingMinutes(tripStops(trip))} min`], ['Included waiting', `${trip.includedWaitingMinutes || 0} min`], ['Billed waiting', `${billableWaitingMinutes(tripStops(trip), trip.includedWaitingMinutes, trip.waitingBillingIncrementMinutes)} min`], ['Billing increment', `${trip.waitingBillingIncrementMinutes || 1} min`], ['Waiting rate', `${sar(trip.waitingRatePerHour || 0)} / hour`], ['Subtotal', sar(trip.subtotal ?? trip.totalAmount)], ['Tax', `${trip.taxPercent || 0}% · ${sar(trip.taxAmount || 0)}`], ['Total', sar(trip.totalAmount)], ['Billing status', trip.billingStatus]] },
    { title: 'Notes', rows: [['Internal notes', trip.notes || '—']] },
  ])
}
export const downloadCorporateTripDetails = (trip, vehicles, drivers) => downloadHtml(`${trip.tripId}-corporate-trip-details.html`, corporateTripDetailsHtml(trip, vehicles, drivers))

export function corporateTripListCsv(trips, vehicles, drivers) {
  const headers = ['Trip ID','Type','Company','Project Code','Project Manager','Contact','Phone','Email','Passengers Expected','Passenger Roster','Assignment Alert (KSA)','Pickup','Return','Itinerary','Vehicle','Driver','Unit Price (SAR)','Billing Unit','Quantity','Waiting Minutes','Included Waiting Minutes','Billed Waiting Minutes','Billing Increment Minutes','Waiting Rate (SAR/hour)','Subtotal (SAR)','Tax Percent','Tax Amount (SAR)','Total (SAR)','Trip Status','Billing Status','Booked On']
  const rows = trips.map((trip) => [trip.tripId, trip.bookingType, trip.companyName, trip.projectCode, trip.projectManager, trip.contactName, trip.contactPhone, trip.contactEmail, trip.passengerCount, passengerText(trip), trip.assignmentAlertAt ? formatDateTime(trip.assignmentAlertAt) : 'Standard reminder schedule', formatDateTime(trip.pickupAt), formatDateTime(trip.returnAt), itineraryText(trip), vehicleLabel(trip, vehicles), driverLabel(trip, drivers), trip.unitPrice, trip.rateUnit, trip.quantity || 1, waitingMinutes(tripStops(trip)), trip.includedWaitingMinutes || 0, billableWaitingMinutes(tripStops(trip), trip.includedWaitingMinutes, trip.waitingBillingIncrementMinutes), trip.waitingBillingIncrementMinutes || 1, trip.waitingRatePerHour || 0, trip.subtotal ?? trip.totalAmount, trip.taxPercent || 0, trip.taxAmount || 0, trip.totalAmount, trip.status, trip.billingStatus, formatDateTime(trip.bookedAt)])
  return rowsToCsv(headers, rows)
}
