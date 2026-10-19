import Brand from '../brand/Brand'
import { useState } from 'react'
import type { FormEvent } from 'react'
import '../features/news/pages/editor-entry.css'

type Props = { role: 'Writer' | 'Editor' }
function errorText(data: Record<string, unknown>) {
  return Object.entries(data).map(([field, value]) => `${['detail', 'non_field_errors'].includes(field) ? '' : `${field.replaceAll('_', ' ')}: `}${Array.isArray(value) ? value.join(' ') : String(value)}`).join(' ')
}
export default function StaffApplication({ role }: Props) {
  const [values, setValues] = useState({ first_name: '', last_name: '', username: '', email: '', password: '', experience: '', portfolio_url: '' })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const login = role === 'Writer' ? '/writer/login' : '/editor/login'
  const update = (key: keyof typeof values, value: string) => setValues(current => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (values.password !== confirmPassword) { setError('The passwords do not match.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/users/staff-applications/', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, requested_role: role }) })
      const data = await response.json()
      if (!response.ok) throw new Error(errorText(data))
      setValues({ first_name: '', last_name: '', username: '', email: '', password: '', experience: '', portfolio_url: '' }); setConfirmPassword(''); setSubmitted(true)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit your application. Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="editor-entry"><section className="editor-entry-card staff-application-card"><a className="editor-entry-brand" href="/"><Brand /></a><p className="editor-entry-label">{role.toUpperCase()} APPLICATION</p><h1>Apply as a {role.toLowerCase()}</h1>{submitted ? <div role="status"><h2>Application received</h2><p>An administrator will review your application. We will email you the decision. You can sign in once approved.</p></div> : <><p>{role === 'Writer' ? 'Tell us about your writing and reporting experience.' : 'Tell us about your editing, fact-checking, and publishing experience.'} Workspace access requires administrator approval.</p><form onSubmit={submit}><label htmlFor="apply-first-name">First name</label><input id="apply-first-name" autoComplete="given-name" required maxLength={150} value={values.first_name} onChange={e => update('first_name', e.target.value)} /><label htmlFor="apply-last-name">Last name</label><input id="apply-last-name" autoComplete="family-name" required maxLength={150} value={values.last_name} onChange={e => update('last_name', e.target.value)} /><label htmlFor="apply-username">Username</label><input id="apply-username" autoComplete="username" required maxLength={150} value={values.username} onChange={e => update('username', e.target.value)} /><label htmlFor="apply-email">Email</label><input id="apply-email" type="email" autoComplete="email" required value={values.email} onChange={e => update('email', e.target.value)} /><label htmlFor="apply-password">Password</label><input id="apply-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={values.password} onChange={e => update('password', e.target.value)} /><small>Use at least 8 characters and avoid common passwords.</small><label htmlFor="apply-confirm-password">Confirm password</label><input id="apply-confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /><label htmlFor="apply-experience">Relevant experience and why you want to join</label><textarea id="apply-experience" required minLength={30} maxLength={4000} rows={5} value={values.experience} onChange={e => update('experience', e.target.value)} /><label htmlFor="apply-portfolio">Portfolio or sample work URL (optional)</label><input id="apply-portfolio" type="url" value={values.portfolio_url} onChange={e => update('portfolio_url', e.target.value)} />{error && <p className="editor-entry-error" role="alert">{error}</p>}<button disabled={busy}>{busy ? 'Submitting…' : `Submit ${role.toLowerCase()} application`}</button></form></>}<p><a href={login}>Already approved? {role} sign in</a></p><a href="/">← Back to Katiba News</a></section></main>
}
