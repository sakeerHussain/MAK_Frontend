import ActionIcon from '../../app/ActionIcon.jsx'
import { useState } from 'react'
import { errorCsv, parseImportFile, templateCsv, validateImport } from './FleetImport.js'
import { downloadCsv } from '../../shared/lib/csv.js'

export default function FleetBulkUpload({ vehicles, onImport, onCancel }) {
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState(null)
  const preview = async () => {
    if (!file) return
    setBusy(true); setError(''); setRows(null); setSummary(null)
    try {
      const parsed = await parseImportFile(file)
      const validated = validateImport(parsed, vehicles)
      if (!validated.length) throw new Error('No vehicle rows were found.')
      setRows(validated)
    } catch (reason) { setError(reason.message || 'Could not read this file.') }
    finally { setBusy(false) }
  }
  const valid = rows?.filter((row) => !row.errors.length) || []
  const invalid = rows?.filter((row) => row.errors.length) || []
  const importRows = async () => {
    if (!rows) return
    setBusy(true); setError('')
    try {
      const result = await onImport(valid.map((row) => row.car))
      const serverErrors = result.rows.filter((row) => row.error).map((row) => ({ ...valid[row.rowNumber - 2], errors: [row.error] }))
      setSummary({ successful: result.successful, failed: invalid.length + result.failed, errors: [...invalid, ...serverErrors] })
    } catch (reason) { setError(reason.message || 'Could not import vehicles.') }
    finally { setBusy(false) }
  }
  return <div className="fleet-bulk-content">
    {!summary ? <>
      <p className="fleet-form-help">Import CSV, XLSX, or XLS files. Download the template for supported columns and an example. Rows are previewed and validated before being saved to the database.</p>
      <div className="fleet-bulk-actions"><button type="button" className="fleet-secondary-button" onClick={() => downloadCsv('fleet-import-template.csv', templateCsv())}><ActionIcon name="download" size={16} /> Download Template</button><span>Maximum 2,000 rows · 5 MB</span></div>
      <label className="fleet-upload-drop">Choose CSV / Excel file<input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => { setFile(event.target.files?.[0] || null); setRows(null); setError('') }} />{file && <strong>{file.name}</strong>}</label>
      {error && <p className="fleet-form-error" role="alert">{error}</p>}
      {rows && <><div className="fleet-preview-summary"><span>{rows.length} rows</span><span className="good">{valid.length} ready</span><span className="bad">{invalid.length} need attention</span></div>
        <div className="fleet-import-table-wrap"><table className="fleet-import-table"><thead><tr><th>Row</th><th>Reg No.</th><th>Vehicle ID</th><th>Make / Model</th><th>Result</th></tr></thead><tbody>{rows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.car.registration || '—'}</td><td>{row.car.vehicleId || '—'}</td><td>{row.car.make} {row.car.model}</td><td className={row.errors.length ? 'bad' : 'good'}>{row.errors.length ? row.errors.join('; ') : 'Ready'}</td></tr>)}</tbody></table></div>
        {invalid.length > 0 && <button type="button" className="fleet-link-button" onClick={() => downloadCsv('fleet-import-errors.csv', errorCsv(invalid))}>Download error report</button>}
      </>}
      <div className="fleet-dialog-actions"><button type="button" className="fleet-secondary-button" disabled={busy} onClick={onCancel}>Cancel</button>{!rows ? <button type="button" className="fleet-primary-button" disabled={!file || busy} onClick={preview}><ActionIcon name="eye" size={16} /> {busy ? 'Validating…' : 'Preview & Validate'}</button> : <button type="button" className="fleet-primary-button" disabled={!valid.length || busy} onClick={importRows}><ActionIcon name="upload" size={16} /> {busy ? 'Importing…' : `Import ${valid.length} Valid ${valid.length === 1 ? 'Row' : 'Rows'}`}</button>}</div>
    </> : <>
      <div className="fleet-import-finished"><span>Import complete</span><strong>{summary.successful} successful</strong><strong className="bad">{summary.failed} failed</strong><p>Successful rows were saved to the Fleet database. Failed rows were skipped.</p></div>
      {summary.failed > 0 && <button type="button" className="fleet-link-button" onClick={() => downloadCsv('fleet-import-errors.csv', errorCsv(summary.errors))}>Download error report</button>}
      <div className="fleet-dialog-actions"><button type="button" className="fleet-primary-button" onClick={onCancel}><ActionIcon name="check" size={16} /> Done</button></div>
    </>}
  </div>
}
