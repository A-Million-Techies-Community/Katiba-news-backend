import Brand from '../brand/Brand'
import { useState } from 'react'
import type { FormEvent } from 'react'
import '../features/news/pages/editor-entry.css'
export default function Recovery() {
  const params = new URLSearchParams(window.location.search)
  const uid = params.get('uid'), token = params.get('token')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(uid && token ? '/api/users/password-reset/confirm/' : '/api/users/password-reset/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uid && token ? { uid, token, password } : { email }) })
      const result = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(result))
      setMessage(result.detail); setPassword('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Request failed.') }
    finally { setBusy(false) }
  }
  return <main className="editor-entry"><section className="editor-entry-card"><a href="/" className="editor-entry-brand"><Brand /></a><h1>{uid && token ? 'Choose a new password' : 'Reset your password'}</h1><form onSubmit={submit}>{uid && token ? <label>New password<input type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label> : <label>Account email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}<button disabled={busy}>{busy ? 'Sending…' : uid && token ? 'Update password' : 'Send reset instructions'}</button></form>{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}<a href={['/writer/login', '/editor/login', '/administration/login'].includes(params.get('next') || '') ? params.get('next')! : '/workspace'}>Back to sign in</a> · <a href="/">Back to Katiba News</a></section></main>
}
