import { useEffect, useState } from 'react'
import { listSecurityAudit } from './AuthApi.js'
import './Access.css'
import './Management.css'
import { FinanceHeading, FinanceReview, FinanceEmpty } from '../../shared/components/FinanceRegister.jsx'
export default function SecurityAuditPage() {
 const [selectedId, setSelectedId] = useState(null)
 const [records, setRecords] = useState([])
 const [error, setError] = useState('')
 const [loading, setLoading] = useState(true)
 useEffect(() => { let active = true; listSecurityAudit().then((value) => { if (active) setRecords(value) }).catch((reason) => { if (active) setError(reason.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
 const selected = records.find((record) => record.id === selectedId)
 const eventName = (record) => record.event.replaceAll('_', ' ')
 return <div className="finance-page management-page"><FinanceHeading title="Audit Log" description="Review account activity and security events." />
  <div className="finance-layout management-layout"><section className="finance-register" aria-label="Account security events"><p className="management-context management-audit-context">The latest 200 account registrations, sign-ins, sign-outs, access changes and password resets.</p>{loading && <p className="access-empty" role="status">Loading security events...</p>}{error && <p className="access-error" role="alert">{error}</p>}<div className="finance-table-scroll" tabIndex={0} role="region" aria-label="Audit table, scroll for all columns"><table className="finance-table management-audit-table"><thead><tr>{['Date / Time', 'Event', 'Actor ID', 'Account ID', 'Details'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{records.map((record) => <tr key={record.id} className={selectedId === record.id ? 'is-selected' : ''}><td><button type="button" className="finance-reference" aria-label={`Review event ${record.id}`} aria-pressed={selectedId === record.id} onClick={() => setSelectedId(record.id)}>{new Date(record.createdAt).toLocaleString()}</button></td><td>{eventName(record)}</td><td>{record.actorId || 'System'}</td><td>{record.targetId || '-'}</td><td>{record.summary}</td></tr>)}</tbody></table></div>{!loading && !error && !records.length && <FinanceEmpty title="No security events yet">Recorded account activity will appear here.</FinanceEmpty>}</section>
  <FinanceReview title="Event Details" subtitle="Details for the selected security event." active={Boolean(selected)} onClose={() => setSelectedId(null)} emptyTitle="Review a security event" emptyText="Select an event's date and time to review its details.">{selected && <dl><dt>Date / Time</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd><dt>Event</dt><dd>{eventName(selected)}</dd><dt>Actor ID</dt><dd>{selected.actorId || 'System'}</dd><dt>Account ID</dt><dd>{selected.targetId || '-'}</dd><dt>Details</dt><dd>{selected.summary}</dd></dl>}</FinanceReview>
  </div></div>
}
