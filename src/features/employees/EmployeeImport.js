import { blankEmployee, EMPLOYEE_CATEGORIES, EMPLOYEE_DEPARTMENTS, EMPLOYEE_STATUSES, EMPLOYEE_TYPES } from './EmployeeData.js'
import { PERSONNEL_PROFILE_COLUMNS, personnelProfile, normalizePersonnelExcelDates } from '../../shared/lib/personnelImport.js'

export const EMPLOYEE_IMPORT_COLUMNS = [
  'Employee ID', 'Name', 'Phone', 'Email', 'Department', 'Job Title', 'Employment Type',
  'Monthly Salary (SAR)', 'Status', 'Join Date', 'Manager', 'ID / Iqama No.',
  ...Object.keys(PERSONNEL_PROFILE_COLUMNS), 'Category', 'Vendor', 'Daily Rate (SAR)',
]
const REQUIRED = ['Employee ID', 'Name', 'Phone', 'Department', 'Job Title', 'Monthly Salary (SAR)']
const EXAMPLE = ['EMP-9001', 'Layla Hassan', '+966 50 123 4567', 'layla@example.com', 'Operations', 'Dispatch Coordinator', 'Full-time', '7200.00', 'Active', '2026-01-15', 'Mariam Al-Harbi', 'IQ-9001']
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
const csv = (rows) => rows.map((row) => row.map(quote).join(',')).join('\r\n')
const normalizedPhone = (value) => String(value || '').replace(/\D/g, '')
const validIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const normalizeDate = (value) => {
  if (!value) return ''
  if (validIsoDate(value)) return value
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value)
  if (!match) return null
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])
  const date = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
  return validIsoDate(date) ? date : null
}

export const employeeTemplateCsv = () => csv([EMPLOYEE_IMPORT_COLUMNS, [...EXAMPLE, ...Array(EMPLOYEE_IMPORT_COLUMNS.length - EXAMPLE.length).fill('')]])
export const employeeErrorCsv = (rows) => csv([['Row', 'Employee ID', 'Name', 'Phone', 'Errors'], ...rows.filter((row) => row.errors.length).map((row) => [row.rowNumber, row.employee.employeeId, row.employee.name, row.employee.phone, row.errors.join('; ')])])

export async function parseEmployeeImportFile(file) {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose a CSV, XLSX, or XLS file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a file smaller than 5 MB.')
  const XLSX = await import('../../shared/vendor/xlsx.mjs')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false, raw: /\.csv$/i.test(file.name) })
  if (!workbook.SheetNames.length) throw new Error('The workbook has no sheets.')
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false, blankrows: false })
  if (/\.xlsx?$/i.test(file.name)) normalizePersonnelExcelDates(rows, workbook, XLSX)
  if (rows.length < 2) throw new Error('The file needs a header row and at least one employee.')
  if (rows.length > 2001) throw new Error('Import up to 2,000 employees at a time.')
  return rows
}

export function validateEmployeeImport(rows, existing) {
  const headers = rows[0].map((cell) => String(cell).trim().replace(/^\uFEFF/, ''))
  const missing = REQUIRED.filter((column) => !headers.includes(column))
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}. Download the template for supported columns.`)
  const existingIds = new Set(existing.map((employee) => String(employee.employeeId || '').trim().toUpperCase()).filter(Boolean))
  const existingPhones = new Set(existing.map((employee) => normalizedPhone(employee.phone)).filter(Boolean))
  const seenIds = new Set(), seenPhones = new Set()
  return rows.slice(1).filter((row) => row.some((cell) => String(cell).trim())).map((row, index) => {
    const values = Object.fromEntries(EMPLOYEE_IMPORT_COLUMNS.map((column) => [column, String(row[headers.indexOf(column)] ?? '').trim()]))
    const employee = {
      ...blankEmployee(), employeeId: values['Employee ID'].toUpperCase(), name: values.Name,
      phone: values.Phone, email: values.Email, department: values.Department || 'Operations',
      jobTitle: values['Job Title'], employmentType: values['Employment Type'] || 'Full-time',
      monthlySalary: Number(values['Monthly Salary (SAR)']), status: values.Status || 'Active',
      joinedOn: normalizeDate(values['Join Date']) ?? values['Join Date'], manager: values.Manager, idNumber: values['ID / Iqama No.'],
    }
    const profile = personnelProfile(values, { Category: ['category', 'text'], Vendor: ['vendor', 'text'], 'Daily Rate (SAR)': ['dailyRate', 'number'] })
    Object.assign(employee, profile.fields)
    const errors = [...profile.errors]
    if (values.Category && !EMPLOYEE_CATEGORIES.includes(employee.category)) errors.push(`Category must be one of: ${EMPLOYEE_CATEGORIES.join(', ')}`)
    if (employee.employmentType === 'Vendor' && !employee.vendor) errors.push('Vendor is required for vendor employees')
    REQUIRED.forEach((column) => { if (!values[column]) errors.push(`${column} is required`) })
    if (employee.employeeId && (existingIds.has(employee.employeeId) || seenIds.has(employee.employeeId))) errors.push('Duplicate Employee ID')
    const phoneKey = normalizedPhone(employee.phone)
    if (phoneKey && (existingPhones.has(phoneKey) || seenPhones.has(phoneKey))) errors.push('Duplicate phone number')
    if (employee.employeeId) seenIds.add(employee.employeeId)
    if (phoneKey) seenPhones.add(phoneKey)
    if (values.Department && !EMPLOYEE_DEPARTMENTS.includes(employee.department)) errors.push(`Department must be one of: ${EMPLOYEE_DEPARTMENTS.join(', ')}`)
    if (values['Employment Type'] && !EMPLOYEE_TYPES.includes(employee.employmentType)) errors.push(`Employment Type must be one of: ${EMPLOYEE_TYPES.join(', ')}`)
    if (values.Status && !EMPLOYEE_STATUSES.includes(employee.status)) errors.push(`Status must be one of: ${EMPLOYEE_STATUSES.join(', ')}`)
    if (values['Monthly Salary (SAR)'] && (!Number.isFinite(employee.monthlySalary) || employee.monthlySalary < 0)) errors.push('Monthly Salary must be a non-negative number')
    if (employee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) errors.push('Email is invalid')
    if (employee.joinedOn && !validIsoDate(employee.joinedOn)) errors.push('Join Date must be a valid date')
    return { rowNumber: index + 2, employee, errors }
  })
}
