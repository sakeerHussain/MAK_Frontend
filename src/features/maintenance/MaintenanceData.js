export const WORK_TYPES = ['Maintenance Log', 'Accident & Repair Log']
export const JOB_STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled']
export const EXPENSE_CATEGORIES = ['Spare Parts', 'Workshop Labor', 'Workshop Other', 'Other']
export const COMPLETED_TASKS = ['General service', 'Oil', 'Tyres', 'Brakes']

export const WORK_ITEMS = {
  'Maintenance Log': [
    'Oil & Filter Change', 'Engine Air Filter', 'Fuel Filter', 'Wiper Blades',
    'Battery Change', 'Tire Change', 'Tire Rotation', 'Wheel Alignment',
    'Wheel Balancing', 'Brake Service', 'Transmission Oil', 'Differential Oil',
    'AC Service', 'General Service', 'Others',
  ],
  'Accident & Repair Log': ['Body Repair', 'Engine Repair', 'Suspension', 'Electrical', 'Windshield'],
}

const FLEET_SCHEDULE_KEYS = {
  'General service': ['lastServiceKm', 'serviceIntervalKm'],
  Oil: ['lastOilKm', 'oilIntervalKm'],
  Tyres: ['lastTyreKm', 'tyreIntervalKm'],
  Brakes: ['lastBrakeKm', 'brakeIntervalKm'],
}
const WORK_ITEM_TASK = {
  'General Service': 'General service',
  'Oil & Filter Change': 'Oil',
  'Tire Change': 'Tyres',
  'Brake Service': 'Brakes',
}

export const tasksCompletedFor = (job) => job.status !== 'Completed' ? [] : Array.isArray(job.completedTasks)
  ? job.completedTasks
  : WORK_ITEM_TASK[job.workItem] ? [WORK_ITEM_TASK[job.workItem]] : []

export const isActiveJob = (job) => job.status === 'Open' || job.status === 'In Progress'
export const todayLocal = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export const blankMaintenanceJob = () => ({
  id: null, jobId: '', vehicleId: '', workType: 'Maintenance Log', workItem: '', status: 'Open',
  serviceDate: todayLocal(), odometerKm: '', garage: '', nextServiceDate: '', nextServiceOdometerKm: '',
  notes: '', expenseLines: [], completedTasks: [],
})

export const blankExpenseLine = () => ({ id: crypto.randomUUID(), category: 'Spare Parts', amount: '', description: '', receipt: null })

export const expenseTotal = (lines = []) => lines.reduce((cents, line) => {
  const amount = Number(line.amount)
  return cents + (Number.isFinite(amount) ? Math.round(amount * 100) : 0)
}, 0) / 100

