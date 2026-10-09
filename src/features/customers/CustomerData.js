import { dayKey } from '../bookings/BookingData.js'

export const customerKey = (type, id) => `${type === 'Corporate' ? 'corporate' : 'individual'}:${id}`
export const normalizePlace = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
export const normalizeStops = (value) => String(value || '').split(',').map(normalizePlace).filter(Boolean).join('|')
export const money = (value) => `SAR ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const quoteKinds = ['Fixed route', 'Monthly', 'Extra km', 'Other service']
export const routeCsvHeaders = ['origin', 'via_stops', 'destination', 'vehicle_class', 'fixed_charge_sar']
export const routeTemplateCsv = `${routeCsvHeaders.join(',')}\r\nAl Khobar,,Riyadh,SUV,700\r\nAl Khobar,"Dammam, Jubail",Riyadh,SUV,800\r\n`

function csvCells(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted && char === '"' && text[index + 1] === '"') { cell += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (!quoted && char === ',') { row.push(cell); cell = '' }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  if (quoted) throw new Error('CSV has an unclosed quoted value.')
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((values) => values.some((value) => value.trim()))
}

export const routeKey = (route) => [normalizePlace(route.from), normalizeStops(route.via), normalizePlace(route.to), normalizePlace(route.vehicle)].join('|')

export function previewRouteCsv(text, existingRoutes = []) {
  const rows = csvCells(String(text).replace(/^\uFEFF/, ''))
  if (!rows.length || rows[0].map((value) => value.trim().toLowerCase()).join('|') !== routeCsvHeaders.join('|')) {
    throw new Error(`Expected CSV columns: ${routeCsvHeaders.join(', ')}`)
  }
  const seen = new Set(existingRoutes.map(routeKey))
  return rows.slice(1).map((cells, index) => {
    const [from = '', via = '', to = '', vehicle = '', amount = ''] = cells.map((cell) => cell.trim())
    const route = { id: crypto.randomUUID(), from, via, to, vehicle, amount }
    let error = ''
    if (cells.length !== routeCsvHeaders.length) error = 'Wrong number of columns'
    else if (!from || !to || !vehicle || !Number.isFinite(Number(amount)) || Number(amount) <= 0) error = 'Origin, destination, vehicle/class and positive charge are required'
    else if (seen.has(routeKey(route))) error = 'Duplicate route (in this quote or CSV)'
    else seen.add(routeKey(route))
    return { rowNumber: index + 2, route, error }
  })
}

export function makeDemoCustomers(bookings) {
  const seen = new Set()
  return bookings.filter((booking) => {
    const key = booking.customerPhone || booking.customerEmail
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).map((booking, index) => ({
    id: index + 1, name: booking.customerName, phone: booking.customerPhone,
    email: booking.customerEmail || '', address: '', status: 'Active',
    createdAt: booking.bookedAt || new Date().toISOString(),
  }))
}

export function customerRows(individuals, companies, bookings, trips, quotes) {
  return [
    ...individuals.map((person) => ({ ...person, key: customerKey('Individual', person.id), type: 'Individual', contact: person.name,
      activity: bookings.filter((booking) => booking.customerId === person.id || (!booking.customerId && booking.customerPhone === person.phone)).length })),
    ...companies.map((company) => ({ ...company, key: customerKey('Corporate', company.id), type: 'Corporate',
      phone: company.billingPhone, email: company.billingEmail, contact: company.billingContactName || '—', status: company.status || 'Active',
      activity: trips.filter((trip) => trip.companyId === company.id || (!trip.companyId && normalizePlace(trip.companyName) === normalizePlace(company.name))).length })),
  ].map((row) => ({ ...row, quotes: quotes.filter((quote) => quote.customerKey === row.key) }))
}

export function effectiveQuoteStatus(quote, today = dayKey(new Date())) {
  if (quote.status === 'Rejected' || quote.status === 'Superseded') return quote.status
  if (quote.status === 'Approved') {
    if (quote.effectiveFrom && quote.effectiveFrom > today) return 'Upcoming'
    if (quote.effectiveTo && quote.effectiveTo < today) return 'Expired'
    return 'Active'
  }
  if (quote.offerValidUntil && quote.offerValidUntil < today) return 'Expired'
  return quote.status === 'Shared' ? 'Awaiting approval' : 'Draft'
}

export function activeQuoteFor(quotes, key, at = dayKey(new Date())) {
  const matches = quotes.filter((quote) => quote.customerKey === key && effectiveQuoteStatus(quote, at) === 'Active')
  return matches.length === 1 ? matches[0] : null
}

export function quoteExpiresSoon(quote, at = dayKey(new Date()), days = 30) {
  if (!quote?.effectiveTo || effectiveQuoteStatus(quote, at) !== 'Active') return false
  const deadline = new Date(`${at}T00:00:00`)
  deadline.setDate(deadline.getDate() + days)
  return quote.effectiveTo <= dayKey(deadline)
}

export function coverage(quote) {
  if (!quote) return 'No approved rates'
  const parts = []
  if (quote.routes?.length) parts.push(`${quote.routes.length} route${quote.routes.length === 1 ? '' : 's'}`)
  if (quote.monthly?.length) parts.push(`${quote.monthly.length} monthly`)
  if (quote.extras?.extraKmRate) parts.push('extra km')
  if (quote.services?.length) parts.push(`${quote.services.length} service${quote.services.length === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'No rates'
}

