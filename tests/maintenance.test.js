import test from 'node:test'
import assert from 'node:assert/strict'
import { blankMaintenanceJob, COMPLETED_TASKS, expenseTotal, isActiveJob, nextMaintenanceId, reconcileMaintenanceFleet, tasksCompletedFor, validateMaintenanceJob, WORK_ITEMS } from '../src/features/maintenance/MaintenanceData.js'

const car = { id: 1, make: 'Toyota', model: 'Camry', registration: 'RNT-1001', status: 'Available', currentOdometerKm: 28000, lastServiceKm: 25000, serviceIntervalKm: 10000, lastOilKm: 25000, oilIntervalKm: 10000, lastTyreKm: 10000, tyreIntervalKm: 40000, lastBrakeKm: 10000, brakeIntervalKm: 30000 }
const job = (overrides = {}) => ({ ...blankMaintenanceJob(), id: 1, jobId: 'MNT-0001', vehicleId: 1, workType: 'Maintenance Log', workItem: 'Oil & Filter Change', status: 'Open', serviceDate: '2026-10-04', ...overrides })

test('both log dropdowns contain the requested items', () => {
  assert.equal(WORK_ITEMS['Maintenance Log'].length, 15)
  assert.equal(WORK_ITEMS['Maintenance Log'][0], 'Oil & Filter Change')
  assert.equal(WORK_ITEMS['Maintenance Log'].at(-1), 'Others')
  assert.deepEqual(WORK_ITEMS['Accident & Repair Log'], ['Body Repair', 'Engine Repair', 'Suspension', 'Electrical', 'Windshield'])
  assert.equal(nextMaintenanceId([{ jobId: 'MNT-0004' }]), 'MNT-0005')
})

test('completed jobs require odometer and next service must follow its baseline', () => {
  assert.match(validateMaintenanceJob(job({ status: 'Completed' }), [car]), /Odometer is required/)
  assert.match(validateMaintenanceJob(job({ odometerKm: '', nextServiceOdometerKm: '40000' }), [car]), /Enter the job odometer/)
  assert.match(validateMaintenanceJob(job({ odometerKm: '30000', nextServiceOdometerKm: '30000' }), [car]), /must be greater/)
  assert.equal(validateMaintenanceJob(job({ status: 'Completed', odometerKm: '30000', nextServiceOdometerKm: '40000' }), [car]), '')
})

test('active rentals cannot be placed into an open maintenance job', () => {
  assert.match(validateMaintenanceJob(job(), [car], [{ vehicleId: 1, status: 'Active' }]), /active rental or trip/)
  assert.equal(validateMaintenanceJob(job({ status: 'Completed', odometerKm: '30000' }), [car], [{ vehicleId: 1, status: 'Active' }]), '')
})

test('open job reserves car and completing it restores status and updates oil schedule', () => {
  const open = job()
  const reserved = reconcileMaintenanceFleet([car], [], [open])
  assert.equal(reserved[0].status, 'Under Maintenance')
  assert.equal(reserved[0].maintenanceReturnStatus, 'Available')
  const complete = job({ status: 'Completed', odometerKm: 30000, nextServiceOdometerKm: 40000, completedTasks: ['Oil'] })
  const released = reconcileMaintenanceFleet(reserved, [open], [complete], complete)
  assert.equal(released[0].status, 'Available')
  assert.equal(released[0].maintenanceReturnStatus, undefined)
  assert.equal(released[0].currentOdometerKm, 30000)
  assert.equal(released[0].lastOilKm, 30000)
  assert.equal(released[0].oilIntervalKm, 10000)
  assert.equal(released[0].lastServiceKm, 25000)
})

test('one completed job cannot release a vehicle with another open job', () => {
  const first = job()
  const second = job({ id: 2, jobId: 'MNT-0002', workItem: 'Brake Service' })
  const reserved = reconcileMaintenanceFleet([car], [], [first, second])
  const done = { ...first, status: 'Completed', odometerKm: 30000 }
  const result = reconcileMaintenanceFleet(reserved, [first, second], [done, second], done)
  assert.equal(result[0].status, 'Under Maintenance')
  assert.equal(isActiveJob(second), true)
})

test('repair completion does not alter service intervals or reduce odometer', () => {
  const repair = job({ workType: 'Accident & Repair Log', workItem: 'Body Repair', status: 'Completed', odometerKm: 27000 })
  const result = reconcileMaintenanceFleet([car], [], [repair], repair)
  assert.equal(result[0].currentOdometerKm, 28000)
  assert.equal(result[0].lastOilKm, 25000)
  assert.equal(result[0].oilIntervalKm, 10000)
})

test('only checked completed tasks reset their Fleet readings', () => {
  assert.deepEqual(COMPLETED_TASKS, ['General service', 'Oil', 'Tyres', 'Brakes'])
  const complete = job({ status: 'Completed', odometerKm: 32000, completedTasks: ['General service', 'Tyres', 'Brakes'] })
  const updated = reconcileMaintenanceFleet([car], [], [complete], complete)[0]
  assert.equal(updated.lastServiceKm, 32000)
  assert.equal(updated.lastTyreKm, 32000)
  assert.equal(updated.lastBrakeKm, 32000)
  assert.equal(updated.lastOilKm, 25000)
  assert.equal(updated.oilIntervalKm, 10000)
  assert.deepEqual(tasksCompletedFor(complete), complete.completedTasks)
})

test('work item alone does not reset a counter on a new completed job', () => {
  const complete = job({ status: 'Completed', odometerKm: 32000, completedTasks: [] })
  const updated = reconcileMaintenanceFleet([car], [], [complete], complete)[0]
  assert.equal(updated.currentOdometerKm, 32000)
  assert.equal(updated.lastOilKm, 25000)
  assert.equal(updated.oilIntervalKm, 10000)
  assert.match(validateMaintenanceJob({ ...complete, completedTasks: ['Unknown'] }, [car]), /valid completed tasks/)
})

test('multiple expense lines total in SAR cents and require valid category, amount, and description', () => {
  const expenseLines = [
    { id: 'a', category: 'Spare Parts', amount: '12.35', description: 'Oil filter', receipt: null },
    { id: 'b', category: 'Workshop Labor', amount: '20.10', description: 'Fitting', receipt: { name: 'receipt.pdf' } },
  ]
  assert.equal(expenseTotal(expenseLines), 32.45)
  assert.equal(validateMaintenanceJob(job({ expenseLines }), [car]), '')
  assert.match(validateMaintenanceJob(job({ expenseLines: [{ ...expenseLines[0], category: 'Unknown' }] }), [car]), /valid category/)
  assert.match(validateMaintenanceJob(job({ expenseLines: [{ ...expenseLines[0], amount: '12.345' }] }), [car]), /positive amount/)
  assert.match(validateMaintenanceJob(job({ expenseLines: [{ ...expenseLines[0], description: '' }] }), [car]), /description/)
})
