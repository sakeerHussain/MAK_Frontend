export const DRIVER_CATEGORIES = ['Light Vehicle', 'Heavy Vehicle', 'Chauffeur', 'Delivery']
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Vendor']
export const DRIVER_STATUSES = ['Active', 'Inactive']
export const DRIVER_DOCUMENT_TYPES = ['Iqama', 'Passport copy', 'License copy', 'Contract copy', 'PCC', 'Medical', 'Home address Proof', 'Others']
export const REQUIRED_DRIVER_DOCUMENTS = ['Iqama', 'License copy']

export function blankDriver() {
  return {
    employeeId: '', name: '', phone: '', email: '', category: 'Light Vehicle',
    nationality: '', designation: 'Driver', idNumber: '', iqamaExpiry: '', yearsExperience: '', photo: null,
    employmentType: 'Full-time', vendor: '', status: 'Active', companyId: '', joinedOn: '', officialNumber: '',
    hourlyRate: '', dailyRate: '', monthlyRate: '',
    passportNumber: '', passportExpiry: '', contractId: '', contractExpiry: '',
    licenceNumber: '', licenceExpiry: '', bloodGroup: '', insuranceNumber: '', insuranceExpiry: '',
    emergencyKsa: '', emergencyHome: '', homeAddress: '',
    documents: [], certifications: [], bookingCount: 0, paymentCount: 0,
  }
}

export function driverCompliance(driver) {
  const records = driver.documents || []
  const today = new Date().toISOString().slice(0, 10)
  if (records.some((item) => item.expiryDate && item.expiryDate < today) || [driver.iqamaExpiry, driver.passportExpiry, driver.contractExpiry, driver.licenceExpiry, driver.insuranceExpiry].some((date) => date && date < today)) return 'Expired'
  return REQUIRED_DRIVER_DOCUMENTS.every((type) => records.some((item) => item.type === type && item.name && item.expiryDate)) ? 'Complete' : 'Missing'
}

export function makeDemoDrivers() {
  const examples = [
    ['DRV-1001', 'Ahmed Al-Farsi', '+966 50 123 4567', 'Light Vehicle', 'Full-time', 180, 'Active', 42, 12],
    ['DRV-1002', 'Priya Menon', '+966 55 234 5678', 'Chauffeur', 'Full-time', 230, 'Active', 36, 10],
    ['DRV-1003', 'Omar Nasser', '+966 54 345 6789', 'Heavy Vehicle', 'Contract', 260, 'Active', 18, 5],
    ['DRV-1004', 'Samir Khan', '+966 56 456 7890', 'Delivery', 'Part-time', 155, 'Inactive', 11, 3],
    ['DRV-1005', 'Fatima Rahman', '+966 58 567 8901', 'Light Vehicle', 'Full-time', 185, 'Active', 27, 8],
    ['DRV-1006', 'Yusuf Ali', '+966 59 678 9012', 'Chauffeur', 'Vendor', 240, 'Active', 0, 0],
    ['DRV-1007', 'Lina Haddad', '+966 53 789 0123', 'Light Vehicle', 'Contract', 190, 'Active', 0, 0],
    ['DRV-1008', 'Bilal Qureshi', '+966 57 890 1234', 'Heavy Vehicle', 'Full-time', 255, 'Inactive', 21, 7],
    ['DRV-1009', 'Nadia Karim', '+966 52 901 2345', 'Delivery', 'Part-time', 160, 'Active', 0, 0],
    ['DRV-1010', 'Hassan Malik', '+966 50 012 3456', 'Light Vehicle', 'Vendor', 175, 'Active', 9, 2],
    ['DRV-1011', 'Sara Ibrahim', '+966 55 135 2468', 'Chauffeur', 'Full-time', 225, 'Active', 14, 4],
    ['DRV-1012', 'Khalid Bashir', '+966 54 246 3579', 'Delivery', 'Contract', 165, 'Inactive', 0, 0],
  ]
  return examples.map(([employeeId, name, phone, category, employmentType, dailyRate, status, bookingCount, paymentCount], index) => {
    const expiryDate = index === 3 || index === 7 ? '2025-05-10' : '2028-12-31'
    const documents = index === 4 || index === 8 ? [] : [
      { type: 'License copy', name: 'license-copy.pdf', expiryDate },
      { type: 'Iqama', name: 'iqama.pdf', expiryDate: '2029-12-31' },
    ]
    return { ...blankDriver(), id: index + 1, employeeId, name, phone, category, employmentType, dailyRate, status, bookingCount, paymentCount, joinedOn: '2024-01-15', licenceNumber: `LIC-${String(7110 + index)}`, documents }
  })
}
