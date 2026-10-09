import { useState } from 'react'
import { downloadCsv } from '../../shared/lib/csv.js'
import { driverErrorCsv, driverTemplateCsv, parseDriverImportFile, validateDriverImport } from './DriverImport.js'

export default function DriverBulkUpload({ drivers, onImport, onCancel }) {
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState(null)
  const valid = rows?.filter((row) => !row.errors.length) || []
  const invalid = rows?.filter((row) => row.errors.length) || []
  const preview = async () => {
    if (!file) return
    setBusy(true); setError(''); setRows(null); setSummary(null)
    try {
      const parsed = await parseDriverImportFile(file)
      const validated = validateDriverImport(parsed, drivers)
      if (!validated.length) throw new Error('No driver rows were found.')
      setRows(validated)
    } catch (reason) { setError(reason.message || 'Could not read this file.') }
    finally { setBusy(false) }
  }
  const importRows = async () => {
    setBusy(true); setError('')
    try {
      const result = await onImport(valid.map((row) => row.driver))
      const serverErrors = result.rows.filter((row) => row.error).map((row) => ({ ...valid[row.rowNumber - 2], errors: [row.error] }))
      setSummary({ successful: result.successful, failed: invalid.length + result.failed, errors: [...invalid, ...serverErrors] })
    } catch (reason) { setError(reason.message || 'Could not import drivers.') }
    finally { setBusy(false) }
  }
  return <div className="driver-bulk-content">
    {!summary ? <>
      <p className="driver-form-help">Import CSV, XLSX, or XLS files. Download the template for supported columns and an example. Rows are validated before they are added. Upload document and certification files separately after import.</p>
      <div className="driver-bulk-template"><button type="button" className="driver-secondary" onClick={() => downloadCsv('driver-import-template.csv', driverTemplateCsv())}>Download Template</button><span>Maximum 2,000 rows · 5 MB</span></div>
      <label className="driver-bulk-drop"><strong>Choose CSV / Excel file</strong><span>{file?.name || 'Drop a file here or browse your computer'}</span><em>Browse file</em><input type="file" accept=".csv,.xlsx,.xls" aria-label="Choose driver import file" onChange={(event) => { setFile(event.target.files?.[0] || null); setRows(null); setError(''); setSummary(null) }} /></label>
      {error && <p className="driver-form-error" role="alert">{error}</p>}
      {rows && <><div className="driver-import-summary"><span>{rows.length} rows</span><span className="good">{valid.length} ready</span><span className="bad">{invalid.length} need attention</span></div><div className="driver-import-scroll"><table><thead><tr><th>Row</th><th>Employee ID</th><th>Name</th><th>Phone</th><th>Result</th></tr></thead><tbody>{rows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.driver.employeeId || '—'}</td><td>{row.driver.name || '—'}</td><td>{row.driver.phone || '—'}</td><td className={row.errors.length ? 'bad' : 'good'}>{row.errors.length ? row.errors.join('; ') : 'Ready'}</td></tr>)}</tbody></table></div>{invalid.length > 0 && <button type="button" className="driver-download-errors" onClick={() => downloadCsv('driver-import-errors.csv', driverErrorCsv(invalid))}>Download error report</button>}</>}
      <div className="driver-dialog-actions"><button type="button" className="driver-secondary" disabled={busy} onClick={onCancel}>Cancel</button>{!rows ? <button type="button" className="driver-primary" disabled={!file || busy} onClick={preview}>{busy ? 'Validating…' : 'Preview & Validate'}</button> : <button type="button" className="driver-primary" disabled={!valid.length || busy} onClick={importRows}>{busy ? 'Importing…' : `Import ${valid.length} Valid ${valid.length === 1 ? 'Row' : 'Rows'}`}</button>}</div>
    </> : <><div className="driver-import-finished"><span>Import complete</span><strong>{summary.successful} successful</strong><strong className="bad">{summary.failed} failed</strong><p>Successful rows were saved to the Drivers database. Failed rows were skipped.</p></div>{summary.failed > 0 && <button type="button" className="driver-download-errors" onClick={() => downloadCsv('driver-import-errors.csv', driverErrorCsv(summary.errors))}>Download error report</button>}<div className="driver-dialog-actions"><button type="button" className="driver-primary" onClick={onCancel}>Done</button></div></>}
  </div>
}
