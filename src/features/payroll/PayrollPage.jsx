import { useId, useState } from 'react'
import { FinanceEmpty, FinanceHeading, FinanceIcon as Icon, FinanceKpis, FinanceReview } from '../../shared/components/FinanceRegister.jsx'
import { sar } from '../bookings/BookingData.js'

const rate = (value) => value === '' || value == null ? 'Not provided' : sar(value)

export default function PayrollPage({ employees, drivers, loading, loadError, onReload, onOpenEmployee, onOpenDriver }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('All roles')
  const [status, setStatus] = useState('All statuses')
  const [period, setPeriod] = useState(() => new Date().toLocaleDateString('sv-SE').slice(0, 7))
  const [selectedKey, setSelectedKey] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersId = useId()
  // These are staff records and configured rates, not calculated payroll entries.
  const staff = [...employees.map((person) => ({ ...person, key: `employee-${person.id}`, role: 'Employee', monthlyRate: person.monthlySalary })), ...drivers.map((person) => ({ ...person, key: `driver-${person.id}`, role: 'Driver' }))]
  const visible = staff.filter((person) => `${person.name} ${person.employeeId} ${person.department || ''}`.toLowerCase().includes(query.trim().toLowerCase()) && (role === 'All roles' || person.role === role) && (status === 'All statuses' || person.status === status))
  const selected = visible.find((person) => person.key === selectedKey)
  const openProfile = selected?.role === 'Employee' ? onOpenEmployee : onOpenDriver
  const reset = () => { setQuery(''); setRole('All roles'); setStatus('All statuses'); setSelectedKey(null) }
  return <div className="finance-page finance-payroll-page">
    <FinanceHeading title="Payroll" description="Review staff and rates before preparing payroll."><div className="finance-actions"><div><button type="button" className="booking-secondary" disabled={loading} onClick={onReload}><Icon name="reset" /> Refresh</button><button type="button" className="booking-primary" disabled title="Payroll calculations and payroll runs are not configured yet."><Icon name="wallet" /> Prepare payroll</button></div><small>Proposed workflow · Payroll not yet configured.</small></div></FinanceHeading>
    <div className="finance-notice" role="note"><Icon name="info" /><span>Staff and rates below come from your existing records. Payroll calculations, deductions, approvals and payments are not yet configured. Rates are not a calculated salary or a payment record.</span></div>
    {loadError && <div className="booking-error" role="alert">Staff records could not be fully loaded: {loadError} <button type="button" className="booking-secondary" onClick={onReload}>Try again</button></div>}
    {loading ? <p role="status">Loading staff records...</p> : <>
      <FinanceKpis label="Payroll overview" items={[{ label: 'Accessible staff', value: staff.length, note: 'Accessible employee and driver records', icon: 'users' }, { label: 'Employees', value: employees.length, note: 'Employee records', icon: 'users', tone: 'green' }, { label: 'Drivers', value: drivers.length, note: 'Driver records', icon: 'users', tone: 'purple' }, { label: 'Net payable', value: '—', note: 'Payroll not calculated', icon: 'wallet', tone: 'amber' }]} />
      <div className="finance-layout"><section className="finance-register" aria-label="Payroll staff register">
        <div className="finance-toolbar"><label className="finance-search"><Icon name="search" /><input type="search" aria-label="Search payroll staff" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, staff ID or department..." /></label></div>
        <div className="payroll-register-controls">
          <div className="finance-date-controls"><label><span>Planning period</span><input type="month" aria-label="Payroll planning period" value={period} onChange={(event) => setPeriod(event.target.value)} /></label><label><span>Role</span><select aria-label="Payroll staff role" value={role} onChange={(event) => setRole(event.target.value)}><option>All roles</option><option>Employee</option><option>Driver</option></select></label></div>
          <button type="button" className="booking-secondary payroll-filter-toggle" aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen((open) => !open)}><Icon name="filter" /> Filters{status !== 'All statuses' && <span className="finance-count">1</span>}</button>
          <div id={filtersId} className="finance-filter-fields" hidden={!filtersOpen}><label>Staff status<select aria-label="Payroll staff status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Active</option><option>Inactive</option></select></label><button type="button" className="booking-secondary" onClick={reset}><Icon name="reset" /> Reset filters</button></div>
        </div>
        <div className="finance-context"><span>{visible.length} of {staff.length} staff records</span><span>Configured rates · SAR</span></div>
        <p className="finance-scroll-hint">Select a name to review rates. Scroll the table to see all columns.</p>
        <div className="finance-table-scroll" tabIndex={0} role="region" aria-label="Payroll staff table, scroll for all columns"><table className="finance-table finance-payroll-table"><thead><tr>{['Name / Staff ID', 'Role', 'Hourly rate (SAR)', 'Daily rate (SAR)', 'Monthly rate (SAR)', 'Staff status', 'Actions'].map((label) => <th scope="col" key={label} className={label.includes('(SAR)') ? 'finance-money' : ''}>{label}</th>)}</tr></thead><tbody>{visible.map((person) => <tr key={person.key} className={selected?.key === person.key ? 'is-selected' : ''}><td><button type="button" className="finance-reference" aria-label={`Preview payroll staff ${person.name}`} aria-pressed={selected?.key === person.key} onClick={() => setSelectedKey(person.key)}>{person.name}</button><small>{person.employeeId}</small></td><td>{person.role}</td><td className="finance-money">{rate(person.hourlyRate)}</td><td className="finance-money">{rate(person.dailyRate)}</td><td className="finance-money">{rate(person.monthlyRate)}</td><td>{person.status}</td><td><button type="button" className="finance-icon-button" aria-label={`Review rates for ${person.name}`} onClick={() => setSelectedKey(person.key)}><Icon name="eye" /></button></td></tr>)}</tbody></table></div>
        {!visible.length && <FinanceEmpty icon="users" title={staff.length ? 'No staff match these filters' : 'No accessible staff records'}>{staff.length ? 'Try another name, role or staff status.' : 'Employee and driver records will appear here when available to your role.'}</FinanceEmpty>}
        <div className="finance-pagination"><span>{visible.length} staff records · Planning period {period || 'not selected'}</span></div>
      </section><FinanceReview title={selected?.name} subtitle={selected && `${selected.role} · ${selected.employeeId}`} active={Boolean(selected)} onClose={() => setSelectedKey(null)} emptyTitle="Review staff rates" emptyText="Select a staff member to check the rates already saved in their profile." footer={selected && openProfile && <button type="button" className="booking-primary" onClick={() => openProfile(selected.id)}><Icon name="eye" /> Open {selected.role} Profile</button>}>
        {selected && <><dl><dt>Staff ID</dt><dd>{selected.employeeId}</dd><dt>Role</dt><dd>{selected.role}</dd><dt>Employment</dt><dd>{selected.employmentType || 'Not provided'}</dd><dt>Staff status</dt><dd>{selected.status}</dd><dt>Department</dt><dd>{selected.department || selected.category || 'Not provided'}</dd><dt>Hourly rate</dt><dd>{rate(selected.hourlyRate)}</dd><dt>Daily rate</dt><dd>{rate(selected.dailyRate)}</dd><dt>Monthly rate</dt><dd>{rate(selected.monthlyRate)}</dd><dt>Planning period</dt><dd>{period || 'Not selected'}</dd><dt>Net payable</dt><dd>Not calculated</dd></dl><div className="finance-notice"><Icon name="info" /><span>Payroll is not yet configured. Changing the planning period does not calculate earnings or deductions.</span></div></>}
      </FinanceReview></div>
    </>}
  </div>
}
