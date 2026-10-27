import test from 'node:test'
import assert from 'node:assert/strict'
import { currentPayrollMonth, effectiveProfile, payrollPreview, profileError, cents } from '../src/features/payroll/PayrollData.js'
import { canReadPage, canWritePage } from '../src/features/auth/permissions.js'
import { changeRolePermission } from '../src/features/auth/RoleData.js'

const profile = { basicSalary: '800', fixedBankAmount: '800', components: [{ name: 'Food', amount: '400', settlement: 'CASH' }, { name: 'Profession', amount: '300', settlement: 'CASH' }, { name: 'Performance', amount: '300', settlement: 'CASH' }] }
test('bank allocation is part of entitlement, never a deduction', () => {
  assert.deepEqual(payrollPreview(profile), { cashEarnings: 1800, benefits: 0, deductions: 0, netCash: 1800, fixedBankAmount: 800 })
})
test('cash, bank and noncash adjustments remain separate with exact decimal calculations', () => {
  const result = payrollPreview({ ...profile, components: [...profile.components, { name: 'Room', amount: '500', settlement: 'BENEFIT' }] }, [{ kind: 'ADDITION', amount: '0.10', settlement: 'BANK' }, { kind: 'ADDITION', amount: '0.20', settlement: 'CASH' }, { kind: 'DEDUCTION', amount: '100', settlement: 'CASH' }])
  assert.equal(result.cashEarnings, 1800.3); assert.equal(result.netCash, 1700.3); assert.equal(result.benefits, 500)
})
test('missing, negative, excessive precision and negative net amounts cannot preview', () => {
  for (const value of ['', null, '***', '-1', '0.001', '1e3']) assert.throws(() => cents(value))
  assert.throws(() => payrollPreview(profile, [{ kind: 'DEDUCTION', amount: '1800.01' }]))
  assert.equal(cents('0'), 0)
})
test('profile validation flags bank targets and repeated names', () => {
  assert.match(profileError({ ...profile, fixedBankAmount: '1801' }), /bank allocation/)
  assert.match(profileError({ ...profile, components: [{ name: 'Food', amount: '1', settlement: 'CASH' }, { name: ' food ', amount: '2', settlement: 'CASH' }] }), /different name/)
})
test('effective salary version uses selected KSA calendar month', () => {
  const profiles = [{ id: 1, payeeId: 7, details: { effectiveMonth: '2026-07' } }, { id: 2, payeeId: 7, details: { effectiveMonth: '2026-08' } }]
  assert.equal(effectiveProfile(profiles, 7, '2026-06'), undefined)
  assert.equal(effectiveProfile(profiles, 7, '2026-07').id, 1)
  assert.equal(effectiveProfile(profiles, 7, '2026-09').id, 2)
  assert.equal(currentPayrollMonth(new Date('2026-07-31T21:30:00Z')), '2026-08')
})
test('payroll permissions are independent of invoices and discoverable in role editor', () => {
  assert.equal(canReadPage({ permissions: ['invoices.read'] }, 'Payroll'), false)
  assert.equal(canReadPage({ permissions: ['payroll.read'] }, 'Payroll'), true)
  assert.equal(canWritePage({ permissions: ['payroll.read', 'payroll.create'] }, 'Payroll'), true)
  const role = changeRolePermission({ permissions: [] }, 'payroll.edit', true)
  assert.ok(role.permissions.includes('payroll.read'))
  assert.ok(!changeRolePermission(role, 'payroll.read', false).permissions.includes('payroll.edit'))
})
