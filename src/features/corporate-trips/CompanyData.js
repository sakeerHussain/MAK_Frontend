export const normalizeCompanyName = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()

export function makeDemoCompanies(trips) {
  const seen = new Set()
  return trips.filter((trip) => {
    const key = normalizeCompanyName(trip.companyName)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).map((trip, index) => ({
    id: index + 1,
    name: trip.companyName,
    registrationNumber: '', taxNumber: '', billingContactName: '', billingEmail: '', billingPhone: '',
    billingAddress: '', billingCity: '', billingCountry: '', paymentTerms: '',
    waitingRatePerHour: 0, includedWaitingMinutes: 0, waitingBillingIncrementMinutes: 15,
  }))
}
