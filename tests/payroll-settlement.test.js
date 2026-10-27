import test from 'node:test'
import assert from 'node:assert/strict'
import { settlementSummary, ksaToday, payrollDate, receiptError } from '../src/features/payroll/PayrollSettlementData.js'
import { canWritePage, actionPermissions } from '../src/features/auth/permissions.js'
import { changeRolePermission } from '../src/features/auth/RoleData.js'

test('summary excludes drafts and benefits from approved payable, and uses actual recorded payments', () => {
  const records = [{ approvalId: null, totals: { netCash: 999, benefits: 500 }, paid: 0 }, { approvalId: 1, approvedNetCash: 1800, bankPaid: 800, cashPaid: 0, paid: 800, outstanding: 1000 }]
  assert.deepEqual(settlementSummary(records), { approvedNet: 1800, paid: 800, outstanding: 1000, drafts: 1 })
  assert.deepEqual(settlementSummary([]), { approvedNet: 0, paid: 0, outstanding: 0, drafts: 0 })
})
test('summary handles decimal amounts without adding binary floating point errors', () => {
  assert.deepEqual(settlementSummary([{ approvalId:1,approvedNetCash:0.1,paid:0.1,outstanding:0 },{approvalId:2,approvedNetCash:0.2,paid:0.1,outstanding:0.1}]),{approvedNet:0.3,paid:0.2,outstanding:0.1,drafts:0})
})
test('payment dates use the KSA calendar boundary independently of browser timezone', () => {
  assert.equal(ksaToday(new Date('2026-07-31T21:30:00Z')), '2026-08-01')
  assert.equal(payrollDate('2026-07-31'), '31 Jul 2026')
})
test('receipt input validates type, size and empty uploads', () => {
  assert.equal(receiptError({size:120,type:'application/pdf'}), '')
  assert.match(receiptError({size:0,type:'image/png'}), /non-empty/)
  assert.match(receiptError({size:6*1024*1024,type:'application/pdf'}), /5 MB/)
  assert.match(receiptError({size:100,type:'text/html'}), /PDF/)
})
test('approval, payment and correction actions are available independently of draft editing', () => {
  for (const permission of ['payroll.approve','payroll.pay','payroll.correct']) {
    assert.equal(canWritePage({permissions:['payroll.read',permission]}, 'Payroll'), true)
    const granted = changeRolePermission({permissions:[]},permission,true)
    assert.ok(granted.permissions.includes('payroll.read'))
    assert.ok(!changeRolePermission(granted,'payroll.read',false).permissions.includes(permission))
  }
  assert.equal(canWritePage({permissions:['payroll.read']},'Payroll'), false)
  assert.deepEqual(actionPermissions('Review & approve payroll','payroll'), ['payroll.approve'])
  assert.deepEqual(actionPermissions('Record salary payment','payroll'), ['payroll.pay'])
  assert.deepEqual(actionPermissions('Reopen payroll for correction','payroll'), ['payroll.correct'])
  assert.deepEqual(actionPermissions('Discard draft','payroll'), ['payroll.archive'])
})
