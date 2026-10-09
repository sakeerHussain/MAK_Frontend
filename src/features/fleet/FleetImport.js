import { blankVehicle, FUEL_OPTIONS, STATUS_OPTIONS, TRANSMISSION_OPTIONS, TYPE_OPTIONS } from './FleetData.js'

export const IMPORT_COLUMNS = [
  'Make', 'Model', 'Registration Number', 'Year of Registration', 'Color', 'Vehicle ID', 'Door No.', 'Chassis No.',
  'Type', 'Seats', 'Transmission', 'Fuel Type', 'Feature Tags', 'Hourly Rate (USD)', 'Daily Rate (USD)',
  'Monthly Rate (USD)', 'Ownership', 'Vendor', 'Status', 'Custodian', 'On-site?', 'Listed for Booking',
  'Show on Public Site', 'Service Interval (km)', 'Last Service (km)', 'Current Odometer (km)',
  'Oil Interval (km)', 'Last Oil (km)', 'Tyre Interval (km)', 'Last Tyre (km)', 'Brake Interval (km)', 'Last Brake (km)',
]
const REQUIRED = ['Make', 'Model', 'Registration Number', 'Year of Registration', 'Vehicle ID', 'Type', 'Seats', 'Transmission', 'Fuel Type', 'Daily Rate (USD)']
const COLUMN_FIELDS = {
  Make: 'make', Model: 'model', 'Registration Number': 'registration', 'Year of Registration': 'year',
  Color: 'color', 'Vehicle ID': 'vehicleId', 'Door No.': 'doorNo', 'Chassis No.': 'chassisNo',
  Type: 'type', Seats: 'seats', Transmission: 'transmission', 'Fuel Type': 'fuelType', 'Feature Tags': 'featureTags',
  'Hourly Rate (USD)': 'hourlyRate', 'Daily Rate (USD)': 'dailyRate', 'Monthly Rate (USD)': 'monthlyRate',
  Ownership: 'ownership', Vendor: 'vendor', Status: 'status', Custodian: 'custodian', 'On-site?': 'onSite',
  'Listed for Booking': 'listedForBooking', 'Show on Public Site': 'showOnPublicSite',
  'Service Interval (km)': 'serviceIntervalKm', 'Last Service (km)': 'lastServiceKm',
  'Current Odometer (km)': 'currentOdometerKm', 'Oil Interval (km)': 'oilIntervalKm', 'Last Oil (km)': 'lastOilKm',
  'Tyre Interval (km)': 'tyreIntervalKm', 'Last Tyre (km)': 'lastTyreKm',
  'Brake Interval (km)': 'brakeIntervalKm', 'Last Brake (km)': 'lastBrakeKm',
}
const NUMERIC = ['year', 'seats', 'hourlyRate', 'dailyRate', 'monthlyRate', 'serviceIntervalKm', 'lastServiceKm', 'currentOdometerKm', 'oilIntervalKm', 'lastOilKm', 'tyreIntervalKm', 'lastTyreKm', 'brakeIntervalKm', 'lastBrakeKm']
const BOOLEAN = ['onSite', 'listedForBooking', 'showOnPublicSite']
const PAIRS = [['serviceIntervalKm', 'lastServiceKm'], ['oilIntervalKm', 'lastOilKm'], ['tyreIntervalKm', 'lastTyreKm'], ['brakeIntervalKm', 'lastBrakeKm']]
const example = ['Toyota', 'Camry', 'RNT-9001', '2024', 'Silver', 'VH-9001', 'D-12', 'JT123456789012345', 'Sedan', '5', 'Automatic', 'Hybrid', 'GPS, Bluetooth', '12.00', '72.00', '1800.00', 'Owned', '', 'Available', 'Unassigned', 'Yes', 'Yes', 'No', '10000', '25000', '30000', '10000', '25000', '40000', '10000', '30000', '10000']
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
export const templateCsv = () => [IMPORT_COLUMNS, example].map((row) => row.map(quote).join(',')).join('\r\n')
export const errorCsv = (rows) => [['Row', 'Registration Number', 'Vehicle ID', 'Errors'], ...rows.filter((row) => row.errors.length).map((row) => [row.rowNumber, row.car.registration, row.car.vehicleId, row.errors.join('; ')])].map((row) => row.map(quote).join(',')).join('\r\n')
export async function parseImportFile(file) {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose a CSV, XLSX, or XLS file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a file smaller than 5 MB.')
  const XLSX = await import('../../shared/vendor/xlsx.mjs')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
  if (!workbook.SheetNames.length) throw new Error('The workbook has no sheets.')
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false, blankrows: false })
  if (rows.length < 2) throw new Error('The file needs a header row and at least one vehicle.')
  if (rows.length > 2001) throw new Error('Import up to 2,000 vehicles at a time.')
  return rows
}

