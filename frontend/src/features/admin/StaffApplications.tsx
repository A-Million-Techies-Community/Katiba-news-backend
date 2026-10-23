import { useEffect, useState } from 'react'
import { sessionFetch } from '../../auth/session'

type Application = { id: number; username: string; email: string; first_name: string; last_name: string; requested_role: 'Writer' | 'Editor'; experience: string; portfolio_url: string; status: string; feedback: string; submitted_at: string; reviewer_username: string | null }
export default function StaffApplications() {
  const [items, setItems] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [feedback, setFeedback] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    void sessionFetch('/api/users/staff-applications/review/').then(async response => {
      if (!response.ok) throw new Error('Could not load applications.')
      const data = await response.json()
      if (active) setItems(data)
    }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  async function decide(item: Application, decision: 'approved' | 'rejected') {
    setError(''); setNotice('')
    if (decision === 'rejected' && !feedback[item.id]?.trim()) { setError('Please give the applicant a reason before rejecting.'); return }
    setBusy(item.id)
    try {
      const response = await sessionFetch(`/api/users/staff-applications/${item.id}/decision/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, feedback: feedback[item.id] || '' }) })
      const data = await response.json()
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data))
      setItems(current => current.map(application => application.id === item.id ? data : application))
      setNotice(`${item.username}'s ${item.requested_role.toLowerCase()} application was ${decision}.`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save decision.') }
    finally { setBusy(null) }
  }
  return <><div className="nd-heading"><div><p className="nd-eyebrow">STAFF APPLICATIONS</p><h1>Writer &amp; editor applications</h1><p>Review experience before granting workspace access.</p></div></div><section className="nd-panel"><label>Show applications <select value={filter} onChange={e => setFilter(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></select></label></section>{error && <p className="nd-error" role="alert">{error}</p>}{notice && <p className="nd-notice" role="status">{notice}</p>}{loading ? <p role="status">Loading applications…</p> : !items.some(item => filter === 'all' || item.status === filter) ? <p className="nd-empty">No {filter === 'all' ? '' : filter} applications.</p> : items.filter(item => filter === 'all' || item.status === filter).map(item => <article className="nd-panel" key={item.id}><div className="nd-panel-heading"><h2>{item.first_name} {item.last_name}</h2><strong>{item.requested_role} · {item.status}</strong></div><p>{item.username} · {item.email}</p><p>Submitted {new Date(item.submitted_at).toLocaleDateString('en-KE')}</p><h3>Experience</h3><p className="staff-application-experience">{item.experience}</p>{/^https?:\/\//.test(item.portfolio_url) && <p><a href={item.portfolio_url} target="_blank" rel="noopener noreferrer">View sample work ↗</a></p>}{item.status === 'pending' ? <><label htmlFor={`feedback-${item.id}`}>Feedback (required when rejecting)</label><textarea id={`feedback-${item.id}`} className="staff-review-feedback" maxLength={2000} rows={3} value={feedback[item.id] || ''} onChange={e => setFeedback(current => ({ ...current, [item.id]: e.target.value }))} /><div className="nd-actions"><button className="nd-primary" disabled={busy !== null} onClick={() => void decide(item, 'approved')}>{busy === item.id ? 'Saving…' : `Approve ${item.requested_role.toLowerCase()}`}</button><button className="nd-danger" disabled={busy !== null} onClick={() => void decide(item, 'rejected')}>Reject application</button></div></> : <><p>Reviewed by {item.reviewer_username || 'administrator'}</p>{item.feedback && <p>{item.feedback}</p>}</>}</article>)}</>
}
