import { blankDriver, DRIVER_CATEGORIES, DRIVER_STATUSES, EMPLOYMENT_TYPES } from './DriverData.js'
import { PERSONNEL_PROFILE_COLUMNS, personnelProfile, normalizePersonnelExcelDates } from '../../shared/lib/personnelImport.js'

export const DRIVER_IMPORT_COLUMNS = [
  'Employee ID', 'Name', 'Phone', 'Email', 'Category', 'Designation', 'Employment Type', 'Vendor',
  'Daily Rate (SAR)', 'Status', 'Join Date', 'Driving Licence No.', 'ID / Iqama No.',
  ...Object.keys(PERSONNEL_PROFILE_COLUMNS).filter(column => column !== 'Driving Licence No.'), 'Monthly Rate (SAR)',
]
const REQUIRED = ['Employee ID', 'Name', 'Phone', 'Daily Rate (SAR)']
const EXAMPLE = ['DRV-9001', 'Maya Rahman', '+966 50 123 4567', 'maya@example.com', 'Light Vehicle', 'Driver', 'Full-time', '', '180.00', 'Active', '2026-01-15', 'LIC-9001', 'IQ-9001']
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
const csv = (rows) => rows.map((row) => row.map(quote).join(',')).join('\r\n')
const normalizedPhone = (value) => String(value || '').replace(/\D/g, '')
const validIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

export const driverTemplateCsv = () => csv([DRIVER_IMPORT_COLUMNS, [...EXAMPLE, ...Array(DRIVER_IMPORT_COLUMNS.length - EXAMPLE.length).fill('')]])
export const driverErrorCsv = (rows) => csv([['Row', 'Employee ID', 'Name', 'Phone', 'Errors'], ...rows.filter((row) => row.errors.length).map((row) => [row.rowNumber, row.driver.employeeId, row.driver.name, row.driver.phone, row.errors.join('; ')])])

export async function parseDriverImportFile(file) {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose a CSV, XLSX, or XLS file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a file smaller than 5 MB.')
  const XLSX = await import('../../shared/vendor/xlsx.mjs')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false, raw: /\.csv$/i.test(file.name) })
  if (!workbook.SheetNames.length) throw new Error('The workbook has no sheets.')
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false, blankrows: false })
  if (/\.xlsx?$/i.test(file.name)) normalizePersonnelExcelDates(rows, workbook, XLSX)
  if (rows.length < 2) throw new Error('The file needs a header row and at least one driver.')
  if (rows.length > 2001) throw new Error('Import up to 2,000 drivers at a time.')
  return rows
}

export function validateDriverImport(rows, existing) {
  const headers = rows[0].map((cell) => String(cell).trim().replace(/^\uFEFF/, ''))
  const missing = REQUIRED.filter((column) => !headers.includes(column))
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}. Download the template for supported columns.`)
  const existingIds = new Set(existing.map((driver) => String(driver.employeeId || '').trim().toUpperCase()).filter(Boolean))
  const existingPhones = new Set(existing.map((driver) => normalizedPhone(driver.phone)).filter(Boolean))
  const seenIds = new Set(), seenPhones = new Set()
  return rows.slice(1).filter((row) => row.some((cell) => String(cell).trim())).map((row, index) => {
    const values = Object.fromEntries(DRIVER_IMPORT_COLUMNS.map((column) => [column, String(row[headers.indexOf(column)] ?? '').trim()]))
    const driver = {
      ...blankDriver(), employeeId: values['Employee ID'].toUpperCase(), name: values.Name,
      phone: values.Phone, email: values.Email, category: values.Category || 'Light Vehicle',
      designation: values.Designation || 'Driver', employmentType: values['Employment Type'] || 'Full-time',
      vendor: values.Vendor, dailyRate: Number(values['Daily Rate (SAR)']),
      status: values.Status || 'Active', joinedOn: values['Join Date'],
      licenceNumber: values['Driving Licence No.'], idNumber: values['ID / Iqama No.'],
    }
    const profile = personnelProfile(values, { 'Monthly Rate (SAR)': ['monthlyRate', 'number'] })
    Object.assign(driver, profile.fields)
    const errors = [...profile.errors]
    REQUIRED.forEach((column) => { if (!values[column]) errors.push(`${column} is required`) })
    if (driver.employeeId && (existingIds.has(driver.employeeId) || seenIds.has(driver.employeeId))) errors.push('Duplicate Employee ID')
    const phoneKey = normalizedPhone(driver.phone)
    if (phoneKey && (existingPhones.has(phoneKey) || seenPhones.has(phoneKey))) errors.push('Duplicate phone number')
    if (phoneKey && (phoneKey.length < 7 || phoneKey.length > 20)) errors.push('Phone must contain 7 to 20 digits')
    if (driver.employeeId) seenIds.add(driver.employeeId)
    if (phoneKey) seenPhones.add(phoneKey)
    if (values.Category && !DRIVER_CATEGORIES.includes(driver.category)) errors.push(`Category must be one of: ${DRIVER_CATEGORIES.join(', ')}`)
    if (values['Employment Type'] && !EMPLOYMENT_TYPES.includes(driver.employmentType)) errors.push(`Employment Type must be one of: ${EMPLOYMENT_TYPES.join(', ')}`)
    if (driver.employmentType === 'Vendor' && !driver.vendor) errors.push('Vendor is required for vendor drivers')
    if (values.Status && !DRIVER_STATUSES.includes(driver.status)) errors.push(`Status must be one of: ${DRIVER_STATUSES.join(', ')}`)
    if (values['Daily Rate (SAR)'] && (!Number.isFinite(driver.dailyRate) || driver.dailyRate < 0)) errors.push('Daily Rate must be a non-negative number')
    if (driver.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driver.email)) errors.push('Email is invalid')
    if (driver.joinedOn && !validIsoDate(driver.joinedOn)) errors.push('Join Date must be a valid YYYY-MM-DD date')
    return { rowNumber: index + 2, driver, errors }
  })
}
