import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import NewsDashboardPage from './NewsDashboardPage'
import './editor-entry.css'

const sessionKey = 'katibaEditorSession'

type EditorAccess = { username: string; can_review: boolean; can_write: boolean }

async function verifyEditor(token: string): Promise<EditorAccess> {
  const response = await fetch('/api/news/dashboard/', {
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(response.status === 401 ? 'Your session expired. Please sign in again.' : 'This account does not have editor access.')
  const account: EditorAccess = await response.json()
  if (!account.can_review || account.can_write) throw new Error('Please use an Editor account without Author membership.')
  return account
}

export default function EditorEntry() {
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
        if (saved.access) {
          await verifyEditor(saved.access)
          if (active) setReady(true)
        }
      } catch {
        if (active) sessionStorage.removeItem(sessionKey)
      } finally {
        if (active) setChecking(false)
      }
    }
    void restore()
    return () => { active = false }
  }, [])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/users/login/', {
        method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const login = await response.json()
      if (!response.ok || !login.access) throw new Error(login.detail || 'Login failed. Check your username and password.')
      const account = await verifyEditor(login.access)
      sessionStorage.setItem(sessionKey, JSON.stringify({ username: account.username, role: 'Editor', access: login.access }))
      setPassword('')
      window.location.replace('/news/dashboard/editor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Please try again.')
    } finally { setBusy(false) }
  }

  if (checking) return <main className="editor-entry"><p role="status">Checking editor session…</p></main>
  if (ready) return <NewsDashboardPage />
  return <main className="editor-entry"><section className="editor-entry-card">
    <a href="/" className="editor-entry-brand">◇ Katiba News</a>
    <p className="editor-entry-label">EDITORIAL WORKSPACE</p>
    <h1>Editor sign in</h1>
    <p>Sign in to review submissions and manage the newsroom.</p>
    <form onSubmit={signIn}>
      <label htmlFor="editor-username">Username</label>
      <input id="editor-username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} />
      <label htmlFor="editor-password">Password</label>
      <input id="editor-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
      {error && <p className="editor-entry-error" role="alert">{error}</p>}
      <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in to editor dashboard'}</button>
    </form>
    <a href="/">← Back to Katiba News</a>
  </section></main>
}
