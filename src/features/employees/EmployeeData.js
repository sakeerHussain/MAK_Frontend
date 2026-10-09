export const EMPLOYEE_DEPARTMENTS = ['Operations', 'Customer Service', 'Fleet', 'Finance', 'Human Resources', 'Sales', 'Administration']
export const EMPLOYEE_CATEGORIES = ['Operations', 'Management', 'Administration', 'Customer Service', 'Technical', 'Finance', 'Other']
export const EMPLOYEE_TYPES = ['Full-time', 'Part-time', 'Contract', 'Vendor']
export const EMPLOYEE_STATUSES = ['Active', 'Inactive']
export const EMPLOYEE_DOCUMENT_TYPES = ['Iqama', 'Passport copy', 'License copy', 'Contract copy', 'PCC', 'Medical', 'Home address Proof', 'Others']
export const REQUIRED_EMPLOYEE_DOCUMENTS = ['Contract copy']

export function blankEmployee() {
  return {
    employeeId: '', name: '', phone: '', email: '', department: 'Operations', jobTitle: '',
    nationality: '', idNumber: '', iqamaExpiry: '', yearsExperience: '', photo: null,
    category: 'Operations', employmentType: 'Full-time', vendor: '', status: 'Active',
    companyId: '', joinedOn: '', officialNumber: '', manager: '',
    hourlyRate: '', dailyRate: '', monthlySalary: '',
    passportNumber: '', passportExpiry: '', contractId: '', contractExpiry: '',
    licenceNumber: '', licenceExpiry: '', bloodGroup: '', insuranceNumber: '', insuranceExpiry: '',
    emergencyKsa: '', emergencyHome: '', homeAddress: '',
    documents: [], payrollCount: 0,
  }
}

export function employeeDocumentsStatus(employee) {
  const records = employee.documents || []
  const today = new Date().toISOString().slice(0, 10)
  if (records.some((item) => item.expiryDate && item.expiryDate < today) || [employee.iqamaExpiry, employee.passportExpiry, employee.contractExpiry, employee.licenceExpiry, employee.insuranceExpiry].some((date) => date && date < today)) return 'Expired'
  return REQUIRED_EMPLOYEE_DOCUMENTS.every((type) => records.some((item) => item.type === type && item.name)) ? 'Complete' : 'Missing'
}

export function makeDemoEmployees() {
  const examples = [
    ['EMP-1001', 'Mariam Al-Harbi', '+966 50 100 2001', 'Operations', 'Operations Manager', 'Full-time', 12500, 'Active', 15],
    ['EMP-1002', 'Ravi Kumar', '+966 55 100 2002', 'Fleet', 'Fleet Coordinator', 'Full-time', 6900, 'Active', 12],
    ['EMP-1003', 'Huda Mansour', '+966 54 100 2003', 'Customer Service', 'Customer Care Lead', 'Full-time', 7800, 'Active', 13],
    ['EMP-1004', 'Omar Farooq', '+966 56 100 2004', 'Finance', 'Accounts Officer', 'Full-time', 8300, 'Active', 9],
    ['EMP-1005', 'Noura Al-Salem', '+966 58 100 2005', 'Human Resources', 'HR Specialist', 'Full-time', 9200, 'Active', 8],
    ['EMP-1006', 'Salman Ibrahim', '+966 59 100 2006', 'Sales', 'Corporate Sales Executive', 'Full-time', 7500, 'Active', 10],
    ['EMP-1007', 'Leena Mathew', '+966 53 100 2007', 'Administration', 'Office Administrator', 'Contract', 6200, 'Inactive', 4],
    ['EMP-1008', 'Faisal Ahmed', '+966 57 100 2008', 'Fleet', 'Vehicle Inspector', 'Full-time', 6700, 'Active', 6],
    ['EMP-1009', 'Aisha Rahman', '+966 52 100 2009', 'Customer Service', 'Reservations Agent', 'Part-time', 4300, 'Active', 0],
    ['EMP-1010', 'Bilal Khan', '+966 50 100 2010', 'Operations', 'Dispatch Coordinator', 'Contract', 6100, 'Inactive', 0],
  ]
  return examples.map(([employeeId, name, phone, department, jobTitle, employmentType, monthlySalary, status, payrollCount], index) => ({
    ...blankEmployee(), id: index + 1, employeeId, name, phone, department, jobTitle,
    category: ({ Fleet: 'Technical', 'Human Resources': 'Administration', Sales: 'Other' })[department] || department,
    employmentType, monthlySalary, status, payrollCount, joinedOn: '2024-01-15',
    documents: index === 6 || index === 8 ? [] : [{ type: 'Contract copy', name: 'contract-copy.pdf', expiryDate: index === 7 ? '2025-12-31' : '' }],
  }))
}
