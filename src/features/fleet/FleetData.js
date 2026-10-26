import { vehicleComplianceExpiries } from '../../shared/lib/rentalPolicy.js'
import { rentalDay } from '../../shared/lib/rentalTime.js'
const models = [
  ['Toyota', 'Camry', 'Sedan', 72], ['Honda', 'Civic', 'Sedan', 65],
  ['Hyundai', 'Tucson', 'SUV', 89], ['Kia', 'Sportage', 'SUV', 86],
  ['Ford', 'Transit', 'Van', 118], ['Tesla', 'Model 3', 'Electric', 128],
  ['Nissan', 'Altima', 'Sedan', 68], ['Jeep', 'Compass', 'SUV', 94],
  ['Mercedes-Benz', 'C-Class', 'Luxury', 155], ['Toyota', 'Hiace', 'Van', 125],
  ['BMW', '3 Series', 'Luxury', 160], ['Hyundai', 'Ioniq 5', 'Electric', 132],
]
const owners = ['Company Fleet', 'Northside Rentals', 'Airport Mobility', 'CityDrive Partners']
export const STATUS_OPTIONS = ['Available', 'In Use', 'Under Maintenance', 'Inactive']
export const DOCUMENT_OPTIONS = ['Complete', 'Missing', 'Expired']
export const TYPE_OPTIONS = ['Sedan', 'SUV', 'Van', 'Bus', 'Electric', 'Luxury']
export const TRANSMISSION_OPTIONS = ['Automatic', 'Manual']
export const FUEL_OPTIONS = ['Petrol', 'Diesel', 'Hybrid', 'Electric']
export const DOCUMENT_TYPES = ['Istimara', 'Insurance', 'Fahas', 'Others']
export const REQUIRED_DOCUMENT_TYPES = ['Istimara', 'Insurance', 'Fahas']
export const VENDORS = ['Northside Rentals', 'Airport Mobility', 'CityDrive Partners']
export const CUSTODIANS = ['Unassigned', 'Alex Morgan', 'Priya Shah', 'Samir Khan']

export function blankVehicle() {
  return {
    registration: '', make: '', model: '', year: String(new Date().getFullYear()),
    color: '', vehicleId: '', doorNo: '', chassisNo: '', type: 'Sedan', seats: '4',
    transmission: 'Automatic', fuelType: 'Petrol', featureTags: '',
    rateCurrency: 'SAR', hourlyRate: '', dailyRate: '', monthlyRate: '', ownership: 'Owned', vendor: '',
    status: 'Available', custodian: 'Unassigned', onSite: true,
    listedForBooking: true, showOnPublicSite: false,
    serviceIntervalKm: '', lastServiceKm: '', currentOdometerKm: '',
    oilIntervalKm: '', lastOilKm: '', tyreIntervalKm: '', lastTyreKm: '',
    brakeIntervalKm: '', lastBrakeKm: '', carImages: [], documentRecords: [],
    registrationExpiryDate: '', insuranceExpiryDate: '', inspectionExpiryDate: '',
  }
}

export function vehicleFormValues(initial, fromImportDraft = false) {
  const form = { ...blankVehicle(), ...initial }
  if (fromImportDraft) {
    for (const field of ['year', 'type', 'seats', 'transmission', 'fuelType', 'dailyRate', 'ownership']) form[field] = initial?.[field] ?? ''
    form.onSite = initial?.onSite ?? null
  }
  Object.keys(form).forEach(field => { if (field !== 'onSite' && form[field] == null) form[field] = '' })
  form.year = String(form.year)
  form.featureTags = Array.isArray(form.featureTags) ? form.featureTags.join(', ') : form.featureTags || ''
  return form
}

export function documentStatus(vehicle) {
  const records = vehicle.documentRecords || []
  const today = rentalDay(new Date())
  if (vehicleComplianceExpiries(vehicle).some((date) => date < today)) return 'Expired'
  if (!records.length && vehicle.documents) return vehicle.documents
  return REQUIRED_DOCUMENT_TYPES.every((type) => records.some((item) => item.type === type && item.name && item.expiryDate && item.expiryDate >= today)) ? 'Complete' : 'Missing'
}

export function vehicleOwner(vehicle) {
  if (vehicle.ownership === 'Vendor') return vehicle.vendor || 'Vendor'
  return vehicle.owner || (vehicle.ownership === 'Leased' ? 'Leased Fleet' : 'Company Fleet')
}

export function makeDemoVehicles() {
  const remaining = { Available: 284, 'In Use': 96, 'Under Maintenance': 25, Inactive: 15 }
  const pattern = ['Available', 'In Use', 'Available', 'Under Maintenance', 'Available', 'Inactive', 'Available', 'In Use']
  return Array.from({ length: 420 }, (_, index) => {
    const [make, model, type, baseRate] = models[index % models.length]
    const preferred = pattern[index % pattern.length]
    const status = remaining[preferred] > 0 ? preferred : STATUS_OPTIONS.find((option) => remaining[option] > 0)
    remaining[status] -= 1
    const dailyRate = baseRate + (index % 4) * 4
    const documents = status === 'Available' || status === 'In Use' ? 'Complete' : status === 'Under Maintenance' ? (index % 2 ? 'Missing' : 'Expired') : (index % 2 ? 'Expired' : 'Missing')
    return {
      ...blankVehicle(), id: index + 1, registration: `RNT-${String(index + 1001).padStart(4, '0')}`,
      vehicleId: `VH-${String(index + 1001).padStart(4, '0')}`, make, model,
      year: 2021 + (index % 5), type, seats: type === 'Van' ? 8 : 5,
      owner: owners[index % owners.length], ownership: index % 4 === 0 ? 'Owned' : 'Vendor',
      vendor: index % 4 === 0 ? '' : owners[index % owners.length],
      rate: dailyRate, dailyRate, hourlyRate: Math.round(dailyRate / 8), monthlyRate: dailyRate * 22,
      status, onSite: status === 'Available' ? true : status === 'In Use' ? false : index % 7 !== 0,
      documents, documentRecords: documents === 'Missing' ? [] : [
        { type: 'Istimara', name: 'istimara.pdf', expiryDate: documents === 'Expired' ? '2024-01-01' : '2030-12-31' },
        { type: 'Insurance', name: 'insurance.pdf', expiryDate: '2030-12-31' },
        { type: 'Fahas', name: 'fahas.pdf', expiryDate: '2030-12-31' },
      ], currentOdometerKm: 30000 + index * 47,
      serviceIntervalKm: 10000, lastServiceKm: 25000 + index * 47,
      oilIntervalKm: 10000, lastOilKm: 25000 + index * 47,
      tyreIntervalKm: 40000, lastTyreKm: 10000 + index * 47,
      brakeIntervalKm: 30000, lastBrakeKm: 10000 + index * 47,
    }
  })
}
