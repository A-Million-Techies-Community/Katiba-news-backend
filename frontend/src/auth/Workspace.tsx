import Brand from '../brand/Brand'
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { sessionFetch, saveSession } from './session'
import type { WorkspaceAccount } from './session'
import '../features/news/pages/editor-entry.css'

type StaffRole = 'Author' | 'Editor' | 'Administrator'
const staffLoginPath = (role: WorkspaceAccount['role']) => role === 'Administrator' ? '/administration/login' : role === 'Editor' ? '/editor/login' : '/writer/login'
const roleLabel = { Author: 'Writer', Editor: 'Editor', Administrator: 'Administrator' }

export function StaffEntry() {
  return <main className="editor-entry"><section className="editor-entry-card"><a className="editor-entry-brand" href="/"><Brand /></a><p className="editor-entry-label">STAFF ACCESS</p><h1>Your newsroom</h1><p>Choose your workspace to sign in. New writers and editors can apply from their sign-in page.</p><nav className="staff-entry-options" aria-label="Staff sign in"><a href="/writer/login"><strong>Writer sign in <span aria-hidden="true">→</span></strong><span>Write and manage your stories.</span></a><a href="/editor/login"><strong>Editor sign in <span aria-hidden="true">→</span></strong><span>Review submissions and manage publishing.</span></a></nav><a href="/">← Back to Katiba News</a></section></main>
}

export default function Workspace({ role }: { role: StaffRole }) {
  const label = roleLabel[role]
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (!sessionStorage.getItem('katibaUserSession')) {
      queueMicrotask(() => { if (active) setChecking(false) })
    } else {
      void sessionFetch('/api/users/me/').then(async response => {
        if (!response.ok) return
        const account: WorkspaceAccount = await response.json()
        if (active && account.role === role && account.workspace_url) window.location.replace(account.workspace_url)
      }).catch(() => { /* The form remains available when the session cannot be restored. */ })
        .finally(() => { if (active) setChecking(false) })
    }
    return () => { active = false }
  }, [role])
  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/users/login/', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const tokens = await response.json()
      if (!response.ok || !tokens.access) throw new Error(tokens.detail || 'Check your username and password.')
      const profile = await fetch('/api/users/me/', { credentials: 'omit', headers: { Authorization: `Bearer ${tokens.access}` } })
      if (!profile.ok) throw new Error('Could not verify your workspace access.')
      const account: WorkspaceAccount = await profile.json()
      if (!account.workspace_url) throw new Error('Your account does not currently have workspace access. Ask your administrator to assign Writer or Editor access.')
      if (account.role !== role) throw new Error(`This account cannot sign in to the ${label.toLowerCase()} workspace. Use the sign-in page for your assigned role.`)
      saveSession(account, tokens)
      setPassword('')
      window.location.replace(account.workspace_url)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in.') }
    finally { setBusy(false) }
  }
  return <main className="editor-entry"><section className="editor-entry-card"><a className="editor-entry-brand" href="/"><Brand /></a><p className="editor-entry-label">{label.toUpperCase()} WORKSPACE</p><h1>{label} sign in</h1><p>{role === 'Author' ? 'Continue writing and follow your stories through review.' : role === 'Editor' ? 'Review submissions and prepare stories for publication.' : 'Manage writer and editor accounts and access.'}</p>{checking ? <p role="status">Checking your session…</p> : <form onSubmit={signIn}><label htmlFor="workspace-username">Username</label><input id="workspace-username" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} /><label htmlFor="workspace-password">Password</label><input id="workspace-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />{error && <p role="alert" className="editor-entry-error">{error}</p>}<button disabled={busy}>{busy ? 'Signing in…' : `Sign in as ${label.toLowerCase()}`}</button></form>}<p><a href={`/reset-password?next=${staffLoginPath(role)}`}>Forgot password?</a></p>{role !== 'Administrator' && <p>New here? <a href={role === 'Author' ? '/writer/apply' : '/editor/apply'}>Apply as a {label.toLowerCase()}</a></p>}{role !== 'Administrator' && <p><a href={role === 'Author' ? '/editor/login' : '/writer/login'}>{role === 'Author' ? 'Editor sign in' : 'Writer sign in'}</a></p>}<a href="/">← Back to Katiba News</a></section></main>
}

/** Check current server permissions before mounting a staff dashboard. */
export function WorkspaceGate({ role, children }: { role: WorkspaceAccount['role']; children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void sessionFetch('/api/users/me/').then(async response => {
      if (response.status === 401) { if (active) window.location.replace(staffLoginPath(role)); return }
      if (!response.ok) throw new Error('Could not check workspace access.')
      const account: WorkspaceAccount = await response.json()
      if (!active) return
      if (account.role !== role || !account.workspace_url) {
        window.location.replace(account.workspace_url || '/workspace')
        return
      }
      // An administrator-created writer completes onboarding before using publishing tools.
      if (account.workspace_url === '/author/complete-profile' && window.location.pathname !== '/author/complete-profile') {
        window.location.replace(account.workspace_url)
        return
      }
      const stored = JSON.parse(sessionStorage.getItem('katibaUserSession') || '{}')
      saveSession(account, { access: stored.access, refresh: stored.refresh })
      setReady(true)
    }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [role])
  if (error) return <main className="editor-entry"><section className="editor-entry-card"><h1>Workspace unavailable</h1><p role="alert">{error}</p><a href="/workspace">Return to workspace sign in</a></section></main>
  return ready ? children : <main className="editor-entry"><p role="status">Checking workspace access…</p></main>
}
