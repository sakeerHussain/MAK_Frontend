import test from 'node:test'
import assert from 'node:assert/strict'
import { ATTACHMENT_TYPES, blankVendor, makeDemoVendors, nextVendorId, primaryContact, validateVendor, vendorReferenceCount } from '../src/features/vendors/VendorData.js'

const validVendor = () => {
  const vendor = blankVendor()
  vendor.name = 'Test Transport'
  vendor.commission = '12.5'
  vendor.contacts[0] = { ...vendor.contacts[0], name: 'Amina', mobile: '+966 50 123 4567', email: 'amina@example.com' }
  return vendor
}

test('vendor IDs advance from the highest existing ID', () => {
  assert.equal(nextVendorId(makeDemoVendors()), 'VEN-006')
})

test('primary contact supplies the table contact and phone', () => {
  const vendor = validVendor()
  assert.deepEqual([primaryContact(vendor).name, primaryContact(vendor).mobile], ['Amina', '+966 50 123 4567'])
})

test('validation accepts repeatable contacts and supported attachments', () => {
  const vendor = validVendor()
  vendor.contacts.push({ id: 'two', name: 'Omar', mobile: '+966 50 123 4568', email: '' })
  vendor.vatNumber = '123456789012345'
  vendor.contractStart = '2026-01-01'
  vendor.contractEnd = '2026-12-31'
  assert.equal(validateVendor(vendor), '')
  assert.deepEqual(ATTACHMENT_TYPES, ['Company Profile', 'CR Copy', 'VAT Certificate', 'Bank IBAN', 'National Address'])
})

test('validation rejects invalid VAT, commission, contacts, dates and duplicates', () => {
  const vendor = validVendor()
  vendor.vatNumber = '1234'
  assert.match(validateVendor(vendor), /15 digits/)
  vendor.vatNumber = ''
  vendor.commission = 101
  assert.match(validateVendor(vendor), /between 0 and 100/)
  vendor.commission = 10
  vendor.contacts[0].mobile = '123'
  assert.match(validateVendor(vendor), /valid mobile/)
  vendor.contacts[0].mobile = '+966 50 123 4567'
  vendor.contractStart = '2026-12-31'
  vendor.contractEnd = '2026-01-01'
  assert.match(validateVendor(vendor), /end date/)
  vendor.contractEnd = ''
  assert.match(validateVendor(vendor, [{ ...vendor, id: 1, name: 'test transport' }]), /already exists/)
})

test('linked fleet and personnel records are counted before deletion', () => {
  const vendor = validVendor()
  assert.equal(vendorReferenceCount(vendor,
    [{ ownership: 'Vendor', vendor: ' test transport ' }, { ownership: 'Owned', vendor: 'Test Transport' }],
    [{ employmentType: 'Vendor', vendor: 'TEST TRANSPORT' }],
    [{ employmentType: 'Vendor', vendor: 'Other Vendor' }],
  ), 2)
})
