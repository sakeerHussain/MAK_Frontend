import assert from 'node:assert/strict'
import { paymentFollowups, reportingDay, operationVehicle, scheduleLabel } from '../src/features/dashboard/DashboardPresentation.js'

const invoice = (id, status, dueDate, total, paid = 0) => ({ id, status, dueDate,
  lines: [{ quantity: 1, unitPrice: total, taxPercent: 0, discountPercent: 0 }],
  payments: paid ? [{ kind: 'Payment', amount: paid }] : [] })
const source = [invoice(1, 'Draft', '2026-10-01', 400), invoice(2, 'Voided', '2026-10-02', 100),
  invoice(3, 'Issued', '2026-10-03', 200, 200), invoice(4, 'Issued', '2026-10-24', 300),
  invoice(5, 'Issued', '2026-10-20', 250, 100), invoice(6, 'Issued', '2026-10-22', 450),
  invoice(7, 'Issued', '', 80), invoice(8, 'Issued', '2026-10-18', 0)]
const result = paymentFollowups(source, '2026-10-22')
assert.deepEqual(result.map((item) => item.invoice.id), [5, 6, 4, 7])
assert.equal(result[0].balance, 150)
assert.equal(result[0].overdue, true)
assert.equal(result[1].dueToday, true)
assert.equal(result[3].overdue, false)
assert.equal(source.length, 8, 'Presentation must not mutate invoice records')
assert.equal(reportingDay(new Date('2026-10-21T22:30:00Z')), '2026-10-22', 'Use KSA day at the UTC date boundary')
assert.equal(scheduleLabel('2026-10-22T16:30:00'), '22 Oct · 16:30')
const vehicles = [{ id: 10, make: 'Toyota', model: 'Camry', registration: 'ABC 123' }]
assert.deepEqual(operationVehicle({ id: 2, kind: 'Corporate', vehicleAssigned: true }, [{ id: 2, vehicleId: 99 }], [{ id: 2, vehicleId: 10 }], vehicles), { name: 'Toyota Camry', detail: 'ABC 123' })
assert.equal(operationVehicle({ id: 2, kind: 'Corporate', vehicleAssigned: false }, [], [{ id: 2, requestedType: 'SUV' }], []).name, 'SUV requested')
console.log('Dashboard payment priority, KSA reporting dates and cross-module vehicle presentation tests passed')
