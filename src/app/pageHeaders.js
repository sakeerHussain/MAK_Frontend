const PAGE_HEADERS = {
  Dashboard: ['Dashboard', 'A clear view of your business, vehicles, and trips.'],
  Fleet: ['Fleet', 'Manage vehicles, availability, and fleet records.'],
  Driver: ['Driver', 'Manage drivers, rates, and compliance.'],
  Employee: ['Employee', 'Manage employees, departments, salaries, and documents.'],
  Vendor: ['Vendor', 'Manage vendors, contacts, terms, and documents.'],
  Maintenance: ['Maintenance', 'Track vehicle servicing, repairs, and upcoming maintenance.'],
  Inspections: ['Inspections', 'Capture vehicle condition, odometer, fuel, and photo evidence.'],
  'Live Tracking': ['Live Tracking', 'Monitor vehicle locations and trip progress.'],
  Bookings: ['Bookings', 'Track reservations, handovers, returns, and payments.'],
  'Corporate Trips': ['Corporate Trips', 'Manage company trip requests, assignments, and billing.'],
  Customer: ['Customer', 'Manage customer accounts, quotes, and agreed rates.'],
  Payroll: ['Payroll', 'Manage staff payroll and payment records.'],
  Invoices: ['Invoices', 'Create, issue, and track individual and corporate invoices.'],
  Billings: ['Billings', 'Review completed work and prepare invoice drafts.'],
  Reviews: ['Reviews', 'Review customer feedback and rental experiences.'],
  'Staff & Users': ['Users & Roles', 'Manage staff accounts, roles, and access.'],
  'Audit Log': ['Audit Log', 'Review account activity and security events.'],
  Settings: ['Settings', 'Manage workspace settings and preferences.'],
}

const DETAIL_HEADERS = {
  Fleet: ['Vehicle Details', 'Review vehicle specifications, availability, and documents.'],
  Driver: ['Driver Profile', 'Review driver details, employment, and compliance.'],
  Employee: ['Employee Profile', 'Review employee details, employment, and documents.'],
  Vendor: ['Vendor Profile', 'Review vendor contacts, commercial terms, and documents.'],
  Bookings: ['Booking Details', 'Review the reservation, assignment, payments, and invoice.'],
  'Corporate Trips': ['Corporate Trip Details', 'Review the itinerary, assignment, charges, and billing.'],
  Customer: ['Customer Profile', 'Review account details, quotes, bookings, and invoices.'],
}

const INVOICE_HEADERS = {
  new: ['Create Invoice', 'Prepare invoice details and charges for completed work.'],
  edit: ['Edit Invoice', 'Update draft details and charges before issuing.'],
  detail: ['Invoice Details', 'Review invoice charges, payments, and outstanding balance.'],
}

export function getAdminPageHeader(page, { detail = false, invoiceMode = 'list' } = {}) {
  const [title, description] = (page === 'Invoices' && INVOICE_HEADERS[invoiceMode])
    || (detail && DETAIL_HEADERS[page])
    || PAGE_HEADERS[page]
    || [page, 'Manage your rental workspace.']
  return { title, description }
}
