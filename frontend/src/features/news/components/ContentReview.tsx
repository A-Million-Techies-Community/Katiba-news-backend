import { useEffect, useState } from 'react'
import { sessionFetch } from '../../../auth/session'

type Submission = { id: number; slug: string; title: string; content: string; status: string; feedback: string; author_username: string }
function readable(content: string) {
  try { return Object.values(JSON.parse(content)).filter(value => typeof value === 'string').join('\n\n') } catch { return content }
}
export default function ContentReview() {
  const [kind, setKind] = useState('articles')
  const [items, setItems] = useState<Submission[]>([])
  const [selected, setSelected] = useState<Submission | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  async function load() {
    const response = await sessionFetch(`/api/${kind}/`)
    if (!response.ok) throw new Error('Could not load submissions.')
    const data = await response.json(); setItems(Array.isArray(data) ? data : data.results || [])
  }
  useEffect(() => {
    let active = true
    void sessionFetch(`/api/${kind}/`).then(async response => {
      if (!response.ok) throw new Error('Could not load submissions.')
      const data = await response.json(); if (active) setItems(Array.isArray(data) ? data : data.results || [])
    }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [kind])
  async function decide(status: string) {
    if (!selected) return
    setBusy(true); setError('')
    try {
      const response = await sessionFetch(`/api/${kind}/${selected.slug}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, feedback }) })
      const data = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(data))
      await load(); setSelected(null); setFeedback('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not record decision.') }
    finally { setBusy(false) }
  }
  return <section className="nd-panel"><div className="nd-panel-heading"><div><h2>Articles & blogs review</h2><p>Review submissions, return feedback, and publish approved work.</p></div><label>Content type<select disabled={busy} value={kind} onChange={e => { setLoading(true); setError(''); setSelected(null); setKind(e.target.value) }}><option value="articles">Articles</option><option value="blogs">Blogs</option></select></label></div>
    {error && <p className="nd-error" role="alert">{error}</p>}
    {selected ? <><button disabled={busy} onClick={() => setSelected(null)}>← Back to submissions</button><h2 style={{ marginTop: 24 }}>{selected.title}</h2><p>By {selected.author_username} · {selected.status === 'under_review' ? 'Awaiting review' : selected.status === 'rejected' ? 'Needs changes' : selected.status}</p><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: '24px 0' }}>{readable(selected.content)}</div><label>Feedback<textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} /></label><div className="nd-actions" style={{ marginTop: 16 }}>{selected.status === 'under_review' && <><button className="nd-primary" disabled={busy} onClick={() => void decide('approved')}>Approve</button><button className="nd-danger" disabled={busy || !feedback.trim()} onClick={() => void decide('rejected')}>Return with feedback</button></>}{selected.status === 'approved' && <button className="nd-primary" disabled={busy} onClick={() => void decide('published')}>Publish</button>}</div></>
    : loading ? <p role="status">Loading submissions…</p> : <div className="nd-table-wrap"><table><thead><tr><th>Title</th><th>Writer</th><th>Status</th><th>Review</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.author_username}</td><td>{item.status === 'under_review' ? 'Awaiting review' : item.status === 'rejected' ? 'Needs changes' : item.status}</td><td><button onClick={() => { setSelected(item); setFeedback(item.feedback || '') }}>Open</button></td></tr>)}</tbody></table>{items.length === 0 && <p className="nd-empty">No submissions yet.</p>}</div>}
  </section>
}
