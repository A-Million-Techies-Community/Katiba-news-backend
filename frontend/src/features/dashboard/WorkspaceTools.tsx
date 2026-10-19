import { useEffect, useState } from 'react'
import { sessionFetch } from '../../auth/session'
import NewsImage from '../news/components/NewsImage'

type Item = { id: string | number; url?: string; story?: number | null; content?: string; user_username?: string; post?: number; created_at: string }
export default function WorkspaceTools({ tool }: { tool: 'media' | 'comments' }) {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const endpoint = tool === 'media' ? '/api/news/media/' : '/api/blogs/moderation/comments/'
  async function load() {
    const response = await sessionFetch(endpoint)
    if (!response.ok) throw new Error('Could not load this workspace. Check your access or sign in again.')
    const data = await response.json(); setItems(Array.isArray(data) ? data : data.results || [])
  }
  useEffect(() => {
    let active = true
    void sessionFetch(endpoint).then(async response => {
      if (!response.ok) throw new Error('Could not load this workspace. Check your access or sign in again.')
      const data = await response.json()
      if (active) setItems(Array.isArray(data) ? data : data.results || [])
    }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [endpoint])
  async function remove(item: Item) {
    if (!window.confirm(tool === 'media' ? 'Delete this unused upload?' : 'Remove this comment?')) return
    setBusy(true); setError('')
    try {
      const response = await sessionFetch(`${endpoint}${item.id}/`, { method: 'DELETE' })
      if (!response.ok) throw new Error(JSON.stringify(await response.json()))
      await load(); setNotice('Removed successfully.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove item.') }
    finally { setBusy(false) }
  }
  async function upload(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try {
      const body = new FormData(); body.append('file', file)
      const response = await sessionFetch('/api/news/images/', { method: 'POST', body })
      if (!response.ok) throw new Error(JSON.stringify(await response.json()))
      await load(); setNotice('Image uploaded. You can copy its reference for use in the newsroom.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.') }
    finally { setBusy(false) }
  }
  return <section className="nd-panel"><div className="nd-panel-heading"><div><h2>{tool === 'media' ? 'Media library' : 'Comment moderation'}</h2><p>{tool === 'media' ? 'Your newsroom uploads. Images attached to stories are protected from deletion.' : 'Manage comments on your blog posts. Editors can moderate all conversations.'}</p></div>{tool === 'media' && <label>Upload image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label>}</div>
    {error && <p role="alert" className="nd-error">{error}</p>}{notice && <p role="status" className="nd-notice">{notice}</p>}
    {loading ? <p role="status">Loading…</p> : items.length === 0 ? <p className="nd-empty">{tool === 'media' ? 'No uploads yet.' : 'No comments to moderate.'}</p> : <div className={tool === 'media' ? 'nd-story-library' : ''}>{items.map(item => <article className="nd-panel" key={item.id}>{tool === 'media' && item.url ? <><NewsImage src={item.url} alt="Uploaded newsroom image" /><p>{item.story ? `Attached to story #${item.story}` : 'Unused upload'}</p><button disabled={busy} onClick={() => { void navigator.clipboard.writeText(item.url!).then(() => setNotice('Image reference copied.')).catch(() => setError('Could not copy. Image reference: ' + item.url)) }}>Copy image reference</button></> : <><strong>{item.user_username || 'Reader'} · Blog #{item.post}</strong><p>{item.content}</p></>}<p className="nd-hint">{new Date(item.created_at).toLocaleDateString()}</p>{(!item.story || tool === 'comments') && <button className="nd-danger" disabled={busy} onClick={() => void remove(item)}>Remove</button>}</article>)}</div>}
  </section>
}
