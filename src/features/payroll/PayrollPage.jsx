import { useEffect, useState } from 'react'
import { IconChevronRight } from '@tabler/icons-react'
import { FinanceEmpty, FinanceHeading, FinanceIcon as Icon, FinanceKpis } from '../../shared/components/FinanceRegister.jsx'
import RentalDialog from '../../shared/components/RentalDialog.jsx'
import { sar } from '../bookings/BookingData.js'
import { loadPayroll, preparePayrollDrafts } from './PayrollApi.js'
import { currentPayrollMonth, effectiveProfile, monthLabel } from './PayrollData.js'
import { SalaryProfileDialog, PayrollDraftDialog } from './PayrollEditors.jsx'
import './PayrollPage.css'
import { settlementSummary } from './PayrollSettlementData.js'

const empty = { staff: [], profiles: [], drafts: [] }
export default function PayrollPage({ user }) {
  const [period, setPeriod] = useState(currentPayrollMonth), [tab, setTab] = useState('profiles')
  const [data, setData] = useState(empty), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0), [query, setQuery] = useState(''), [role, setRole] = useState('ALL'), [stateFilter, setStateFilter] = useState('ALL')
  const [dialog, setDialog] = useState(null), [message, setMessage] = useState('')
  const [selected, setSelected] = useState([]), [busy, setBusy] = useState(false), [prepareError, setPrepareError] = useState('')
  const canCreate = user.permissions.includes('payroll.create')
  const validPeriod = /^20\d{2}-(0[1-9]|1[0-2])$/.test(period)
  useEffect(() => {
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)) return
    let active = true
    loadPayroll(period).then(result => { if (active) { setData(result); setError('') } }).catch(err => { if (active) { setError(err.message); setData(empty) } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period, refresh])
  const reload = () => { setLoading(true); setError(''); setRefresh(r => r + 1) }
  const saved = text => { setDialog(null); setMessage(text); reload() }
  const summary = settlementSummary(data.drafts)
  const draftPayees = new Set(data.drafts.map(d => d.payeeId))
  const eligible = data.staff.filter(p => p.status === 'Active' && p.payeeId && !draftPayees.has(p.payeeId) && effectiveProfile(data.profiles, p.payeeId, period))
  const visible = data.staff.filter(p => `${p.name} ${p.staffNumber} ${p.department || ''}`.toLowerCase().includes(query.trim().toLowerCase()) && (role === 'ALL' || p.staffType === role))
  const visibleDrafts = data.drafts.filter(d => `${d.name} ${d.staffNumber}`.toLowerCase().includes(query.trim().toLowerCase()) && (role === 'ALL' || d.snapshot.staffType === role) && (stateFilter === 'ALL' || d.status === stateFilter))
  const prepare = async () => {
    if (busy || !canCreate || !selected.length) return
    setBusy(true); setPrepareError('')
    try { await preparePayrollDrafts(period, selected); setTab('drafts'); saved(`${selected.length} monthly payroll draft${selected.length === 1 ? '' : 's'} prepared for ${monthLabel(period)}.`) } catch (err) { setPrepareError(err.message) } finally { setBusy(false) }
  }
  const choosePeriod = value => { setPeriod(value); setLoading(/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)); setData(empty); setMessage(''); setError('') }
  return <div className="finance-page finance-payroll-page payroll-foundation">
    <FinanceHeading title="Payroll" description="Configure salaries, approve monthly payroll and record payments."><div className="finance-actions"><div><button className="booking-secondary" type="button" disabled={loading || !validPeriod} onClick={reload}><Icon name="reset" /> Refresh</button>{canCreate && <button className="booking-primary" type="button" data-permission="payroll.create" disabled={loading || !!error || !validPeriod || !eligible.length} onClick={() => { setSelected([]); setPrepareError(''); setDialog({ type: 'prepare' }) }}><Icon name="plus" /> Prepare monthly drafts</button>}</div></div></FinanceHeading>
    <div className="finance-notice" role="note"><Icon name="info" /><span>Salary profiles, approvals and payment records · SAR · KSA calendar months. Payments are recorded after being made externally. Approved payslips are available as PDF. Advance/loan automation is the next stage.</span></div>
    {message && <p className="payroll-success" role="status">{message}</p>}
    <div className="payroll-top-controls"><label>Payroll month<input type="month" min="2000-01" max="2099-12" required value={period} onChange={e => choosePeriod(e.target.value)} /></label><p>{monthLabel(period)} · Full monthly amounts; adjustments require a reason.</p></div>
    {!validPeriod && <p className="booking-error" role="alert">Choose a payroll month between 2000 and 2099.</p>}
    {error && <div className="booking-error" role="alert">Payroll could not be loaded: {error} <button className="booking-secondary" type="button" onClick={reload}>Try again</button></div>}
    {loading ? <p role="status">Loading payroll records…</p> : validPeriod && !error && <>
      <FinanceKpis label="Monthly payroll overview" items={[
        { label: 'Monthly payroll records', value: data.drafts.length, note: `${summary.drafts} draft(s) · ${data.staff.length} staff records`, icon: 'users' },
        { label: 'Approved net cash', value: sar(summary.approvedNet), note: 'Locked cash entitlement · Selected month', icon: 'document', tone: 'purple' },
        { label: 'Recorded payments', value: sar(summary.paid), note: 'Bank and cash · After record reversals', icon: 'wallet', tone: 'green' },
        { label: 'Outstanding salary', value: sar(summary.outstanding), note: 'Approved payroll only · Excludes noncash benefits', icon: 'clock', tone: 'amber' },
      ]} />
      <section className="finance-register" aria-label="Payroll register">
        <div className="payroll-tabs" aria-label="Payroll views">{[['profiles','Salary profiles'], ['drafts','Monthly payroll']].map(([key, text]) => <button key={key} type="button" data-permission="" aria-pressed={tab === key} onClick={() => { setTab(key); setQuery('') }}>{text}<span>{key === 'profiles' ? data.staff.length : data.drafts.length}</span></button>)}</div>
        <div className="payroll-search-row"><label className="finance-search"><Icon name="search" /><input type="search" aria-label="Search payroll staff" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, staff ID or department…" /></label><label>Staff type<select value={role} onChange={e => setRole(e.target.value)}><option value="ALL">All staff</option><option value="EMPLOYEE">Employees</option><option value="DRIVER">Drivers</option></select></label>{tab === 'drafts' && <label>Payroll status<select value={stateFilter} onChange={e => setStateFilter(e.target.value)}><option value="ALL">All statuses</option>{['Draft','Approved','Partially paid','Paid'].map(value => <option key={value}>{value}</option>)}</select></label>}</div>
        <div className="finance-context"><span>{tab === 'profiles' ? 'Confirm salary structures before preparing monthly drafts.' : 'Approved salary figures are locked. Outstanding balances use recorded payments only.'}</span><span>All amounts in SAR</span></div>
        <div className="finance-table-scroll" tabIndex={0} role="region" aria-label={tab === 'profiles' ? 'Salary profiles table' : 'Monthly payroll drafts table'}><table className="finance-table"><thead><tr>{(tab === 'profiles' ? ['Staff member', 'Type / status', 'Effective salary', 'Cash earnings', 'Noncash benefits', 'Fixed bank allocation', 'Actions'] : ['Staff member', 'Period / status', 'Net cash', 'Bank paid', 'Cash paid', 'Outstanding', 'Review', 'Actions']).map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
          {tab === 'profiles' ? visible.map(person => {
            const versions = data.profiles.filter(p => p.payeeId === person.payeeId), profile = effectiveProfile(versions, person.payeeId, period)
            return <tr key={`${person.staffType}-${person.staffId}`}><td><strong>{person.name}</strong><small>{person.staffNumber} · {person.department || 'No department'}</small>{person.duplicateStaffNumber && <small className="payroll-warning-text">Shared staff number — one payroll payee only</small>}</td><td>{person.staffType === 'DRIVER' ? 'Driver' : 'Employee'}<small>{person.status}</small></td><td>{profile ? monthLabel(profile.details.effectiveMonth) : versions.length ? 'Future version only' : 'Not configured'}{profile?.warnings.length > 0 && <small className="payroll-warning-text">{profile.warnings.length} setup warning(s)</small>}</td><td>{profile ? sar(profile.totals.cashEarnings) : '—'}</td><td>{profile ? sar(profile.totals.benefits) : '—'}</td><td>{profile ? sar(profile.details.fixedBankAmount) : '—'}</td><td><button className="payroll-row-action" type="button" data-permission="" aria-label={`${versions.length ? 'View salary profile' : 'Configure salary'} for ${person.name}`} disabled={!versions.length && !canCreate} onClick={() => setDialog({ type: 'profile', person, profiles: versions, initial: profile || versions[0] })}><span>{versions.length ? 'View profile' : 'Configure'}</span><IconChevronRight size={17} stroke={1.8} aria-hidden="true" /></button></td></tr>
          }) : visibleDrafts.map(draft => <tr key={draft.id}><td><strong>{draft.name}</strong><small>{draft.staffNumber}</small></td><td>{monthLabel(draft.period)}<small className="payroll-state">{draft.status}</small></td><td><strong>{sar(draft.totals.netCash)}</strong></td><td>{sar(draft.bankPaid || 0)}</td><td>{sar(draft.cashPaid || 0)}</td><td><strong>{draft.approvalId ? sar(draft.outstanding) : "Awaiting approval"}</strong></td><td>{draft.warnings.length ? <span className="payroll-warning-text">{draft.warnings.length} review warning(s)</span> : 'Ready for review'}</td><td><button className="booking-secondary" type="button" data-permission="" onClick={() => setDialog({ type: 'draft', draft })}>Review payroll</button></td></tr>)}
        </tbody></table></div>
        {(tab === 'profiles' ? !visible.length : !visibleDrafts.length) && <FinanceEmpty icon="users" title={tab === 'profiles' ? 'No staff match this view' : 'No payroll matches this view'}>{tab === 'profiles' ? 'Adjust the search or staff type filter.' : 'Configure salary profiles and prepare payroll, or adjust the status and search filters.'}</FinanceEmpty>}
      </section>
    </>}
    {dialog?.type === 'profile' && <SalaryProfileDialog key={`${dialog.person.staffType}-${dialog.person.staffId}`} {...dialog} period={period} user={user} onClose={() => setDialog(null)} onSaved={saved} />}
    {dialog?.type === 'draft' && <PayrollDraftDialog draft={dialog.draft} user={user} onClose={() => setDialog(null)} onSaved={saved} />}
    {dialog?.type === 'prepare' && <RentalDialog title={`Prepare payroll · ${monthLabel(period)}`} wide onClose={() => { if (!busy) setDialog(null) }}><div className="payroll-editor" aria-busy={busy}>
      <p>Select active staff with an effective salary profile. Staff already included in this month are excluded. All selected drafts are saved together; a validation error saves none.</p>
      <p className="payroll-help">No salary proration, attendance deduction or payment is applied automatically.</p>
      <div className="payroll-prepare-list">{eligible.map(person => { const profile = effectiveProfile(data.profiles, person.payeeId, period); return <label key={person.payeeId}><input type="checkbox" disabled={busy} checked={selected.includes(person.payeeId)} onChange={e => setSelected(ids => e.target.checked ? [...ids, person.payeeId] : ids.filter(id => id !== person.payeeId))} /><span><strong>{person.name}</strong><small>{person.staffNumber} · {person.employmentType} · Effective {monthLabel(profile.details.effectiveMonth)}</small></span><strong>{sar(profile.totals.netCash)}</strong></label> })}</div>
      {prepareError && <p className="booking-error" role="alert">{prepareError}</p>}
      <div className="payroll-dialog-actions"><button className="booking-secondary" type="button" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button className="booking-primary" type="button" data-permission="payroll.create" disabled={busy || !selected.length} onClick={prepare}>{busy ? 'Preparing…' : `Prepare ${selected.length} draft${selected.length === 1 ? '' : 's'}`}</button></div>
    </div></RentalDialog>}
  </div>
}
