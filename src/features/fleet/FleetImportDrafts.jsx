import { useEffect, useState } from 'react'
import RentalDialog from '../../shared/components/RentalDialog.jsx'
import FleetCarForm from './FleetCarForm.jsx'
import { listVehicleImportDrafts, updateVehicleImportDraft, completeVehicleImportDraft, discardVehicleImportDraft } from './FleetApi.js'

const labels = { year: 'Registration year', type: 'Type', seats: 'Seats', transmission: 'Transmission', fuelType: 'Fuel type', dailyRate: 'Daily SAR rate', ownership: 'Ownership', onSite: 'On-site status', vendor: 'Vendor' }

export default function FleetImportDrafts({ refreshToken, vehicles, vendors, onCompleted }) {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [discarding, setDiscarding] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    listVehicleImportDrafts().then(result => { if (active) { setDrafts(result); setError('') } })
      .catch(reason => { if (active) setError(reason.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshToken])
  const reload = async () => {
    setLoading(true); setError('')
    try { setDrafts(await listVehicleImportDrafts()) } catch (reason) { setError(reason.message) }
    finally { setLoading(false) }
  }
  const saveDraft = async car => {
    setBusy(true); setNotice('')
    try {
      const saved = await updateVehicleImportDraft(editing, car)
      setDrafts(current => current.map(row => row.id === saved.id ? saved : row)); setEditing(saved)
      setNotice('Draft saved. Complete the remaining required details before adding this vehicle to Fleet.')
    } finally { setBusy(false) }
  }
  const complete = async car => {
    setBusy(true); setNotice('')
    try {
      const saved = await completeVehicleImportDraft(editing, car)
      setDrafts(current => current.filter(row => row.id !== editing.id)); setEditing(null)
      onCompleted(saved)
    } finally { setBusy(false) }
  }
  const discard = async () => {
    setBusy(true); setError('')
    try { await discardVehicleImportDraft(discarding); setDrafts(current => current.filter(row => row.id !== discarding.id)); setDiscarding(null) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  return <section className="fleet-import-drafts" aria-labelledby="fleet-import-drafts-title">
    <div className="fleet-bulk-actions"><div><h2 id="fleet-import-drafts-title">Import drafts <span>({drafts.length})</span></h2><p className="fleet-form-help">Incomplete imports are saved here. They are excluded from Fleet availability, bookings and public listings until completed.</p></div><button type="button" className="fleet-secondary-button" data-permission="fleet.read" onClick={reload} disabled={loading}>Reload drafts</button></div>
    {error && !discarding && <p className="fleet-form-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading import drafts…</p> : drafts.length ? <div className="fleet-import-table-wrap"><table className="fleet-import-table"><thead><tr><th>Vehicle ID / Registration</th><th>Make / Model</th><th>Details to complete</th><th>Actions</th></tr></thead><tbody>{drafts.map(draft => <tr key={draft.id}><td><strong>{draft.details.vehicleId}</strong><small>{draft.details.registration}</small></td><td>{draft.details.make} {draft.details.model}</td><td>{draft.missingFields.length ? draft.missingFields.map(field => labels[field] || field).join(', ') : 'Ready for completion review'}</td><td><div className="fleet-draft-actions"><button type="button" className="fleet-secondary-button" data-permission="fleet.create|fleet.edit" onClick={() => { setEditing(draft); setNotice('') }}>Complete details for {draft.details.registration}</button><button type="button" className="fleet-link-button" data-permission="fleet.archive" onClick={() => { setDiscarding(draft); setError('') }}>Discard import draft for {draft.details.registration}</button></div></td></tr>)}</tbody></table></div> : <p className="fleet-form-help">No import drafts. Use Bulk Upload to save rows with missing details.</p>}
    {editing && <RentalDialog title={`Complete import draft · ${editing.details.registration}`} wide onClose={() => { if (!busy) setEditing(null) }}>
      <p className="fleet-form-help">Unknown values remain blank. Saving a draft keeps it unavailable for booking. Complete all required fields to add it to Fleet; upload document files from Fleet afterwards.</p>
      {notice && <p className="fleet-form-help" role="status">{notice}</p>}
      <FleetCarForm key={editing.id} initial={editing.details} fromImportDraft vehicles={vehicles} vendors={vendors} onSaveImportDraft={saveDraft} onSave={complete} onCancel={() => { if (!busy) setEditing(null) }} />
    </RentalDialog>}
    {discarding && <RentalDialog title="Discard import draft?" onClose={() => { if (!busy) setDiscarding(null) }}>
      <div className="booking-dialog-body"><p>Discard the saved import for <strong>{discarding.details.vehicleId} · {discarding.details.registration}</strong>? This removes only the import draft. No Fleet vehicle or booking will be deleted.</p>{error && <p className="fleet-form-error" role="alert">{error}</p>}<div className="fleet-dialog-actions"><button type="button" className="fleet-secondary-button" disabled={busy} onClick={() => setDiscarding(null)}>Keep draft</button><button type="button" className="fleet-primary-button" data-permission="fleet.archive" disabled={busy} onClick={discard}>{busy ? 'Discarding…' : 'Discard import draft'}</button></div></div>
    </RentalDialog>}
  </section>
}
