export const PAGE_MODULE = {
  Dashboard: 'dashboard', Fleet: 'fleet', Driver: 'drivers', Employee: 'employees', Vendor: 'vendors', Maintenance: 'maintenance', Inspections: 'inspections',
  Bookings: 'bookings', 'Corporate Trips': 'corporate-trips', Customer: 'customers', Invoices: 'invoices', Billings: 'invoices', Payroll: 'invoices', // Navigation-only placeholder; payroll API permissions will be added with the module.
  'Staff & Users': 'users', 'Audit Log': 'audit', Settings: 'settings',
}
export function canReadPage(user, page) { const module = PAGE_MODULE[page]; return Boolean(module && user.permissions.includes(module === 'users' ? 'users.manage' : `${module}.read`)) }
export function canWritePage(user, page) { const module = PAGE_MODULE[page]; return Boolean(module && user.permissions.includes(module === 'users' ? 'users.manage' : `${module}.write`)) }
export function isWriteAction(label) {
  return /^(?:\+\s*)?(?:add|new|create|edit|save|delete|remove|upload|import|bulk upload|activate|deactivate|update|assign|reassign|confirm booking|start rental|complete|handover|return vehicle|record|approve|reject|supersede|share|send|email|resend|retry email|payments|cancel booking|cancel trip|issue)\b/i.test(label.trim())
}
