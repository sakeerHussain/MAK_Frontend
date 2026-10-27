export const settlementLabels = { BANK: 'Bank', CASH: 'Cash', BENEFIT: 'Company-provided benefit' }
export function currentPayrollMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit' }).formatToParts(date)
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`
}
export const monthLabel = month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' }).format(new Date(`${month}-01T12:00:00+03:00`)) : 'Choose a month'
export const effectiveProfile = (profiles, payeeId, period) => profiles.filter(p => p.payeeId === payeeId && p.details.effectiveMonth <= period).sort((a, b) => b.details.effectiveMonth.localeCompare(a.details.effectiveMonth))[0]
export const blankProfile = (person, period) => ({ version: null, staffType: person.staffType, staffId: person.staffId, effectiveMonth: period, basicSalary: '', fixedBankAmount: '', accountName: '', bankName: '', iban: '', accountNumber: '', components: [], notes: '' })
export const blankAdjustment = () => ({ name: '', kind: 'ADDITION', amount: '', settlement: 'CASH', reason: '' })

// Integer minor units mirror the server's decimal arithmetic for the form preview.
export function cents(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Enter non-negative SAR amounts with at most two decimal places.')
  const [whole, fraction = ''] = text.split('.')
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(result) || result > 999999999999) throw new Error('A salary amount is too large.')
  return result
}
export function payrollPreview(profile, adjustments = []) {
  let cash = cents(profile.basicSalary), benefits = 0, deductions = 0
  const bank = cents(profile.fixedBankAmount)
  for (const c of profile.components) { if (c.settlement === 'BENEFIT') benefits += cents(c.amount); else cash += cents(c.amount) }
  for (const a of adjustments) {
    if (a.kind === 'DEDUCTION') deductions += cents(a.amount)
    else if (a.settlement === 'BENEFIT') benefits += cents(a.amount)
    else cash += cents(a.amount)
  }
  if (deductions > cash) throw new Error('Deductions cannot exceed cash earnings.')
  return { cashEarnings: cash / 100, benefits: benefits / 100, deductions: deductions / 100, netCash: (cash - deductions) / 100, fixedBankAmount: bank / 100 }
}
export function profileError(data) {
  try {
    const totals = payrollPreview(data)
    if (totals.fixedBankAmount > totals.netCash) return 'Fixed bank allocation cannot exceed recurring cash earnings.'
    const names = new Set()
    for (const component of data.components) {
      const name = component.name.trim().toLowerCase()
      if (!name) return 'Name every recurring salary component.'
      if (names.has(name)) return 'Use a different name for each recurring component.'
      names.add(name)
    }
    return ''
  } catch (error) { return error.message }
}
