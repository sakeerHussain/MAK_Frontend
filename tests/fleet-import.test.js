import { Buffer } from 'node:buffer'
import test from 'node:test'
import assert from 'node:assert/strict'
import { IMPORT_COLUMNS, parseImportFile, templateCsv, validateImport } from '../src/features/fleet/FleetImport.js'
import { vehiclePayload } from '../src/features/fleet/FleetApi.js'
import { documentStatus, TYPE_OPTIONS } from '../src/features/fleet/FleetData.js'
import { vehicleReadiness } from '../src/shared/lib/rentalPolicy.js'
import * as XLSX from '../src/shared/vendor/xlsx.mjs'

const values = { Make: 'Leyland', Model: 'Oyster', 'Registration Number': 'TEST-BUS-1', 'Year of Registration': '2026', 'Vehicle ID': 'TEST-VEH-1', Type: 'Bus', Seats: '35', Transmission: 'Manual', 'Fuel Type': 'Diesel', 'Daily Rate (SAR)': '500', Ownership: 'Owned', Status: 'Inactive', 'On-site?': 'No', 'Listed for Booking': 'No', 'Show on Public Site': 'No' }
const matrix = (overrides = {}) => [IMPORT_COLUMNS, IMPORT_COLUMNS.map(column => ({ ...values, ...overrides })[column] ?? '')]
const file = (name, bytes) => ({ name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })

test('bus import preserves date-only compliance values into the API payload', async () => {
  assert.ok(TYPE_OPTIONS.includes('Bus'))
  const rows = matrix({ 'Registration Expiry Date': '2030-12-31', 'Insurance Expiry Date': '2030-02-28', 'Inspection Expiry Date': '2031-01-01' })
  const csv = rows.map(row => row.map(value => `"${value}"`).join(',')).join('\r\n')
  const parsed = await parseImportFile(file('vehicles.csv', Buffer.from(csv)))
  const [row] = validateImport(parsed, [])
  assert.deepEqual(row.errors, [])
  assert.equal(row.car.type, 'Bus')
  const payload = vehiclePayload(row.car)
  assert.equal(payload.registrationExpiryDate, '2030-12-31')
  assert.equal(payload.insuranceExpiryDate, '2030-02-28')
  assert.equal(payload.inspectionExpiryDate, '2031-01-01')
  assert.equal(row.car.documentRecords.length, 0)
  assert.equal(documentStatus(row.car), 'Missing')
})

test('ambiguous and impossible dates fail validation instead of being inferred', async () => {
  for (const date of ['4/6/2026', '2026-02-30', '2026-13-01', '2026-2-01', '0000-01-01', '46217']) {
    const [row] = validateImport(matrix({ 'Insurance Expiry Date': date }), [])
    assert.ok(row.errors.some(error => /Insurance Expiry Date.*YYYY-MM-DD/.test(error)), date)
  }
  assert.deepEqual(validateImport(matrix({ 'Insurance Expiry Date': '2028-02-29' }), [])[0].errors, [])
  const rows = matrix({ 'Insurance Expiry Date': '4/6/2026' })
  const parsed = await parseImportFile(file('ambiguous.csv', Buffer.from(rows.map(row => row.join(',')).join('\n'))))
  assert.equal(parsed[1][IMPORT_COLUMNS.indexOf('Insurance Expiry Date')], '4/6/2026')
})

test('real Excel serial date cells use the workbook date system', async () => {
  for (const date1904 of [false, true]) {
    const rows = matrix({ 'Insurance Expiry Date': date1904 ? 1 : 61 })
    const book = XLSX.utils.book_new()
    book.Workbook = { WBProps: { date1904 } }
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Fleet import')
    const bytes = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })
    const parsed = await parseImportFile(file('fleet.xlsx', bytes))
    assert.equal(parsed[1][IMPORT_COLUMNS.indexOf('Insurance Expiry Date')], date1904 ? '1904-01-02' : '1900-03-01')
  }
})

test('expired dates warn but can be retained, without satisfying document readiness', () => {
  const [row] = validateImport(matrix({ 'Insurance Expiry Date': '2000-01-01' }), [])
  assert.deepEqual(row.errors, [])
  assert.ok(row.warnings.some(warning => /Insurance Expiry Date has expired/.test(warning)))
  assert.equal(documentStatus(row.car), 'Expired')
  const car = { ...row.car, status: 'Available', onSite: true }
  assert.ok(vehicleReadiness(car).some(issue => /must be attached/.test(issue)))
  assert.ok(vehicleReadiness(car).some(issue => /expiry date has passed/.test(issue)))
  car.documentRecords = ['Istimara', 'Insurance', 'Fahas'].map(type => ({ type, name: `${type}.pdf`, expiryDate: '2099-12-31' }))
  assert.equal(documentStatus(car), 'Complete')
  assert.deepEqual(vehicleReadiness(car), [])
})

test('missing details stay invalid, and API serialization never invents seats or amounts', () => {
  const [row] = validateImport(matrix({ Type: '', Seats: '', Transmission: '', 'Fuel Type': '', 'Daily Rate (SAR)': '', Ownership: '', 'On-site?': '' }), [])
  for (const field of ['Type', 'Seats', 'Transmission', 'Fuel Type', 'Daily Rate (SAR)', 'Ownership', 'On-site?']) assert.ok(row.errors.some(error => error.startsWith(field)), field)
  const payload = vehiclePayload({ seats: '', dailyRate: '', year: '' })
  assert.equal(payload.seats, null)
  assert.equal(payload.dailyRate, null)
  assert.equal(payload.year, null)
  assert.equal(payload.insuranceExpiryDate, null)
})

test('older templates without optional columns still validate and duplicate checks remain active', async () => {
  const required = ['Make', 'Model', 'Registration Number', 'Year of Registration', 'Vehicle ID', 'Type', 'Seats', 'Transmission', 'Fuel Type', 'Daily Rate (SAR)']
  const rows = [required, required.map(column => values[column])]
  assert.deepEqual(validateImport(rows, [])[0].errors, [])
  assert.ok(validateImport(rows, [{ registration: values['Registration Number'].toLowerCase(), vehicleId: values['Vehicle ID'] }])[0].errors.some(error => /Duplicate/.test(error)))
  const parsed = await parseImportFile(file('template.csv', Buffer.from(templateCsv())))
  assert.deepEqual(validateImport(parsed, [])[0].errors, [])
})
