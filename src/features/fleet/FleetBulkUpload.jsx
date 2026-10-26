import ActionIcon from '../../app/ActionIcon.jsx'
import { useEffect, useState } from 'react'
import { errorCsv, parseImportFile, templateCsv, validateImport } from './FleetImport.js'
import { downloadCsv } from '../../shared/lib/csv.js'

export default function FleetBulkUpload({ vehicles, onImport, onSaveDrafts, onBusyChange, onCancel }) {
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState(null)
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false) }, [busy, onBusyChange])
  const preview = async () => {
    if (!file || busy) return
    setBusy(true); setError(''); setRows(null); setSummary(null)
    try {
      const validated = validateImport(await parseImportFile(file), vehicles)
      if (!validated.length) throw new Error('No vehicle rows were found.')
      setRows(validated)
    } catch (reason) { setError(reason.message || 'Could not read this file.') }
    finally { setBusy(false) }
  }
  const valid = rows?.filter(row => !row.errors.length) || []
  const draftRows = rows?.filter(row => row.canSaveDraft) || []
  const blocked = rows?.filter(row => row.errors.length && !row.canSaveDraft) || []
  const save = async asDrafts => {
    if (busy || !rows) return
    const selected = asDrafts ? draftRows : valid
    if (!selected.length) return
    setBusy(true); setError('')
    try {
      const result = asDrafts ? await onSaveDrafts(selected.map(row => row.draftCar)) : await onImport(selected.map(row => row.car))
      const serverErrors = result.rows.filter(row => row.error).map(row => ({ ...selected[row.rowNumber - 2], errors: [row.error] }))
      const failedRows = new Set(result.rows.filter(row => row.error).map(row => row.rowNumber - 2))
      const savedNumbers = new Set(selected.filter((_, index) => !failedRows.has(index)).map(row => row.rowNumber))
      setRows(current => current.filter(row => !savedNumbers.has(row.rowNumber)))
      setSummary({ successful: result.successful, failed: result.failed, errors: serverErrors, asDrafts })
    } catch (reason) { setError(reason.message || 'Could not save these rows.') }
    finally { setBusy(false) }
  }
  return <div className="fleet-bulk-content" data-permission-scope="fleet.create" data-upload-permission="fleet.create">
    <p className="fleet-form-help">Import CSV, XLSX or XLS files, including buses. Complete rows can be added to Fleet. Rows missing operational details can be saved as import drafts without assumed values. Drafts cannot be booked or publicly listed.</p>
    <p className="fleet-form-help">Optional compliance expiry dates use YYYY-MM-DD. Expired dates are flagged and retained. Current document files are still required for handover.</p>
    {!summary && <><div className="fleet-bulk-actions"><button type="button" className="fleet-secondary-button" onClick={() => downloadCsv('fleet-import-template.csv', templateCsv())}><ActionIcon name="download" size={16} /> Download Template</button><span>Maximum 2,000 rows · 5 MB</span></div>
      <label className="fleet-upload-drop">Choose CSV / Excel file<input type="file" accept=".csv,.xlsx,.xls" disabled={busy} onChange={event => { setFile(event.target.files?.[0] || null); setRows(null); setError('') }} />{file && <strong>{file.name}</strong>}</label></>}
    {error && <p className="fleet-form-error" role="alert">{error}</p>}
    {summary && <div className="fleet-import-finished" role="status"><span>{summary.asDrafts ? 'Import drafts saved' : 'Fleet import complete'}</span><strong>{summary.successful} saved</strong>{summary.failed > 0 && <strong className="bad">{summary.failed} failed</strong>}<p>{summary.asDrafts ? 'Open Import drafts in Fleet to complete the missing details. No operational vehicles were created.' : 'Successful rows were added to Fleet.'}</p>{rows.length > 0 && <p>{rows.length} rows remain in this preview.</p>}{summary.failed > 0 && <button type="button" className="fleet-link-button" onClick={() => downloadCsv('fleet-import-errors.csv', errorCsv(summary.errors))}>Download error report</button>}</div>}
    {rows?.length > 0 && <><div className="fleet-preview-summary"><span>{rows.length} rows</span><span className="good">{valid.length} ready for Fleet</span><span>{draftRows.length} can be saved as drafts</span><span className="bad">{blocked.length} blocked</span></div>
      <div className="fleet-import-table-wrap"><table className="fleet-import-table"><thead><tr><th>Row</th><th>Reg No.</th><th>Vehicle ID</th><th>Make / Model</th><th>Compliance expiry dates</th><th>Result</th></tr></thead><tbody>{rows.map(row => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.car.registration || '—'}</td><td>{row.car.vehicleId || '—'}</td><td>{row.car.make} {row.car.model}</td><td><small>Registration: {row.car.registrationExpiryDate || '—'}</small><small>Insurance: {row.car.insuranceExpiryDate || '—'}</small><small>Inspection: {row.car.inspectionExpiryDate || '—'}</small></td><td className={row.errors.length && !row.canSaveDraft ? 'bad' : row.canSaveDraft ? 'fleet-import-warning' : 'good'}>{row.canSaveDraft ? 'Can be saved as import draft' : row.errors.length ? 'Blocked' : 'Ready for Fleet'}{row.errors.length > 0 && <small>{row.errors.join('; ')}</small>}{row.warnings.length > 0 && <small className="fleet-import-warning">{row.warnings.join('; ')}</small>}</td></tr>)}</tbody></table></div>
      {blocked.length > 0 && <button type="button" className="fleet-link-button" onClick={() => downloadCsv('fleet-import-errors.csv', errorCsv(blocked))}>Download blocked-row report</button>}
    </>}
    <div className="fleet-dialog-actions"><button type="button" className="fleet-secondary-button" disabled={busy} onClick={onCancel}>{summary ? 'Done' : 'Cancel'}</button>{!rows ? <button type="button" className="fleet-primary-button" disabled={!file || busy} onClick={preview}><ActionIcon name="eye" size={16} /> {busy ? 'Validating…' : 'Preview & Validate'}</button> : <>
      {draftRows.length > 0 && <button type="button" className="fleet-primary-button" data-permission="fleet.create" disabled={busy} onClick={() => save(true)}>{busy ? 'Saving…' : `Save ${draftRows.length} Import ${draftRows.length === 1 ? 'Draft' : 'Drafts'}`}</button>}
      {valid.length > 0 && <button type="button" className="fleet-primary-button" data-permission="fleet.create" disabled={busy} onClick={() => save(false)}>Import {valid.length} Complete {valid.length === 1 ? 'Row' : 'Rows'}</button>}
    </>}</div>
  </div>
}
