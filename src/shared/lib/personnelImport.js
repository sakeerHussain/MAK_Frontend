// Optional profile columns shared by driver and employee bulk uploads.
export const PERSONNEL_PROFILE_COLUMNS = {
  Nationality: ['nationality', 'text'], 'Iqama Expiry Date': ['iqamaExpiry', 'date'],
  'Years Experience': ['yearsExperience', 'number'], 'Company ID': ['companyId', 'text'],
  'Official Number': ['officialNumber', 'text'], 'Hourly Rate (SAR)': ['hourlyRate', 'number'],
  'Passport No.': ['passportNumber', 'text'], 'Passport Expiry Date': ['passportExpiry', 'date'],
  'Contract ID': ['contractId', 'text'], 'Contract Expiry Date': ['contractExpiry', 'date'],
  'Driving Licence No.': ['licenceNumber', 'text'], 'Driving Licence Expiry Date': ['licenceExpiry', 'date'],
  'Blood Group': ['bloodGroup', 'text'], 'Insurance Policy No.': ['insuranceNumber', 'text'],
  'Insurance Expiry Date': ['insuranceExpiry', 'date'], 'Emergency KSA Contact': ['emergencyKsa', 'text'],
  'Home-country Contact': ['emergencyHome', 'text'], 'Home Address': ['homeAddress', 'text'],
}
const dateColumns = ['Join Date', ...Object.entries(PERSONNEL_PROFILE_COLUMNS).filter(([, [, type]]) => type === 'date').map(([column]) => column)]
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value

export function personnelProfile(values, additional = {}) {
  const fields = {}, errors = []
  for (const [column, [field, type]] of Object.entries({ ...PERSONNEL_PROFILE_COLUMNS, ...additional })) {
    const value = values[column]
    if (!value) continue
    fields[field] = type === 'number' ? Number(value) : value
    if (type === 'date' && !validDate(value)) errors.push(`${column} must be a valid YYYY-MM-DD date`)
    if (type === 'number' && (!Number.isFinite(fields[field]) || fields[field] < 0)) errors.push(`${column} must be a non-negative number`)
    if (field === 'yearsExperience' && (!Number.isInteger(fields[field]) || fields[field] > 80)) errors.push('Years Experience must be a whole number from 0 to 80')
  }
  return { fields, errors }
}

export function normalizePersonnelExcelDates(rows, workbook, XLSX) {
  const raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header:1, defval:'', raw:true, blankrows:false })
  for (const column of dateColumns) {
    const index = rows[0]?.findIndex(header => String(header).trim() === column) ?? -1
    if (index < 0) continue
    rows.slice(1).forEach((row, offset) => {
      const value = raw[offset+1]?.[index]
      if (typeof value !== 'number') return
      const date = XLSX.SSF.parse_date_code(value, { date1904:Boolean(workbook.Workbook?.WBProps?.date1904) })
      row[index] = date ? `${String(date.y).padStart(4,'0')}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}` : String(value)
    })
  }
}