export function validateImport(rows, existing) {
  const headers = rows[0].map((cell) => String(cell).trim().replace(/^\uFEFF/, ''))
  const missing = REQUIRED.filter((column) => !headers.includes(column))
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}. Download the template for supported columns.`)
  const existingRegs = new Set(existing.map((car) => String(car.registration || '').trim().toUpperCase()))
  const existingIds = new Set(existing.map((car) => String(car.vehicleId || '').trim().toUpperCase()).filter(Boolean))
  const seenRegs = new Set(), seenIds = new Set()
  return rows.slice(1).filter((row) => row.some((cell) => String(cell).trim())).map((row, index) => {
    const values = Object.fromEntries(IMPORT_COLUMNS.map((column) => [COLUMN_FIELDS[column], String(row[headers.indexOf(column)] ?? '').trim()]))
    const car = { ...blankVehicle(), ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')), documentRecords: [], documents: 'Missing' }
    car.registration = car.registration.toUpperCase()
    car.vehicleId = car.vehicleId.toUpperCase()
    car.featureTags = String(car.featureTags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
    const errors = []
    REQUIRED.forEach((column) => { if (!values[COLUMN_FIELDS[column]]) errors.push(`${column} is required`) })
    if (car.registration && (existingRegs.has(car.registration) || seenRegs.has(car.registration))) errors.push('Duplicate registration number')
    if (car.vehicleId && (existingIds.has(car.vehicleId) || seenIds.has(car.vehicleId))) errors.push('Duplicate vehicle ID')
    if (car.registration) seenRegs.add(car.registration)
    if (car.vehicleId) seenIds.add(car.vehicleId)
    NUMERIC.forEach((field) => {
      if (!values[field]) { car[field] = null; return }
      const value = Number(values[field])
      if (!Number.isFinite(value) || value < 0) errors.push(`${field} must be a non-negative number`)
      car[field] = value
    })
    if (car.year && (!Number.isInteger(car.year) || car.year < 1980 || car.year > new Date().getFullYear() + 1)) errors.push('Year of Registration is out of range')
    if (car.seats !== null && (!Number.isInteger(car.seats) || car.seats < 1 || car.seats > 60)) errors.push('Seats must be a whole number from 1 to 60')
    if (car.dailyRate !== null && car.dailyRate <= 0) errors.push('Daily Rate must be greater than zero')
    for (const [field, options] of [['type', TYPE_OPTIONS], ['status', STATUS_OPTIONS], ['transmission', TRANSMISSION_OPTIONS], ['fuelType', FUEL_OPTIONS], ['ownership', ['Owned', 'Leased', 'Vendor']]]) {
      if (values[field] && !options.includes(values[field])) errors.push(`${field} must be one of: ${options.join(', ')}`)
    }
    if (car.ownership === 'Vendor' && !car.vendor) errors.push('Vendor is required for vendor-owned cars')
    for (const field of ['serviceIntervalKm', 'lastServiceKm', 'currentOdometerKm', 'oilIntervalKm', 'lastOilKm', 'tyreIntervalKm', 'lastTyreKm', 'brakeIntervalKm', 'lastBrakeKm']) {
      if (car[field] !== null && !Number.isInteger(car[field])) errors.push(`${field} must be a whole number`)
    }
    BOOLEAN.forEach((field) => {
      const value = values[field]?.toLowerCase()
      if (value && !['yes', 'no', 'true', 'false', '1', '0'].includes(value)) errors.push(`${field} must be Yes or No`)
      car[field] = value ? ['yes', 'true', '1'].includes(value) : blankVehicle()[field]
    })
    PAIRS.forEach(([interval, last]) => {
      if (car[interval] !== null && car[interval] <= 0) errors.push(`${interval} must be greater than zero`)
      if (car[interval] !== null && car.currentOdometerKm === null) errors.push('Current Odometer is required for maintenance calculations')
      if (car[interval] !== null && car[last] === null) errors.push(`${last} is required when ${interval} is set`)
      if (car[last] !== null && car.currentOdometerKm !== null && car[last] > car.currentOdometerKm) errors.push(`${last} exceeds current odometer`)
    })
    car.owner = car.ownership === 'Vendor' ? car.vendor : car.ownership === 'Leased' ? 'Leased Fleet' : 'Company Fleet'
    car.rate = car.dailyRate || 0
    return { rowNumber: index + 2, car, errors }
  })
}