export function emptyQuote(key, version = 1) {
  const today = dayKey(new Date())
  return { id: crypto.randomUUID(), customerKey: key, number: `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, version,
    status: 'Draft', issueDate: today, offerValidUntil: '', effectiveFrom: today, effectiveTo: '', currency: 'SAR',
    taxPercent: '15', paymentTerms: 'Net 30 days', notes: '', approval: null, approvalFileName: '',
    routes: [], monthly: [], services: [], extras: { extraKmRate: '', includedKm: '', overtimeRate: '', standardHours: '', extraDriverRate: '', extraDriverThresholdKm: '' } }
}

export function quoteIssues(quote) {
  const issues = []
  if (!quote.issueDate || !quote.offerValidUntil || !quote.effectiveFrom) issues.push('Set issue, offer-valid-until, and effective-from dates.')
  if (quote.offerValidUntil && quote.issueDate && quote.offerValidUntil < quote.issueDate) issues.push('Offer validity must end on or after issue date.')
  if (quote.effectiveTo && quote.effectiveTo < quote.effectiveFrom) issues.push('Effective end must be after the effective start.')
  if (![...quote.routes || [], ...quote.monthly || [], ...quote.services || []].length) issues.push('Add at least one route, monthly rate, or other service.')
  const routeKeys = new Set()
  for (const route of quote.routes || []) {
    if (!route.from?.trim() || !route.to?.trim() || !route.vehicle?.trim() || !(Number(route.amount) > 0)) issues.push('Complete each route with origin, destination, vehicle/class and positive fixed charge.')
    const key = [normalizePlace(route.from), normalizeStops(route.via), normalizePlace(route.to), normalizePlace(route.vehicle)].join('|')
    if (routeKeys.has(key)) issues.push(`Duplicate route rate: ${route.from} → ${route.to} · ${route.vehicle}.`)
    routeKeys.add(key)
  }
  const monthlyKeys = new Set()
  for (const rate of quote.monthly || []) {
    if (!rate.vehicle?.trim() || !(Number(rate.amount) > 0)) issues.push('Complete each monthly rate with a vehicle/model and positive amount.')
    const key = normalizePlace(rate.vehicle)
    if (monthlyKeys.has(key)) issues.push(`Duplicate monthly rate: ${rate.vehicle}.`)
    monthlyKeys.add(key)
  }
  for (const service of quote.services || []) if (!service.name?.trim() || !(Number(service.amount) > 0) || !service.unit?.trim()) issues.push('Complete each other service with name, unit, and positive rate.')
  if (!Number.isFinite(Number(quote.taxPercent)) || Number(quote.taxPercent) < 0 || Number(quote.taxPercent) > 100) issues.push('Tax must be between 0% and 100%.')
  for (const [name, value] of Object.entries(quote.extras || {})) if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) issues.push(`${name} must be a non-negative number.`)
  return [...new Set(issues)]
}

export function pricePreview(quote, { kind, from, via = '', to, vehicle, quantity = 1, extraKm = 0, overtimeHours = 0, extraDriver = false, oneWayKm = 0 } = {}) {
  const sameVehicle = (rate) => normalizePlace(rate.vehicle) === normalizePlace(vehicle)
  let rule
  let description
  if (kind === 'Monthly') {
    rule = quote.monthly.find((rate) => sameVehicle(rate) && normalizePlace(rate.vehicle) && Number(rate.amount) > 0)
    description = rule ? `${rule.vehicle} · monthly` : ''
  } else if (kind === 'Other service') {
    rule = quote.services.find((rate) => normalizePlace(rate.name) && normalizePlace(rate.name) === normalizePlace(vehicle) && Number(rate.amount) > 0)
    description = rule ? `${rule.name} · ${rule.unit}` : ''
  } else {
    rule = quote.routes.find((rate) => normalizePlace(rate.from) && normalizePlace(rate.to) && normalizePlace(rate.vehicle) && Number(rate.amount) > 0 && sameVehicle(rate) && normalizePlace(rate.from) === normalizePlace(from) && normalizeStops(rate.via) === normalizeStops(via) && normalizePlace(rate.to) === normalizePlace(to))
    description = rule ? `${rule.from}${rule.via ? ` → ${rule.via}` : ''} → ${rule.to} · ${rule.vehicle}` : ''
  }
  if (!rule) return { match: null, lines: [], subtotal: 0, tax: 0, total: 0 }
  const lines = [{ description, unit: kind === 'Monthly' ? 'Month' : kind === 'Other service' ? rule.unit : 'Trip', quantity: Number(quantity || 1), unitPrice: Number(rule.amount), ruleId: rule.id }]
  if (Number(extraKm) > 0 && Number(quote.extras.extraKmRate) > 0) lines.push({ description: 'Outside / extra distance', unit: 'km', quantity: Number(extraKm), unitPrice: Number(quote.extras.extraKmRate) })
  if (Number(overtimeHours) > 0 && Number(quote.extras.overtimeRate) > 0) lines.push({ description: 'Overtime', unit: 'hour', quantity: Number(overtimeHours), unitPrice: Number(quote.extras.overtimeRate) })
  if (extraDriver && Number(quote.extras.extraDriverRate) > 0 && (!Number(quote.extras.extraDriverThresholdKm) || Number(oneWayKm) > Number(quote.extras.extraDriverThresholdKm))) lines.push({ description: 'Additional driver', unit: 'service', quantity: 1, unitPrice: Number(quote.extras.extraDriverRate) })
  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) * 100) / 100
  const tax = Math.round(subtotal * Number(quote.taxPercent || 0)) / 100
  return { match: rule, lines, subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 }
}
