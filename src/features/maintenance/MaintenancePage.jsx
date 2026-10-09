import { saveMaintenanceJob } from './MaintenanceApi.js'
import { listVehicles } from '../fleet/FleetApi.js'
import { useState } from 'react'
import Icon from '../../app/Icon.jsx'
import MaintenanceForm from './MaintenanceForm.jsx'
import { downloadReceipt } from './MaintenanceFiles.js'
import { expenseTotal, formatExpense, isActiveJob, JOB_STATUSES, tasksCompletedFor, WORK_TYPES } from './MaintenanceData.js'
import './MaintenancePage.css'

const dateLabel = (value) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '—'
const reading = (value) => value === null || value === '' || value === undefined ? '—' : `${Number(value).toLocaleString('en-US')} km`
const statusClass = (status) => status.toLowerCase().replace(/\s+/g, '-')

function JobDetails({ job, vehicle, onClose, onEdit, onVehicle }) {
  const details = [
    ['Job ID', job.jobId], ['Car', vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : 'Vehicle unavailable'],
    ['Work type', job.workType], ['Work item', job.workItem], ['Status', job.status],
    [job.workType === 'Maintenance Log' ? 'Service date' : 'Repair date', dateLabel(job.serviceDate)],
    ['Odometer', reading(job.odometerKm)], ['Garage / workshop', job.garage || '—'],
    ...(job.status === 'Completed' ? [['Tasks completed', tasksCompletedFor(job).join(', ') || 'None selected']] : []),
    ...(job.workType === 'Maintenance Log' ? [['Next service date', dateLabel(job.nextServiceDate)], ['Next service odometer', reading(job.nextServiceOdometerKm)]] : []),
  ]
  return <div className="maintenance-detail"><div className="maintenance-detail-hero"><span className="maintenance-job-id">{job.jobId}</span><h3>{job.workItem}</h3><p>{vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}` : 'Vehicle unavailable'}</p><span className={`maintenance-status ${statusClass(job.status)}`}>{job.status}</span></div><dl className="maintenance-detail-list">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <section className="maintenance-detail-section"><h4>Notes</h4><p>{job.notes || 'No notes added.'}</p></section>
    <section className="maintenance-detail-section"><h4>Expense Lines</h4>{job.expenseLines?.length ? <div className="maintenance-detail-expenses">{job.expenseLines.map((line, index) => <div key={line.id || index}><span><strong>{line.category}</strong><small>{line.description}</small>{line.receipt && ((line.receipt.file || line.receipt.url) ? <button type="button" onClick={() => downloadReceipt(line.receipt)}><Icon name="download" size={14} /> {line.receipt.name}</button> : <small>Receipt: {line.receipt.name}</small>)}</span><b>{formatExpense(line.amount)}</b></div>)}</div> : <p>No expense lines added.</p>}<div className="maintenance-expense-total"><span>Total Amount</span><strong>{formatExpense(expenseTotal(job.expenseLines))}</strong></div></section>
    <div className="maintenance-form-actions"><button type="button" className="maintenance-secondary" onClick={onClose}>Close</button>{vehicle && <button type="button" className="maintenance-secondary" onClick={() => { onClose(); onVehicle(vehicle.id) }}><Icon name="fleet" size={16} /> View Car</button>}{isActiveJob(job) && <button type="button" className="maintenance-primary" onClick={onEdit}><Icon name="edit" size={16} /> Edit Job</button>}</div></div>
}

export default function MaintenancePage({ jobs, setJobs, vehicles, setVehicles, bookings, trips, loading, loadError, onReload, onViewVehicle }) {
  const [actionError, setActionError] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All work types')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const selected = jobs.find((job) => job.id === selectedId)
  const vehicleFor = (job) => vehicles.find((vehicle) => vehicle.id === job.vehicleId)
  const closeDialog = () => { setDialog(null); setSelectedId(null) }
  const openDialog = (kind, job = null) => { setSelectedId(job?.id || null); setDialog(kind) }
  const saveJob = async (job) => {
    const saved = await saveMaintenanceJob(job)
    setJobs((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
    setPage(1); closeDialog(); setActionError('')
    try { setVehicles(await listVehicles()) }
    catch (failure) { setActionError(`Job saved. Fleet refresh failed: ${failure.message}`) }
  }
  const sortOrder = { Open: 0, 'In Progress': 1, Completed: 2, Cancelled: 3 }
  const search = query.trim().toLowerCase()
  const filtered = jobs.filter((job) => {
    const vehicle = vehicleFor(job)
    return (!search || `${job.jobId} ${job.workItem} ${job.garage} ${vehicle?.registration || ''} ${vehicle?.make || ''} ${vehicle?.model || ''}`.toLowerCase().includes(search))
      && (typeFilter === 'All work types' || job.workType === typeFilter)
      && (statusFilter === 'All statuses' || job.status === statusFilter)
  }).sort((a, b) => sortOrder[a.status] - sortOrder[b.status] || b.serviceDate.localeCompare(a.serviceDate) || b.id - a.id)
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * 10, safePage * 10)
  const reset = () => { setQuery(''); setTypeFilter('All work types'); setStatusFilter('All statuses'); setPage(1) }
  const cards = [
    ['Total Jobs', jobs.length, 'All statuses', 'maintenance'],
    ['Open Jobs', jobs.filter((job) => job.status === 'Open').length, 'Open', 'alert'],
    ['In Progress', jobs.filter((job) => job.status === 'In Progress').length, 'In Progress', 'clock'],
    ['Completed', jobs.filter((job) => job.status === 'Completed').length, 'Completed', 'check'],
  ]
  if (loading || loadError) return <section className="maintenance-panel"><h2>{loading ? 'Loading maintenance...' : 'Unable to load maintenance'}</h2>{loadError && <p className="maintenance-form-error" role="alert">{loadError}</p>}{!loading && <button type="button" className="maintenance-primary" onClick={onReload}>Retry</button>}</section>
  return <div className="maintenance-page">
    {actionError && <p className="maintenance-form-error" role="alert">{actionError} <button type="button" onClick={onReload}>Refresh</button></p>}
    <div className="maintenance-intro"><div><span className="fleet-demo-mark">MAINTENANCE RECORDS</span><p>Record vehicle servicing and repairs, and track each job through completion.</p></div><button type="button" className="maintenance-primary" onClick={() => openDialog('add')}><Icon name="plus" size={17} /> Add Maintenance Job</button></div>
    <div className="maintenance-kpis">{cards.map(([label, count, filter, icon]) => <button key={label} type="button" className="maintenance-kpi" onClick={() => { setStatusFilter(filter); setPage(1) }}><span>{label}</span><div><strong>{count}</strong><Icon name={icon} size={20} /></div></button>)}</div>
    <section className="maintenance-panel"><div className="maintenance-panel-heading"><div><h2>Maintenance & Repair Log</h2><p>Open work appears first so vehicles needing attention stay visible.</p></div><span>{filtered.length} records</span></div>
      <div className="maintenance-toolbar"><label className="maintenance-search"><Icon name="search" size={17} /><input type="search" aria-label="Search maintenance jobs" placeholder="Search job, vehicle, work item, workshop..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label><select aria-label="Filter work type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1) }}><option>All work types</option>{WORK_TYPES.map((type) => <option key={type}>{type}</option>)}</select><select aria-label="Filter job status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}><option>All statuses</option>{JOB_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
      <div className="maintenance-table-scroll"><table className="maintenance-table"><thead><tr><th>Job ID</th><th>Car</th><th>Work type / item</th><th>Date</th><th>Garage / workshop</th><th>Odometer</th><th>Total (SAR)</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((job) => { const vehicle = vehicleFor(job); return <tr key={job.id}><td className="maintenance-job-id">{job.jobId}</td><td><button type="button" className="maintenance-car-link" onClick={() => vehicle && onViewVehicle(vehicle.id)} disabled={!vehicle}><strong>{vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle unavailable'}</strong><small>{vehicle?.registration || '—'}</small></button></td><td><strong>{job.workItem}</strong><small>{job.workType}</small></td><td>{dateLabel(job.serviceDate)}</td><td>{job.garage || '—'}</td><td>{reading(job.odometerKm)}</td><td className="maintenance-amount">{formatExpense(expenseTotal(job.expenseLines))}</td><td><span className={`maintenance-status ${statusClass(job.status)}`}>{job.status}</span></td><td><div className="maintenance-row-actions"><button type="button" onClick={() => openDialog('view', job)}><Icon name="eye" size={15} /> View</button>{isActiveJob(job) && <button type="button" aria-label={`Edit ${job.jobId}`} onClick={() => openDialog('edit', job)}><Icon name="edit" size={15} /></button>}</div></td></tr> })}</tbody></table>{!visible.length && <div className="maintenance-empty"><Icon name="maintenance" size={28} /><strong>{jobs.length ? 'No matching jobs' : 'No maintenance jobs yet'}</strong><p>{jobs.length ? 'Try different filters or search terms.' : 'Create the first service or repair record for a car in Fleet.'}</p><button type="button" className="maintenance-secondary" onClick={jobs.length ? reset : () => openDialog('add')}>{jobs.length ? 'Clear filters' : 'Add Maintenance Job'}</button></div>}</div>
      <div className="maintenance-pagination"><span>{filtered.length ? `Showing ${(safePage - 1) * 10 + 1}–${Math.min(safePage * 10, filtered.length)} of ${filtered.length} jobs` : 'Showing 0 jobs'}</span><div><button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="back" size={15} /></button><span>Page {safePage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><Icon name="arrow" size={15} /></button></div></div>
    </section>
    {dialog && <div className="maintenance-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><div className="maintenance-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-dialog-title"><div className="maintenance-dialog-heading"><div><span className="fleet-demo-mark">MAINTENANCE RECORDS</span><h2 id="maintenance-dialog-title">{dialog === 'add' ? 'Add Maintenance Job' : dialog === 'edit' ? 'Edit Maintenance Job' : 'Job Details'}</h2></div><button type="button" aria-label="Close dialog" onClick={closeDialog}><Icon name="close" size={19} /></button></div>{dialog === 'view' && selected ? <JobDetails job={selected} vehicle={vehicleFor(selected)} onClose={closeDialog} onEdit={() => setDialog('edit')} onVehicle={onViewVehicle} /> : <MaintenanceForm key={selected?.id || 'new'} initial={dialog === 'edit' ? selected : null} vehicles={vehicles} bookings={bookings} trips={trips} onCancel={closeDialog} onSave={saveJob} />}</div></div>}
  </div>
}
