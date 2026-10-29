export const normalizeCustomerName = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
export function blankCustomer(type) {
  return type === 'Corporate' ? { name:'',registrationNumber:'',taxNumber:'',billingContactName:'',billingEmail:'',billingPhone:'',billingAddress:'',billingCity:'',billingCountry:'Saudi Arabia',paymentTerms:'Net 30 days',waitingRatePerHour:0,includedWaitingMinutes:0,waitingBillingIncrementMinutes:15,status:'Active' }
    : {name:'',phone:'',email:'',address:'',status:'Active'}
}
export function prepareCustomerForm(type, form, rows = [], initial = null) {
  const corporate = type === 'Corporate'
  const result = Object.fromEntries(Object.entries(form).map(([key,value]) => [key,typeof value === 'string' ? value.trim() : value]))
  result.name = String(result.name || '').replace(/\s+/g,' ')
  const phone = String(result[corporate ? 'billingPhone' : 'phone'] || '')
  const email = String(result[corporate ? 'billingEmail' : 'email'] || '').toLowerCase()
  if (!result.name || !phone || !email) throw new Error('Complete the name, phone, and email.')
  if (result.name.length > 150 || phone.length > 40 || email.length > 150) throw new Error('Name and email must be at most 150 characters; phone at most 40.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
  if (rows.some(row => row.id !== initial?.id && row.type === type && normalizeCustomerName(row.name) === normalizeCustomerName(result.name))) throw new Error('This customer name already exists. Select the existing customer.')
  result[corporate ? 'billingPhone' : 'phone'] = phone
  result[corporate ? 'billingEmail' : 'email'] = email
  result.status = result.status || 'Active'
  if (!['Active','Inactive'].includes(result.status)) throw new Error('Choose Active or Inactive status.')
  if (corporate) {
    for (const [key,fallback] of Object.entries({waitingRatePerHour:0,includedWaitingMinutes:0,waitingBillingIncrementMinutes:15})) {
      result[key] = result[key] === '' || result[key] == null ? fallback : Number(result[key])
      if (!Number.isFinite(result[key]) || result[key] < (key === 'waitingBillingIncrementMinutes' ? 1 : 0) || (key !== 'waitingRatePerHour' && !Number.isInteger(result[key]))) throw new Error('Enter a non-negative waiting rate, whole included minutes and a positive whole billing increment.')
    }
    if (Math.abs(result.waitingRatePerHour * 100 - Math.round(result.waitingRatePerHour * 100)) > 0.000001) throw new Error('Waiting rate can have at most two decimal places.')
  }
  return result
}
export function requireCorporateCustomer(companies, id) {
  const customer = companies.find(item => Number.isInteger(Number(id)) && Number(id)>0 && item.id === Number(id))
  if (!customer || customer.type !== 'Corporate') throw new Error('Select an existing corporate customer, or use Add Corporate Customer first.')
  if (customer.status !== 'Active') throw new Error('This corporate customer is inactive. Activate it in Customers before booking.')
  return customer
}
