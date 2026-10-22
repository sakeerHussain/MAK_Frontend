import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import { downloadCsv } from '../../shared/lib/csv.js'
import { employeeErrorCsv, employeeTemplateCsv, parseEmployeeImportFile, validateEmployeeImport } from './EmployeeImport.js'

export default function EmployeeBulkUpload({ employees, onImport, onCancel }) {
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
      const parsed = await parseEmployeeImportFile(file)
      const validated = validateEmployeeImport(parsed, employees)
      if (!validated.length) throw new Error('No employee rows were found.')
      setRows(validated)
    } catch (reason) { setError(reason.message || 'Could not read this file.') }
    finally { setBusy(false) }
  }
  const importRows = async () => {
    setBusy(true); setError('')
    try {
      const result = await onImport(valid.map((row) => row.employee))
      const serverErrors = new Map(result.rows.filter((row) => row.error).map((row) => [valid[row.rowNumber - 2].rowNumber, row.error]))
      setRows((current) => current.map((row) => serverErrors.has(row.rowNumber) ? { ...row, errors: [...row.errors, serverErrors.get(row.rowNumber)] } : row))
      setSummary({ successful: result.successful, failed: result.failed + invalid.length })
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <div className="driver-bulk-content">
    {!summary ? <>
      <p className="driver-form-help">Import CSV, XLSX, or XLS files. Download the template for supported columns and an example. Rows are validated before import. Upload employee documents separately afterward.</p>
      <div className="driver-bulk-template"><button type="button" className="driver-secondary" onClick={() => downloadCsv('employee-import-template.csv', employeeTemplateCsv())}><ActionIcon name="download" size={16} /> Download Template</button><span>Maximum 2,000 rows · 5 MB</span></div>
      <label className="driver-bulk-drop"><strong>Choose CSV / Excel file</strong><span>{file?.name || 'Drop a file here or browse your computer'}</span><em>Browse file</em><input type="file" accept=".csv,.xlsx,.xls" aria-label="Choose employee import file" onChange={(event) => { setFile(event.target.files?.[0] || null); setRows(null); setError(''); setSummary(null) }} /></label>
      {error && <p className="driver-form-error" role="alert">{error}</p>}
      {rows && <><div className="driver-import-summary"><span>{rows.length} rows</span><span className="good">{valid.length} ready</span><span className="bad">{invalid.length} need attention</span></div><div className="driver-import-scroll"><table><thead><tr><th>Row</th><th>Employee ID</th><th>Name</th><th>Department</th><th>Result</th></tr></thead><tbody>{rows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.employee.employeeId || '—'}</td><td>{row.employee.name || '—'}</td><td>{row.employee.department || '—'}</td><td className={row.errors.length ? 'bad' : 'good'}>{row.errors.length ? row.errors.join('; ') : 'Ready'}</td></tr>)}</tbody></table></div>{invalid.length > 0 && <button type="button" className="driver-download-errors" onClick={() => downloadCsv('employee-import-errors.csv', employeeErrorCsv(invalid))}>Download error report</button>}</>}
      <div className="driver-dialog-actions"><button type="button" className="driver-secondary" onClick={onCancel}>Cancel</button>{!rows ? <button type="button" className="driver-primary" disabled={!file || busy} onClick={preview}><ActionIcon name="eye" size={16} /> {busy ? 'Validating…' : 'Preview & Validate'}</button> : <button type="button" className="driver-primary" disabled={busy || !valid.length} onClick={importRows}><ActionIcon name="upload" size={16} /> Import {valid.length} Valid {valid.length === 1 ? 'Row' : 'Rows'}</button>}</div>
    </> : <><div className="driver-import-finished"><span>Import complete</span><strong>{summary.successful} successful</strong><strong className="bad">{summary.failed} failed</strong><p>Successful rows were added to Employees. Failed rows were skipped.</p></div>{summary.failed > 0 && <button type="button" className="driver-download-errors" onClick={() => downloadCsv('employee-import-errors.csv', employeeErrorCsv(invalid))}>Download error report</button>}<div className="driver-dialog-actions"><button type="button" className="driver-primary" onClick={onCancel}><ActionIcon name="check" size={16} /> Done</button></div></>}
  </div>
}
