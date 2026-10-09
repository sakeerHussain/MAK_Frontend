export const navigation = [
  { label: 'OVERVIEW', items: [{ name: 'Dashboard', icon: 'dashboard' }] },
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Fleet', icon: 'fleet' },
      { name: 'Driver', icon: 'driver' },
      { name: 'Employee', icon: 'employee' },
      { name: 'Vendor', icon: 'vendor' },
      { name: 'Maintenance', icon: 'maintenance' },
      { name: 'Inspections', icon: 'inspections' },
      { name: 'Live Tracking', icon: 'tracking' },
    ],
  },
  {
    label: 'TRIPS & CUSTOMERS',
    items: [
      { name: 'Bookings', icon: 'bookings' },
      { name: 'Corporate Trips', icon: 'corporate' },
      { name: 'Customer', icon: 'customer' },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'Payroll', icon: 'payroll' },
      { name: 'Invoices', icon: 'invoices' },
      { name: 'Billings', icon: 'billings' },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { name: 'Reviews', icon: 'reviews' },
      { name: 'Staff & Users', icon: 'users' },
      { name: 'Audit Log', icon: 'audit' },
      { name: 'Settings', icon: 'settings' },
    ],
  },
]

export const pageSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
