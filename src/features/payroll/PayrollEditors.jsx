import { useState } from 'react'
import RentalDialog from '../../shared/components/RentalDialog.jsx'
import PayrollSettlementPanel from './PayrollSettlementPanel.jsx'
import { sar } from '../bookings/BookingData.js'
import { blankAdjustment, blankProfile, monthLabel, payrollPreview, profileError, settlementLabels } from './PayrollData.js'
import { saveSalaryProfile, savePayrollDraft, discardPayrollDraft } from './PayrollApi.js'

const moneyInput = { type: 'number', min: '0', max: '9999999999.99', step: '0.01', required: true, inputMode: 'decimal' }
function Settlement({ value, onChange, label }) { return <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{Object.entries(settlementLabels).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select> }
export function PayrollTotals({ profile, adjustments = [] }) {
  let totals
  try { totals = payrollPreview(profile, adjustments) } catch (error) { return <p className="payroll-help">{error.message}</p> }
  return <><dl className="payroll-totals">{[['Cash earnings', totals.cashEarnings], ['Noncash benefits', totals.benefits], ['Deductions', totals.deductions], ['Net cash entitlement', totals.netCash], ['Fixed bank allocation', totals.fixedBankAmount]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{sar(value)}</dd></div>)}</dl>{totals.fixedBankAmount > totals.netCash && <p className="payroll-warning" role="status">Net cash is below the fixed bank allocation. Review the payment split.</p>}<p className="payroll-help">The fixed bank allocation is part of cash entitlement. It is not a deduction or evidence of payment. Noncash benefits are excluded from cash payable.</p></>
}
export function SalaryProfileDialog({ person, profiles, initial, period, user, onClose, onSaved }) {
  const [recordId, setRecordId] = useState(initial?.id || null)
  const [data, setData] = useState(() => initial ? { ...initial.details, version: initial.version } : blankProfile(person, period))
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const permission = recordId ? 'payroll.edit' : 'payroll.create', allowed = user.permissions.includes(permission)
  const set = (key, value) => setData(d => ({ ...d, [key]: value }))
  const component = (index, key, value) => set('components', data.components.map((c, i) => i === index ? { ...c, [key]: value } : c))
  const choose = id => {
    const record = profiles.find(p => p.id === Number(id))
    setRecordId(record?.id || null); setError('')
    setData(record ? { ...record.details, version: record.version } : { ...data, version: null, effectiveMonth: period })
  }
  const save = async event => {
    event.preventDefault(); if (busy || !allowed) return
    const invalid = profileError(data); if (invalid) { setError(invalid); return }
    setBusy(true); setError('')
    try { await saveSalaryProfile(recordId, data); onSaved('Salary profile saved. Existing payroll drafts retain their salary snapshots.') } catch (err) { setError(err.message); setBusy(false) }
  }
  return <RentalDialog title={`Salary profile · ${person.name}`} wide onClose={() => { if (!busy) onClose() }}>
    <form className="payroll-editor" onSubmit={save} data-permission-scope={permission} aria-busy={busy}>
      <p>{person.staffNumber} · {person.staffType === 'DRIVER' ? 'Driver' : 'Employee'} · SAR</p>
      <label>Salary version<select value={recordId || ''} onChange={e => choose(e.target.value)} disabled={busy}>{profiles.map(p => <option key={p.id} value={p.id}>Effective {monthLabel(p.details.effectiveMonth)} · revision {p.version + 1}</option>)}<option value="">New effective version</option></select></label>
      <p className="payroll-help">Reference monthly rate in the staff record: {person.referenceRate == null ? 'Not provided' : sar(person.referenceRate)}. Confirm the salary structure below; this reference is not copied automatically.</p>
      <fieldset disabled={busy || !allowed}><legend>Monthly salary structure</legend><div className="payroll-field-grid">
        <label>Effective month<input type="month" min="2000-01" max="2099-12" required value={data.effectiveMonth} disabled={Boolean(recordId)} onChange={e => set('effectiveMonth', e.target.value)} /></label>
        <label>Basic salary (SAR)<input {...moneyInput} value={data.basicSalary} onChange={e => set('basicSalary', e.target.value)} /></label>
        <label>Fixed bank allocation (SAR)<input {...moneyInput} value={data.fixedBankAmount} onChange={e => set('fixedBankAmount', e.target.value)} /></label>
      </div><p className="payroll-help">Recurring amounts apply monthly from this date. Enter zero explicitly when there is no fixed bank allocation. Bonuses, trip allowances and overtime belong in monthly adjustments unless agreed as recurring.</p>
      <div className="payroll-subheading"><h3>Recurring allowances and benefits</h3><button type="button" className="booking-secondary" data-permission={permission} disabled={data.components.length >= 40} onClick={() => set('components', [...data.components, { name: '', amount: '', settlement: 'CASH' }])}>Add component</button></div>
      {data.components.map((c, i) => <div className="payroll-component" key={i}>
        <label>Component name<input required maxLength={100} value={c.name} placeholder="Food, room, profession…" onChange={e => component(i, 'name', e.target.value)} /></label>
        <label>Amount (SAR)<input {...moneyInput} value={c.amount} onChange={e => component(i, 'amount', e.target.value)} /></label>
        <label>Settlement preference<Settlement value={c.settlement} label={`Settlement for component ${i + 1}`} onChange={value => component(i, 'settlement', value)} /></label>
        <button type="button" className="booking-secondary" data-permission={permission} aria-label={`Remove recurring component ${i + 1}`} onClick={() => set('components', data.components.filter((_, index) => index !== i))}>Remove</button>
      </div>)}
      <h3>Employee receiving account</h3><p className="payroll-help">Use the employee’s account, not MAK’s billing account. Unknown details may remain blank and will be flagged before payment processing.</p>
      <div className="payroll-field-grid">{[['accountName', 'Account holder'], ['bankName', 'Bank name'], ['iban', 'IBAN'], ['accountNumber', 'Account number']].map(([key, label]) => <label key={key}>{label}<input maxLength={key === 'iban' ? 40 : key === 'accountNumber' ? 80 : 150} value={data[key]} onChange={e => set(key, e.target.value)} autoComplete="off" /></label>)}</div>
      <label>Salary notes<textarea maxLength={2000} value={data.notes} onChange={e => set('notes', e.target.value)} /></label></fieldset>
      <PayrollTotals profile={data} />
      {initial?.warnings?.length > 0 && <ul className="payroll-warning">{initial.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
      {error && <p className="booking-error" role="alert">{error}</p>}
      <div className="payroll-dialog-actions"><button type="button" className="booking-secondary" disabled={busy} onClick={onClose}>Close</button>{allowed && <button type="submit" className="booking-primary" data-permission={permission} disabled={busy}>{busy ? 'Saving…' : 'Save salary profile'}</button>}</div>
    </form>
  </RentalDialog>
}

export function PayrollDraftDialog({ draft, user, onClose, onSaved }) {
  const [adjustments, setAdjustments] = useState(draft.adjustments), [notes, setNotes] = useState(draft.notes)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [discarding, setDiscarding] = useState(false)
  const editable = !draft.approvalId && user.permissions.includes('payroll.edit'), removable = draft.canDiscard !== false && !draft.approvalId && user.permissions.includes('payroll.archive')
  const dirty = JSON.stringify(adjustments) !== JSON.stringify(draft.adjustments) || notes !== draft.notes
  const item = (index, changes) => setAdjustments(rows => rows.map((r, i) => i === index ? { ...r, ...changes } : r))
  const save = async e => {
    e.preventDefault(); if (busy || !editable) return
    try { payrollPreview(draft.snapshot, adjustments) } catch (err) { setError(err.message); return }
    setBusy(true); setError('')
    try { await savePayrollDraft(draft.id, { version: draft.version, adjustments, notes }); onSaved('Monthly payroll draft saved. No payments have been recorded.') } catch (err) { setError(err.message); setBusy(false) }
  }
  const discard = async () => {
    if (busy || !removable) return
    setBusy(true); setError('')
    try { await discardPayrollDraft(draft.id, draft.version); onSaved('Draft discarded. You can prepare this staff member again for the same month.') } catch (err) { setError(err.message); setBusy(false) }
  }
  return <RentalDialog title={`Payroll · ${draft.name}`} wide onClose={() => { if (!busy) onClose() }}>
    <div className="payroll-record-layout"><form className="payroll-editor" onSubmit={save} data-permission-scope="payroll.edit" aria-busy={busy}>
      <p>{draft.staffNumber} · {monthLabel(draft.period)} · {draft.status} · SAR</p>
      <div className="finance-notice"><span>Salary snapshot: effective {monthLabel(draft.snapshot.effectiveMonth)}, revision {draft.profileVersion + 1}. {draft.approvalId ? "Approved salary figures are locked. Record bank/cash payments separately below." : "Save monthly adjustments, then review and approve before recording payments."}</span></div>
      <h3>Saved recurring earnings</h3><dl className="payroll-earnings"><div><dt>Basic salary</dt><dd>{sar(draft.snapshot.basicSalary)}</dd></div>{draft.snapshot.components.map((c, i) => <div key={i}><dt>{c.name}<small>{settlementLabels[c.settlement]}</small></dt><dd>{sar(c.amount)}</dd></div>)}</dl>
      {draft.warnings.length > 0 && <ul className="payroll-warning">{draft.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
      <fieldset disabled={busy || !editable}><legend>Monthly adjustments</legend><p className="payroll-help">Enter confirmed amounts and reasons. No automatic overtime, absence or partial-month calculation is applied. Do not enter bank payments as deductions. Advances and loan recovery must be verified manually until the ledger is implemented.</p>
      <button type="button" className="booking-secondary" data-permission="payroll.edit" disabled={adjustments.length >= 60} onClick={() => setAdjustments([...adjustments, blankAdjustment()])}>Add adjustment</button>
      {adjustments.map((a, i) => <div className="payroll-adjustment" key={i}>
        <div className="payroll-field-grid"><label>Adjustment name<input required maxLength={100} placeholder="Bonus, overtime, deduction…" value={a.name} onChange={e => item(i, { name: e.target.value })} /></label>
        <label>Type<select value={a.kind} onChange={e => item(i, { kind: e.target.value, settlement: 'CASH' })}><option value="ADDITION">Addition</option><option value="DEDUCTION">Deduction</option></select></label>
        <label>Amount (SAR)<input {...moneyInput} min="0.01" value={a.amount} onChange={e => item(i, { amount: e.target.value })} /></label>
        {a.kind === 'ADDITION' && <label>Settlement preference<Settlement label={`Settlement for adjustment ${i + 1}`} value={a.settlement} onChange={value => item(i, { settlement: value })} /></label>}</div>
        <label>Reason / approval reference<textarea required maxLength={500} value={a.reason} onChange={e => item(i, { reason: e.target.value })} /></label>
        <button type="button" className="booking-secondary" data-permission="payroll.edit" aria-label={`Remove monthly adjustment ${i + 1}`} onClick={() => setAdjustments(adjustments.filter((_, index) => index !== i))}>Remove adjustment</button>
      </div>)}
      <label>Payroll review notes<textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} /></label></fieldset>
      <PayrollTotals profile={draft.snapshot} adjustments={adjustments} />
      {error && <p className="booking-error" role="alert">{error}</p>}
      {discarding && <div className="payroll-warning"><p>Discard this saved draft and all its monthly adjustments? The salary profile will remain available.</p><button type="button" className="booking-secondary" data-permission="" disabled={busy} onClick={() => setDiscarding(false)}>Keep draft</button><button type="button" className="booking-secondary" data-permission="payroll.archive" disabled={busy} onClick={discard}>Confirm discard draft</button></div>}
      <div className="payroll-dialog-actions">{removable && <button type="button" className="booking-secondary" data-permission="payroll.archive" disabled={busy} onClick={() => setDiscarding(true)}>Discard draft</button>}<button type="button" className="booking-secondary" disabled={busy} onClick={onClose}>Close</button>{editable && <button type="submit" className="booking-primary" data-permission="payroll.edit" disabled={busy}>{busy ? 'Saving…' : 'Save payroll draft'}</button>}</div>
    </form><PayrollSettlementPanel draft={draft} user={user} dirty={dirty} onSaved={onSaved} /></div>
  </RentalDialog>
}
