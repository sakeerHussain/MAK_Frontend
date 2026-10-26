import { invoiceTotals } from '../invoices/InvoiceData.js'

export const DASHBOARD_COLORS = ['#008dca', '#55b4ec', '#a7d9f7', '#c3ceda']

export function reportingDay(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value)
  const part = (type) => parts.find((entry) => entry.type === type).value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function paymentFollowups(invoices, today = reportingDay()) {
  return invoices.filter((invoice) => invoice.status === 'Issued')
    .map((invoice) => ({ invoice, balance: invoiceTotals(invoice).balance,
      overdue: Boolean(invoice.dueDate && invoice.dueDate < today),
      dueToday: invoice.dueDate === today }))
    .filter((item) => item.balance > 0)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue)
      || (a.invoice.dueDate || '9999').localeCompare(b.invoice.dueDate || '9999')
      || String(a.invoice.id).localeCompare(String(b.invoice.id), undefined, { numeric: true }))
}

export function operationVehicle(item, bookings, trips, vehicles) {
  const record = (item.kind === 'Corporate' ? trips : bookings).find((entry) => entry.id === item.id)
  const vehicle = record && vehicles.find((entry) => entry.id === record.vehicleId)
  return vehicle ? { name: `${vehicle.make} ${vehicle.model}`, detail: vehicle.registration }
    : { name: item.vehicleAssigned ? 'Vehicle assigned' : record?.requestedType ? `${record.requestedType} requested` : 'Awaiting assignment', detail: '' }
}

export function scheduleLabel(value) {
  if (!value) return 'Not scheduled'
  const [date, time = ''] = value.replace(' ', 'T').split('T')
  const parsed = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return `${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(parsed)} · ${time.slice(0, 5)}`
}