export const formatExpense = (value) => `SAR ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function nextMaintenanceId(jobs) {
  const next = Math.max(0, ...jobs.map((job) => Number(job.jobId?.match(/\d+/)?.[0]) || 0)) + 1
  return `MNT-${String(next).padStart(4, '0')}`
}

export const vehicleHasActiveAssignment = (vehicleId, bookings = [], trips = []) =>
  [...bookings, ...trips].some((booking) => Number(booking.vehicleId) === Number(vehicleId) && booking.status === 'Active')

export function validateMaintenanceJob(job, vehicles, bookings = [], trips = []) {
  const vehicle = vehicles.find((item) => item.id === Number(job.vehicleId))
  const hasValue = (value) => value !== '' && value !== null && value !== undefined
  if (!vehicle) return 'Select a vehicle from Fleet.'
  if (!WORK_TYPES.includes(job.workType)) return 'Choose a valid work type.'
  if (!WORK_ITEMS[job.workType].includes(job.workItem)) return 'Choose a work item from the selected log.'
  if (!JOB_STATUSES.includes(job.status)) return 'Choose a valid job status.'
  if (!job.serviceDate) return `Enter the ${job.workType === 'Maintenance Log' ? 'service' : 'repair'} date.`
  if (hasValue(job.odometerKm) && (!Number.isInteger(Number(job.odometerKm)) || Number(job.odometerKm) < 0)) return 'Odometer must be a whole number of kilometres, zero or greater.'
  if (job.status === 'Completed' && !hasValue(job.odometerKm)) return 'Odometer is required when a job is completed.'
  if (job.status === 'Completed' && (!Array.isArray(job.completedTasks) || job.completedTasks.some((task) => !COMPLETED_TASKS.includes(task)) || new Set(job.completedTasks).size !== job.completedTasks.length)) return 'Choose valid completed tasks.'
  if (job.workType === 'Maintenance Log') {
    if (job.nextServiceDate && job.nextServiceDate < job.serviceDate) return 'Next service date cannot be before the service date.'
    if (hasValue(job.nextServiceOdometerKm) && !hasValue(job.odometerKm)) return 'Enter the job odometer before setting the next service odometer.'
    if (hasValue(job.nextServiceOdometerKm) && (!Number.isInteger(Number(job.nextServiceOdometerKm)) || Number(job.nextServiceOdometerKm) <= Number(job.odometerKm))) return 'Next service odometer must be greater than the job odometer.'
  }
  for (const [index, line] of (job.expenseLines || []).entries()) {
    if (!EXPENSE_CATEGORIES.includes(line.category)) return `Choose a valid category for expense line ${index + 1}.`
    if (line.amount === '' || line.amount === null || !Number.isFinite(Number(line.amount)) || Number(line.amount) <= 0 || !/^\d+(\.\d{1,2})?$/.test(String(line.amount))) return `Enter a positive amount with up to two decimal places for expense line ${index + 1}.`
    if (!line.description?.trim()) return `Enter a description for expense line ${index + 1}.`
  }
  if (isActiveJob(job) && (vehicleHasActiveAssignment(vehicle.id, bookings, trips) || vehicle.status === 'In Use')) return 'This vehicle has an active rental or trip. Complete the assignment before opening maintenance.'
  return ''
}

export function reconcileMaintenanceFleet(vehicles, beforeJobs, afterJobs, completedJob = null, bookings = [], trips = []) {
  return vehicles.map((vehicle) => {
    const wasActive = beforeJobs.some((job) => Number(job.vehicleId) === vehicle.id && isActiveJob(job))
    const isActive = afterJobs.some((job) => Number(job.vehicleId) === vehicle.id && isActiveJob(job))
    let updated = vehicle

    if (isActive && !wasActive) {
      updated = { ...updated, maintenanceReturnStatus: updated.maintenanceReturnStatus || updated.status, status: 'Under Maintenance' }
    } else if (isActive && updated.status !== 'Under Maintenance') {
      updated = { ...updated, status: 'Under Maintenance' }
    } else if (wasActive && !isActive) {
      const status = vehicleHasActiveAssignment(vehicle.id, bookings, trips) ? 'In Use' : updated.maintenanceReturnStatus || 'Available'
      const { maintenanceReturnStatus: _previous, ...rest } = updated
      void _previous
      updated = { ...rest, status }
    }

    if (completedJob?.status === 'Completed' && Number(completedJob.vehicleId) === vehicle.id && completedJob.odometerKm !== '') {
      const reading = Number(completedJob.odometerKm)
      updated = { ...updated, currentOdometerKm: Math.max(Number(updated.currentOdometerKm) || 0, reading) }
      for (const task of tasksCompletedFor(completedJob)) {
        const keys = FLEET_SCHEDULE_KEYS[task]
        if (keys && reading >= (Number(updated[keys[0]]) || 0)) {
          updated[keys[0]] = reading
          if (completedJob.workType === 'Maintenance Log' && WORK_ITEM_TASK[completedJob.workItem] === task && completedJob.nextServiceOdometerKm !== '' && completedJob.nextServiceOdometerKm !== null && completedJob.nextServiceOdometerKm !== undefined) updated[keys[1]] = Number(completedJob.nextServiceOdometerKm) - reading
        }
      }
    }
    return updated
  })
}
