import { useState } from 'react'
import Icon from '../../app/Icon.jsx'
import FormFieldCaption from '../../shared/components/FormFieldCaption.jsx'
import { prepareUpload } from '../../shared/lib/upload.js'
import { downloadReceipt } from './MaintenanceFiles.js'
import { blankExpenseLine, blankMaintenanceJob, COMPLETED_TASKS, EXPENSE_CATEGORIES, expenseTotal, formatExpense, JOB_STATUSES, validateMaintenanceJob, WORK_ITEMS, WORK_TYPES } from './MaintenanceData.js'

export default function MaintenanceForm({ initial, vehicles, bookings, trips, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...blankMaintenanceJob(), ...initial, vehicleId: String(initial?.vehicleId || ''), odometerKm: initial?.odometerKm ?? '', nextServiceOdometerKm: initial?.nextServiceOdometerKm ?? '', expenseLines: initial?.expenseLines?.map((line) => ({ ...line })) || [], completedTasks: [...(initial?.completedTasks || [])] }))
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [receiptError, setReceiptError] = useState('')
  const [busyReceipt, setBusyReceipt] = useState(null)
  const matchingVehicles = vehicles.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.registration} ${vehicle.vehicleId || ''}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase()))
  const shownVehicles = matchingVehicles.slice(0, 30)
  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === form.vehicleId)
  if (selectedVehicle && !shownVehicles.some((vehicle) => vehicle.id === selectedVehicle.id)) shownVehicles.unshift(selectedVehicle)
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }
  const setStatus = (status) => { setForm((current) => ({ ...current, status, completedTasks: status === 'Completed' ? current.completedTasks : [] })); setError('') }
  const toggleCompletedTask = (task) => { setForm((current) => ({ ...current, completedTasks: current.completedTasks.includes(task) ? current.completedTasks.filter((item) => item !== task) : [...current.completedTasks, task] })); setError('') }
  const setExpenseLine = (id, key, value) => { setForm((current) => ({ ...current, expenseLines: current.expenseLines.map((line) => line.id === id ? { ...line, [key]: value } : line) })); setError('') }
  const addExpenseLine = () => setForm((current) => ({ ...current, expenseLines: [...current.expenseLines, blankExpenseLine()] }))
  const removeExpenseLine = (id) => { setForm((current) => ({ ...current, expenseLines: current.expenseLines.filter((line) => line.id !== id) })); setReceiptError('') }
  const chooseReceipt = async (id, file) => {
    if (!file) return
    setBusyReceipt(id); setReceiptError('')
    try {
      const prepared = await prepareUpload(file, 'document')
      setExpenseLine(id, 'receipt', { ...prepared, file })
    } catch (reason) { setReceiptError(`Receipt: ${reason.message}`) }
    finally { setBusyReceipt(null) }
  }
  const changeWorkType = (workType) => {
    setForm((current) => ({ ...current, workType, workItem: '', nextServiceDate: '', nextServiceOdometerKm: '' }))
    setError('')
  }
  const submit = async (event) => {
    event.preventDefault()
    const problem = validateMaintenanceJob(form, vehicles, bookings, trips)
    if (problem) { setError(problem); return }
    setSaving(true)
    try {
      await onSave({
      ...form, vehicleId: Number(form.vehicleId), garage: form.garage.trim(), notes: form.notes.trim(), completedTasks: form.status === 'Completed' ? form.completedTasks : [],
      odometerKm: form.odometerKm === '' ? null : Number(form.odometerKm),
      nextServiceDate: form.workType === 'Maintenance Log' ? form.nextServiceDate : '',
      nextServiceOdometerKm: form.workType === 'Maintenance Log' && form.nextServiceOdometerKm !== '' ? Number(form.nextServiceOdometerKm) : null,
      expenseLines: form.expenseLines.map((line) => ({ ...line, amount: Number(line.amount), description: line.description.trim() })),
    })
    } catch (failure) { setError(failure.message) }
    finally { setSaving(false) }
  }
  return <form className="maintenance-form" onSubmit={submit} noValidate>
    <section className="maintenance-form-section"><h3>Vehicle & Job</h3><div className="maintenance-form-grid">
      <div className="maintenance-vehicle-picker"><label>Search Fleet<input type="search" value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Make, model, reg no., vehicle ID" /></label><label><FormFieldCaption required>Car</FormFieldCaption><select value={form.vehicleId} onChange={(event) => set('vehicleId', event.target.value)}><option value="">Select a car</option>{shownVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} ({vehicle.registration})</option>)}</select></label><small>{matchingVehicles.length > 30 ? `Showing first 30 of ${matchingVehicles.length} matches. Refine your search.` : `${matchingVehicles.length} matching cars`}</small></div>
      <label><FormFieldCaption required>Work type</FormFieldCaption><select value={form.workType} onChange={(event) => changeWorkType(event.target.value)}>{WORK_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label><FormFieldCaption required>{form.workType === 'Maintenance Log' ? 'Maintenance item' : 'Accident & repair item'}</FormFieldCaption><select value={form.workItem} onChange={(event) => set('workItem', event.target.value)}><option value="">Select an item</option>{WORK_ITEMS[form.workType].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><FormFieldCaption required>Status</FormFieldCaption><select value={form.status} onChange={(event) => setStatus(event.target.value)}>{JOB_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><small>Open and in-progress jobs make the car unavailable. A completed job requires an odometer reading.</small></label>
    </div></section>
    <section className="maintenance-form-section"><h3>Work Details</h3><div className="maintenance-form-grid">
      <label><FormFieldCaption required>{form.workType === 'Maintenance Log' ? 'Service date' : 'Repair date'}</FormFieldCaption><input type="date" value={form.serviceDate} onChange={(event) => set('serviceDate', event.target.value)} /></label>
      <label><FormFieldCaption required={form.status === 'Completed'}>Odometer (km)</FormFieldCaption><input type="number" min="0" step="1" value={form.odometerKm} onChange={(event) => set('odometerKm', event.target.value)} placeholder="Current reading" /></label>
      <label className="maintenance-wide">Garage / workshop<input value={form.garage} onChange={(event) => set('garage', event.target.value)} placeholder="Workshop or garage name" /></label>
    </div></section>
    {form.status === 'Completed' && <section className="maintenance-form-section"><h3>Tasks completed (resets km counters)</h3><p className="maintenance-form-help">Check what this visit reset. The completed odometer becomes the last reading for each selected Fleet schedule.</p><div className="maintenance-task-grid">{COMPLETED_TASKS.map((task) => <label className="maintenance-task-option" key={task}><input type="checkbox" checked={form.completedTasks.includes(task)} onChange={() => toggleCompletedTask(task)} /><span>{task}</span></label>)}</div></section>}
    {form.workType === 'Maintenance Log' && <section className="maintenance-form-section"><h3>Next Service</h3><p className="maintenance-form-help">Optional follow-up date and mileage. If the work item matches a checked task, the due mileage also updates that task’s Fleet interval.</p><div className="maintenance-form-grid">
      <label>Next service date<input type="date" min={form.serviceDate || undefined} value={form.nextServiceDate} onChange={(event) => set('nextServiceDate', event.target.value)} /></label>
      <label>Next service odometer (km)<input type="number" min="0" step="1" value={form.nextServiceOdometerKm} onChange={(event) => set('nextServiceOdometerKm', event.target.value)} placeholder="Optional due reading" /></label>
    </div></section>}
    <section className="maintenance-form-section"><h3>Notes</h3><label className="maintenance-notes-label">Notes<textarea rows="3" value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Work performed, findings, or follow-up instructions" /></label></section>
    <section className="maintenance-form-section"><div className="maintenance-section-heading"><div><h3>Expense Lines</h3><p className="maintenance-form-help">Add parts, labor, or other workshop costs. Amounts are in SAR.</p></div><button type="button" className="maintenance-secondary" onClick={addExpenseLine}><Icon name="plus" size={15} /> Add Line</button></div>
      <div className="maintenance-expense-lines">{form.expenseLines.map((line, index) => <div className="maintenance-expense-line" key={line.id}><div className="maintenance-expense-line-heading"><strong>Line {index + 1}</strong><button type="button" onClick={() => removeExpenseLine(line.id)}><Icon name="trash" size={14} /> Remove</button></div><div className="maintenance-form-grid">
        <label><FormFieldCaption required>Category</FormFieldCaption><select value={line.category} onChange={(event) => setExpenseLine(line.id, 'category', event.target.value)}>{EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label><FormFieldCaption required>Amount (SAR)</FormFieldCaption><input type="number" min="0.01" step="0.01" value={line.amount} onChange={(event) => setExpenseLine(line.id, 'amount', event.target.value)} placeholder="0.00" /></label>
        <label className="maintenance-wide"><FormFieldCaption required>Description</FormFieldCaption><input value={line.description} onChange={(event) => setExpenseLine(line.id, 'description', event.target.value)} placeholder="What was purchased or performed?" /></label>
      </div><div className="maintenance-receipt-row"><span>Receipt</span><label className="maintenance-receipt-picker"><Icon name="upload" size={16} /><span>{busyReceipt === line.id ? 'Preparing receipt...' : line.receipt?.name || 'Choose receipt'}</span><input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" aria-label={`Receipt for expense line ${index + 1}`} onChange={(event) => { chooseReceipt(line.id, event.target.files?.[0]); event.target.value = '' }} /></label>{line.receipt && <><button type="button" onClick={() => downloadReceipt(line.receipt)}><Icon name="download" size={14} /> Download</button><button type="button" onClick={() => setExpenseLine(line.id, 'receipt', null)}>Remove file</button></>}</div></div>)}</div>
      {!form.expenseLines.length && <p className="maintenance-expense-empty">No expense lines added yet.</p>}
      {receiptError && <p className="maintenance-form-error" role="alert">{receiptError}</p>}
      <div className="maintenance-expense-total"><span>Total Amount</span><strong>{formatExpense(expenseTotal(form.expenseLines))}</strong></div>
    </section>
    {error && <p className="maintenance-form-error" role="alert">{error}</p>}
    <div className="maintenance-form-actions"><button type="button" className="maintenance-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="maintenance-primary" disabled={saving || Boolean(busyReceipt)}><Icon name="check" size={16} /> {initial ? 'Save Changes' : 'Save Job'}</button></div>
  </form>
}
