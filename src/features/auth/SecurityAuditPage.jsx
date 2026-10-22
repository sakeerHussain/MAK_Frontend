import { useEffect, useState } from 'react'
import { listSecurityAudit } from './AuthApi.js'
import './Access.css'
export default function SecurityAuditPage() {
 const [records, setRecords] = useState([])
 const [error, setError] = useState('')
 const [loading, setLoading] = useState(true)
 useEffect(() => { let active = true; listSecurityAudit().then((value) => { if (active) setRecords(value) }).catch((reason) => { if (active) setError(reason.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
 return <section className="access-panel"><p className="admin-page-context">The latest 200 account registrations, sign-ins, sign-outs, access changes and password resets.</p>{loading && <p className="access-empty">Loading security events...</p>}{error && <p className="access-error" role="alert">{error}</p>}<div className="access-table-scroll"><table><thead><tr><th>Date / Time</th><th>Event</th><th>Actor ID</th><th>Account ID</th><th>Details</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{new Date(record.createdAt).toLocaleString()}</td><td>{record.event.replaceAll('_', ' ')}</td><td>{record.actorId || 'System'}</td><td>{record.targetId || '-'}</td><td>{record.summary}</td></tr>)}</tbody></table></div></section>
}
