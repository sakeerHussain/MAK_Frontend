import { useState } from 'react'
import RentalDialog from '../../shared/components/RentalDialog.jsx'
import { apiFileUrl } from '../../shared/lib/apiRequest.js'
import { sar } from '../bookings/BookingData.js'
import { approvePayroll, attachPayrollReceipt, recordPayrollPayment, reopenPayroll, reversePayrollPayment } from './PayrollSettlementApi.js'
import { ksaToday, payrollDate, payrollInstant, receiptError } from './PayrollSettlementData.js'
import { cents } from './PayrollData.js'
import { downloadPayrollPayslip } from './PayrollPayslipApi.js'

function SalaryApproval({ draft, onClose, onSaved }) {
  const [note, setNote] = useState(''), [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const save = async e => {
    e.preventDefault(); if (busy || !checked) return; setBusy(true); setError('')
    try { await approvePayroll(draft.id, draft.version, note); onSaved('Payroll approved. Salary figures are locked; no payment was recorded.') } catch (err) { setError(err.message); setBusy(false) }
  }
  return <RentalDialog title="Approve payroll" onClose={() => { if (!busy) onClose() }}><form className="payroll-editor" data-permission-scope="payroll.approve" onSubmit={save} aria-busy={busy}>
    <p><strong>{draft.name}</strong> · {draft.staffNumber}</p><dl className="payroll-totals"><div><dt>Net cash entitlement</dt><dd>{sar(draft.totals.netCash)}</dd></div><div><dt>Noncash benefits</dt><dd>{sar(draft.totals.benefits)}</dd></div><div><dt>Fixed bank allocation</dt><dd>{sar(draft.snapshot.fixedBankAmount)}</dd></div></dl>
    {draft.warnings.length > 0 && <ul className="payroll-warning">{draft.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
    <fieldset disabled={busy}><legend>Approval review</legend><label>Review note<textarea required maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="Confirm adjustments, allowance settlement and any review warnings." /></label><label className="payroll-check"><input type="checkbox" required checked={checked} onChange={e => setChecked(e.target.checked)} /><span>I have reviewed the salary, allowances, deductions and payment split. Approval locks the figures; payments will be recorded separately.</span></label></fieldset>
    {error && <p role="alert" className="booking-error">{error}</p>}<div className="payroll-dialog-actions"><button type="button" className="booking-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" data-permission="payroll.approve" className="booking-primary" disabled={busy || !checked}>{busy ? 'Approving…' : 'Confirm approval'}</button></div>
  </form></RentalDialog>
}

function SalaryPayment({ draft, onClose, onSaved }) {
  const [requestKey] = useState(() => crypto.randomUUID())
  const [method, setMethod] = useState(Number(draft.snapshot.fixedBankAmount) > 0 ? 'BANK' : 'CASH')
  const [amount, setAmount] = useState(''), [date, setDate] = useState(ksaToday), [reference, setReference] = useState(''), [notes, setNotes] = useState('')
  const [account, setAccount] = useState(() => Object.fromEntries(['accountName','bankName','iban','accountNumber'].map(key => [key, draft.snapshot[key] || ''])))
  const [receipt, setReceipt] = useState(null), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const save = async e => {
    e.preventDefault(); if (busy || !confirmed) return
    const invalidReceipt = receiptError(receipt); if (invalidReceipt) { setError(invalidReceipt); return }
    try { const value = cents(amount); if (value <= 0 || value > Math.round(Number(draft.outstanding) * 100)) throw new Error('Enter an amount greater than zero, up to the outstanding salary balance.') } catch (err) { setError(err.message); return }
    setBusy(true); setError('')
    try { await recordPayrollPayment(draft.id, { version: draft.version, requestKey, method, amount, paidOn: date, reference, notes, account: method === 'BANK' ? account : null, confirmedPaid: confirmed }, receipt); onSaved('Payment record saved. The salary balance now reflects the recorded bank/cash payments.') } catch (err) { setError(err.message); setBusy(false) }
  }
  return <RentalDialog title="Record salary payment" wide onClose={() => { if (!busy) onClose() }}><form className="payroll-editor" onSubmit={save} data-permission-scope="payroll.pay" data-upload-permission="payroll.pay" aria-busy={busy}>
    <p><strong>{draft.name}</strong> · Outstanding <strong>{sar(draft.outstanding)}</strong></p><div className="finance-notice"><span>Record a payment already made through your bank or in cash. MAK does not transfer funds. The fixed bank allocation is a salary reference, not an automatic payment.</span></div>
    <fieldset disabled={busy}><legend>Actual payment details</legend><div className="payroll-field-grid"><label>Payment method<select value={method} onChange={e => setMethod(e.target.value)}><option value="BANK">Bank</option><option value="CASH">Cash</option></select></label><label>Amount paid (SAR)<input type="number" min="0.01" max={Math.min(Number(draft.outstanding),9999999999.99)} step="0.01" inputMode="decimal" required value={amount} onChange={e => setAmount(e.target.value)} /></label><label>Actual payment date (KSA)<input type="date" min="2000-01-01" max={ksaToday()} required value={date} onChange={e => setDate(e.target.value)} /></label><label>{method === 'BANK' ? 'Bank transfer reference' : 'Cash voucher number'}<input required maxLength={150} value={reference} onChange={e => setReference(e.target.value)} /></label></div>
    {method === 'BANK' && <><h3>Employee receiving account used</h3><p className="payroll-help">Confirm the employee account used for this payment. These details are saved with the payment record; they do not change the approved salary structure.</p><div className="payroll-field-grid">{[['accountName','Account holder',true],['bankName','Bank name',true],['iban','IBAN',false],['accountNumber','Account number',false]].map(([key,label,required]) => <label key={key}>{label}<input required={required} autoComplete="off" maxLength={key === 'iban' ? 40 : key === 'accountNumber' ? 80 : 150} value={account[key]} onChange={e => setAccount(a => ({ ...a, [key]: e.target.value }))} /></label>)}</div><p className="payroll-help">A receiving IBAN or account number is required.</p></>}
    <label>Payment notes<textarea maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} /></label><label>Receipt or transfer proof (optional)<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" data-permission="payroll.pay" onChange={e => setReceipt(e.target.files?.[0] || null)} /></label><p className="payroll-help">PDF or image, up to 5 MB. Proof can also be attached later.</p><label className="payroll-check"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>I confirm this payment has already been made to the employee. This entry records the payment only.</span></label></fieldset>
    {error && <p className="booking-error" role="alert">{error}</p>}<div className="payroll-dialog-actions"><button type="button" className="booking-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="booking-primary" data-permission="payroll.pay" disabled={busy || !confirmed}>{busy ? 'Recording…' : 'Record payment'}</button></div>
  </form></RentalDialog>
}

function PayrollCorrection({ draft, payment, onClose, onSaved }) {
  const [reason, setReason] = useState(''), [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const save = async e => {
    e.preventDefault(); if (busy || !checked) return; setBusy(true); setError('')
    try {
      if (payment) await reversePayrollPayment(draft.id, payment.id, draft.version, reason)
      else await reopenPayroll(draft.id, draft.version, reason)
      onSaved(payment ? 'Payment record reversed. Its history and proof remain available; the salary balance has been updated.' : 'Payroll reopened for correction. The original approval is retained in history; reapproval is required before payment.')
    } catch (err) { setError(err.message); setBusy(false) }
  }
  return <RentalDialog title={payment ? 'Reverse payment record' : 'Reopen payroll for correction'} onClose={() => { if (!busy) onClose() }}><form className="payroll-editor" onSubmit={save} data-permission-scope="payroll.correct" aria-busy={busy}>
    <p><strong>{draft.name}</strong></p><div className="payroll-warning">{payment ? <p>This reverses the recorded {payment.method.toLowerCase()} payment of {sar(payment.amount)} ({payment.reference}) and restores that amount to the outstanding salary balance. It does not refund or transfer money. The original record and receipt remain visible.</p> : <p>Only payroll with no remaining recorded payments can be reopened. The approval snapshot stays in history. After correcting the draft, approve it again before recording payments.</p>}</div>
    <fieldset disabled={busy}><legend>Correction reason</legend><label>Reason<textarea maxLength={1000} required value={reason} onChange={e => setReason(e.target.value)} /></label><label className="payroll-check"><input type="checkbox" required checked={checked} onChange={e => setChecked(e.target.checked)} /><span>{payment ? 'I confirm this entry is incorrect, or the payment was reversed outside MAK, and the salary balance should be restored.' : 'I confirm the payroll needs correction and will require a new approval.'}</span></label></fieldset>
    {error && <p className="booking-error" role="alert">{error}</p>}<div className="payroll-dialog-actions"><button className="booking-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="booking-primary" type="submit" data-permission="payroll.correct" disabled={busy || !checked}>{busy ? 'Saving…' : payment ? 'Reverse payment record' : 'Reopen payroll'}</button></div>
  </form></RentalDialog>
}

function PaymentReceipt({ draft, payment, onClose, onSaved }) {
  const [file,setFile] = useState(null), [busy,setBusy] = useState(false), [error,setError] = useState('')
  const save = async e => {
    e.preventDefault(); if (busy || !file) return
    const invalid = receiptError(file); if (invalid) { setError(invalid); return }
    setBusy(true);setError('')
    try { await attachPayrollReceipt(draft.id,payment.id,draft.version,file);onSaved('Payment proof attached. The original proof will be retained with the payment record.') } catch (err) { setError(err.message);setBusy(false) }
  }
  return <RentalDialog title="Attach payment proof" onClose={() => { if (!busy) onClose() }}><form className="payroll-editor" onSubmit={save} data-permission-scope="payroll.pay" data-upload-permission="payroll.pay"><p>{payment.reference} · {sar(payment.amount)}</p><label>Receipt or transfer proof<input type="file" required accept="application/pdf,image/png,image/jpeg,image/webp" data-permission="payroll.pay" disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)} /></label><p className="payroll-help">PDF or image, up to 5 MB. Attached proof is retained with the original payment, including if that payment record is later reversed.</p>{error && <p role="alert" className="booking-error">{error}</p>}<div className="payroll-dialog-actions"><button className="booking-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="booking-primary" type="submit" data-permission="payroll.pay" disabled={busy || !file}>{busy ? 'Attaching…' : 'Attach receipt'}</button></div></form></RentalDialog>
}

export default function PayrollSettlementPanel({ draft, user, dirty, onSaved }) {
  const [action,setAction] = useState(null)
  const [downloading,setDownloading] = useState(false), [downloadError,setDownloadError] = useState('')
  const downloadPayslip = async () => {
    if (downloading) return
    setDownloading(true); setDownloadError('')
    try { await downloadPayrollPayslip(draft) } catch (err) { setDownloadError(err.message) } finally { setDownloading(false) }
  }
  const approved = Boolean(draft.approvalId), hasPayments = Number(draft.paid || 0) > 0
  const canApprove = user.permissions.includes('payroll.approve'), canPay = user.permissions.includes('payroll.pay'), canCorrect = user.permissions.includes('payroll.correct')
  return <section className="payroll-editor payroll-settlement" aria-label="Payroll approval and payments">
    <h3>Approval and payments</h3><dl className="payroll-totals"><div><dt>Payment status</dt><dd>{draft.paymentStatus}</dd></div><div><dt>Bank paid</dt><dd>{sar(draft.bankPaid || 0)}</dd></div><div><dt>Cash paid</dt><dd>{sar(draft.cashPaid || 0)}</dd></div><div><dt>Recorded payments</dt><dd>{sar(draft.paid || 0)}</dd></div><div><dt>Outstanding cash salary</dt><dd>{approved ? sar(draft.outstanding) : 'Awaiting approval'}</dd></div></dl>
    {dirty && !approved && <p className="payroll-warning">Save your monthly adjustments before approving this payroll.</p>}
    <div className="payroll-dialog-actions">{!approved && canApprove && <button type="button" className="booking-primary" data-permission="payroll.approve" disabled={dirty} onClick={() => setAction({type:'approve'})}>Review &amp; approve payroll</button>}{approved && canPay && Number(draft.outstanding) > 0 && <button type="button" className="booking-primary" data-permission="payroll.pay" onClick={() => setAction({type:'pay'})}>Record salary payment</button>}{approved && canCorrect && <button type="button" className="booking-secondary" data-permission="payroll.correct" disabled={hasPayments} title={hasPayments ? 'Reverse incorrect payment records before reopening salary figures.' : undefined} onClick={() => setAction({type:'reopen'})}>Reopen payroll for correction</button>}</div>
    {approved && <div className="payroll-payslip-action"><button type="button" className="booking-secondary" data-permission="payroll.read" disabled={downloading} onClick={downloadPayslip}>{downloading ? 'Preparing payslip…' : 'Download payslip (PDF)'}</button><p className="payroll-help">Uses approved salary figures and the latest recorded payments. Unpaid amounts remain clearly shown.</p></div>}
    {downloadError && <p className="booking-error" role="alert">{downloadError}</p>}
    <h3>Payment history</h3>{!draft.payments.length && <p className="payroll-help">No bank or cash payments have been recorded.</p>}
    {draft.payments.map(payment => <article className={`payroll-payment-entry${payment.reversedAt ? ' is-reversed' : ''}`} key={payment.id}>
      <div className="payroll-payment-heading"><strong>{payment.method === 'BANK' ? 'Bank payment' : 'Cash payment'} · {sar(payment.amount)}</strong><span className={`payroll-state ${payment.reversedAt ? 'reversed' : 'paid'}`}>{payment.reversedAt ? 'Reversed record' : 'Recorded'}</span></div><p>{payrollDate(payment.paidOn)} · {payment.reference}</p><p className="payroll-help">Recorded by {payment.recordedBy} · {payrollInstant(payment.recordedAt)}</p>{payment.notes && <p>{payment.notes}</p>}
      {payment.account && <details><summary>Receiving account used</summary><dl className="payroll-earnings">{[['Account holder',payment.account.accountName],['Bank',payment.account.bankName],['IBAN',payment.account.iban],['Account number',payment.account.accountNumber]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>}
      {payment.reversedAt && <p className="payroll-warning">Reversed by {payment.reversedBy} · {payrollInstant(payment.reversedAt)}<br />Reason: {payment.reversalReason}</p>}
      <div className="payroll-payment-links">{payment.receipt ? <><a href={apiFileUrl(payment.receipt.url)} target="_blank" rel="noopener noreferrer">Open receipt<span className="finance-visually-hidden"> in a new tab</span></a><a href={`${apiFileUrl(payment.receipt.url)}?download=true`} download={payment.receipt.name}>Download receipt</a></> : <span className="payroll-help">No payment proof attached</span>}{approved && !payment.reversedAt && !payment.receipt && canPay && <button type="button" className="booking-secondary" data-permission="payroll.pay" onClick={() => setAction({type:'receipt',payment})}>Attach receipt</button>}{approved && !payment.reversedAt && canCorrect && <button type="button" className="booking-secondary" data-permission="payroll.correct" onClick={() => setAction({type:'reverse',payment})}>Reverse payment record</button>}</div>
    </article>)}
    <h3>Approval history</h3>{!draft.approvals.length && <p className="payroll-help">No approval yet. Approval locks the saved salary figures and does not record a payment.</p>}
    {draft.approvals.map((a,i) => <details className="payroll-approval-entry" key={a.id}><summary>Approval {i+1} · {sar(a.netCash)} · {a.reopenedAt ? 'Reopened for correction' : 'Current approval'}</summary><p>{a.approvedBy} · {payrollInstant(a.approvedAt)}</p><p>Review: {a.reviewNote}</p>{a.reopenedAt && <p className="payroll-warning">Reopened by {a.reopenedBy} · {payrollInstant(a.reopenedAt)}<br />Reason: {a.reopenReason}</p>}<dl className="payroll-earnings"><div><dt>Locked basic salary</dt><dd>{sar(a.snapshot.salary.basicSalary)}</dd></div><div><dt>Locked cash earnings</dt><dd>{sar(a.snapshot.totals.cashEarnings)}</dd></div><div><dt>Locked deductions</dt><dd>{sar(a.snapshot.totals.deductions)}</dd></div><div><dt>Locked noncash benefits</dt><dd>{sar(a.snapshot.totals.benefits)}</dd></div><div><dt>Locked net cash</dt><dd>{sar(a.netCash)}</dd></div></dl>{a.snapshot.adjustments.map((adjustment,index) => <p key={index}>{adjustment.name} · {sar(adjustment.amount)} · {adjustment.kind === 'DEDUCTION' ? 'Deduction' : 'Addition'}<br />{adjustment.reason}</p>)}</details>)}
    {action?.type === 'approve' && <SalaryApproval draft={draft} onClose={() => setAction(null)} onSaved={onSaved} />}
    {action?.type === 'pay' && <SalaryPayment draft={draft} onClose={() => setAction(null)} onSaved={onSaved} />}
    {['reopen','reverse'].includes(action?.type) && <PayrollCorrection draft={draft} payment={action.payment} onClose={() => setAction(null)} onSaved={onSaved} />}
    {action?.type === 'receipt' && <PaymentReceipt draft={draft} payment={action.payment} onClose={() => setAction(null)} onSaved={onSaved} />}
  </section>
}
