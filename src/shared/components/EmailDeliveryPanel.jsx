import { useEffect, useState } from 'react'
import Icon from '../../app/Icon.jsx'
import { apiRequest } from '../lib/apiRequest.js'

export default function EmailDeliveryPanel({ kind, recordId, canSend = false, recipient }) {
  const [delivery, setDelivery] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    const refresh = () => apiRequest(`/emails?kind=${encodeURIComponent(kind)}&recordId=${recordId}`)
      .then((result) => { if (active) { setDelivery(result); setError('') } })
      .catch((failure) => { if (active) setError(failure.message) })
    refresh()
    const timer = setInterval(refresh, 15000)
    return () => { active = false; clearInterval(timer) }
  }, [kind, recordId])
  const perform = async (path) => {
    setBusy(true); setError('')
    try {
      await apiRequest(path, 'POST')
      setDelivery(await apiRequest(`/emails?kind=${encodeURIComponent(kind)}&recordId=${recordId}`))
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <section className="booking-panel booking-detail-card" style={{ margin: '18px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div><h3>Email delivery</h3>{recipient && <p>{recipient}</p>}</div>
      {canSend && <button type="button" className="booking-secondary" disabled={busy || !delivery || delivery.messages.some((message) => message.status !== 'Sent')} onClick={() => perform(`/invoices/${recordId}/email`)}><Icon name="mail" size={16} /> {busy ? 'Queueing...' : delivery?.messages.some((message) => message.status === 'Sent') ? 'Resend Invoice' : 'Email Invoice'}</button>}
    </div>
    {delivery && !delivery.configured && <p>SMTP is not enabled. Emails remain queued until the administrator configures the sender.</p>}
    {delivery && !delivery.messages.length && <p>No email notifications queued.</p>}
    {delivery?.messages.slice(0, 5).map((message) => <div key={message.id} style={{ borderTop: '1px solid #edf0f3', padding: '10px 0' }}>
      <strong>{message.subject}</strong><p>{message.recipient} · {message.status === 'Sent' ? 'Accepted by mail server' : message.status} · {message.sentAt ? new Date(message.sentAt).toLocaleString() : `${message.attempts} delivery attempts`}</p>
      {message.status === 'Failed' && <><p className="booking-error">{message.error}</p><button type="button" className="booking-secondary" disabled={busy} onClick={() => perform(`/emails/${message.id}/retry`)}>Retry Email</button></>}
    </div>)}
    {error && <p className="booking-error" role="alert">{error}</p>}
  </section>
}
