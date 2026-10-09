export const VENDOR_TYPES = ['Business', 'Individual']
export const VENDOR_STATUSES = ['Active', 'Inactive']
export const BUSINESS_CLASSIFICATIONS = ['Transport Company', 'Authorized Dealer', 'Service Provider', 'Distributor', 'Retailers', 'Spare Parts Supplier', 'Contractor', 'Fuel Supplier', 'Others']
export const CREDIT_TERMS = [15, 30, 45, 60, 90]
export const ATTACHMENT_TYPES = ['Company Profile', 'CR Copy', 'VAT Certificate', 'Bank IBAN', 'National Address']
export const BANK_CURRENCIES = ['SAR', 'USD', 'EUR', 'AED']

export const blankContact = () => ({ id: crypto.randomUUID(), name: '', mobile: '', email: '' })
export const blankVendor = () => ({
  id: null, vendorId: '', vendorType: 'Business', name: '', crNumber: '', vatNumber: '', nationalAddress: '',
  classification: '', contacts: [blankContact()], commission: '', status: 'Active', creditTerms: '30',
  contractStart: '', contractEnd: '', bank: { beneficiaryName: '', bankName: '', iban: '', accountNumber: '', swiftCode: '', currency: 'SAR' }, attachments: [],
})

export const primaryContact = (vendor) => vendor.contacts?.[0] || { name: '', mobile: '', email: '' }

export const vendorReferenceCount = (vendor, vehicles = [], drivers = [], employees = []) => {
  const matches = (name) => String(name || '').trim().toLowerCase() === vendor.name.trim().toLowerCase()
  return vehicles.filter((vehicle) => vehicle.ownership === 'Vendor' && matches(vehicle.vendor)).length
    + drivers.filter((driver) => driver.employmentType === 'Vendor' && matches(driver.vendor)).length
    + employees.filter((employee) => employee.employmentType === 'Vendor' && matches(employee.vendor)).length
}

export function nextVendorId(vendors) {
  const number = Math.max(0, ...vendors.map((vendor) => Number(vendor.vendorId?.match(/\d+/)?.[0]) || 0)) + 1
  return `VEN-${String(number).padStart(3, '0')}`
}

export function validateVendor(vendor, vendors = []) {
  if (!VENDOR_TYPES.includes(vendor.vendorType)) return 'Choose a valid vendor type.'
  if (!vendor.name.trim()) return 'Enter the vendor name.'
  if (vendors.some((item) => item.id !== vendor.id && item.name.trim().toLowerCase() === vendor.name.trim().toLowerCase())) return 'A vendor with this name already exists.'
  if (vendor.crNumber && !/^[a-z\d\s/-]+$/i.test(vendor.crNumber.trim())) return 'CR No. can contain letters, numbers, spaces, slashes, and hyphens.'
  if (vendor.vatNumber && !/^\d{15}$/.test(vendor.vatNumber.trim())) return 'VAT No. must contain exactly 15 digits.'
  if (vendor.classification && !BUSINESS_CLASSIFICATIONS.includes(vendor.classification)) return 'Choose a valid business classification.'
  if (vendor.commission === '' || !Number.isFinite(Number(vendor.commission)) || Number(vendor.commission) < 0 || Number(vendor.commission) > 100) return 'Commission must be between 0 and 100%.'
  if (!vendor.contacts?.length) return 'Add at least one contact person.'
  for (const [index, contact] of vendor.contacts.entries()) {
    if (!contact.name.trim() || !contact.mobile.trim()) return `Enter the name and mobile number for contact ${index + 1}.`
    if (!/^\+?[\d\s()-]+$/.test(contact.mobile.trim()) || contact.mobile.replace(/\D/g, '').length < 8 || contact.mobile.replace(/\D/g, '').length > 15) return `Enter a valid mobile number for contact ${index + 1}.`
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) return `Enter a valid email address for contact ${index + 1}.`
  }
  if (!CREDIT_TERMS.includes(Number(vendor.creditTerms))) return 'Choose valid credit terms.'
  if (vendor.contractStart && vendor.contractEnd && vendor.contractEnd < vendor.contractStart) return 'Contract end date must be on or after the start date.'
  if (vendor.bank?.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(vendor.bank.iban.replace(/\s/g, ''))) return 'Enter a valid IBAN or leave it blank.'
  if (vendor.bank?.currency && !BANK_CURRENCIES.includes(vendor.bank.currency)) return 'Choose a valid bank currency.'
  return ''
}

const sample = (id, name, type, classification, contact, phone, email, commission, status, extras = {}) => ({
  ...blankVendor(), id, vendorId: `VEN-${String(id).padStart(3, '0')}`, name, vendorType: type, classification,
  contacts: [{ id: `contact-${id}`, name: contact, mobile: phone, email }], commission, status, nationalAddress: 'Riyadh, Saudi Arabia', ...extras,
})

export const makeDemoVendors = () => [
  sample(1, 'Northside Rentals', 'Business', 'Transport Company', 'Faisal Rahman', '+966 50 000 1001', 'faisal@example.com', 12, 'Active', { creditTerms: '30', contractStart: '2026-01-01', contractEnd: '2026-12-31' }),
  sample(2, 'Airport Mobility', 'Business', 'Transport Company', 'Mariam Saeed', '+966 50 000 1002', 'mariam@example.com', 8, 'Active', { creditTerms: '45' }),
  sample(3, 'CityDrive Partners', 'Business', 'Service Provider', 'Omar Hassan', '+966 50 000 1003', 'omar@example.com', 5, 'Active', { creditTerms: '30' }),
  sample(4, 'City Auto Parts', 'Business', 'Spare Parts Supplier', 'Leena Faris', '+966 50 000 1004', 'leena@example.com', 3.5, 'Active', { creditTerms: '60' }),
  sample(5, 'Nabil Al Harbi', 'Individual', 'Service Provider', 'Nabil Al Harbi', '+966 50 000 1005', 'nabil@example.com', 5, 'Inactive', { creditTerms: '15' }),
]
