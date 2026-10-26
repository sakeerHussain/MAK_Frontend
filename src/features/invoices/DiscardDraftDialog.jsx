import { useCallback, useState } from 'react'
import useRentalDialog from '../../shared/hooks/useRentalDialog.js'

export default function DiscardDraftDialog({ invoice, onConfirm, onClose }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const close = useCallback(() => { if (!saving) onClose() }, [saving, onClose])
  useRentalDialog(true, close)
  const discard = async () => {
    if (saving) return
    setSaving(true); setError('')
    try { await onConfirm(invoice) }
    catch (failure) { setError(failure.message); setSaving(false) }
  }
  return <div className="booking-overlay"><div className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="discard-draft-title" aria-describedby="discard-draft-description" aria-busy={saving}>
    <div className="booking-dialog-heading"><h2 id="discard-draft-title">Discard draft #{invoice.id}?</h2><button type="button" aria-label="Close discard draft" disabled={saving} onClick={close}>×</button></div>
    <div className="booking-dialog-body"><p id="discard-draft-description">This draft will leave the invoice register. Its {invoice.sources.length === 1 ? 'linked rental will' : `${invoice.sources.length} linked rentals will`} return to Billing so you can create a new draft or change the grouping.</p>
    <p>Booking payments and refunds will be preserved. The discarded draft will be retained in history. Issued invoices cannot be discarded.</p>
    <ul>{invoice.sources.map((source) => <li key={`${source.kind}-${source.id}`}>{source.reference}</li>)}</ul>
    {error && <p className="booking-error" role="alert">{error}</p>}
    <div className="booking-dialog-actions"><button type="button" className="booking-secondary" disabled={saving} onClick={close}>Keep Draft</button><button type="button" className="booking-primary" disabled={saving} onClick={discard}>{saving ? 'Discarding…' : 'Discard Draft'}</button></div></div>
  </div></div>
}
