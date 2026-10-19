import { useEffect, useState } from 'react'
import StaffApplications from './StaffApplications'
import { DashboardLayout, ThemeToggle } from '../../dashboard'
import { sessionFetch, signOut } from '../../auth/session'

type Account = { id: number; username: string; email: string; role: string; is_active: boolean; is_administrator: boolean }
export default function Administrator() {
  const [tab, setTab] = useState('accounts')
  const [ready, setReady] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Author')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  async function load() {
    const response = await sessionFetch('/api/users/accounts/')
    if (!response.ok) throw new Error('Administrator access is required. Sign in with a superuser account.')
    setAccounts(await response.json())
    setReady(true)
  }
  useEffect(() => {
    let active = true
    if (sessionStorage.getItem('katibaUserSession')) {
      void sessionFetch('/api/users/accounts/').then(async response => {
        if (!response.ok) throw new Error('Administrator access is required. Sign in again.')
        const data = await response.json()
        if (active) { setAccounts(data); setReady(true) }
      }).catch(err => { if (active) setError(err.message) })
    }
    return () => { active = false }
  }, [])
  async function mutate(path: string, method: string, body: unknown) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await sessionFetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(JSON.stringify(data))
      await load(); setNotice('Account saved. Existing sessions for that account have been revoked.')
      return true
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save account.'); return false }
    finally { setBusy(false) }
  }
  if (!ready) return <p role="status">{error || 'Loading account management…'}</p>
  return <DashboardLayout workspace="ADMINISTRATION" items={[{ id: 'accounts', label: '♙ Writers & editors' }, { id: 'applications', label: 'Staff applications' }, { id: 'django', label: 'Advanced administration', href: '/admin/' }]} activeItem={tab} onNavigate={next => { setTab(next); if (next === 'accounts') void load().catch(err => setError(err.message)) }} disabled={busy}>
    <header className="nd-top"><strong>Account management</strong><div className="nd-account"><ThemeToggle /><button onClick={() => void signOut('/administration/login')}>Sign out</button></div></header>
    {tab === 'applications' ? <StaffApplications /> : <>
    <div className="nd-heading"><div><p className="nd-eyebrow">PEOPLE & ACCESS</p><h1>Writers and editors</h1><p>Create accounts, assign newsroom access, and suspend accounts.</p></div></div>
    {error && <p className="nd-error" role="alert">{error}</p>}{notice && <p className="nd-notice" role="status">{notice}</p>}
    <section className="nd-panel"><h2>Create account</h2><form className="nd-category-form" onSubmit={async e => { e.preventDefault(); if (await mutate('/api/users/accounts/', 'POST', { username, email, password, newsroom_role: role })) { setUsername(''); setEmail(''); setPassword('') } }}>
      <label>Username<input required value={username} onChange={e => setUsername(e.target.value)} /></label><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Initial password<input type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} /></label><label>Access<select value={role} onChange={e => setRole(e.target.value)}><option value="Author">Writer</option><option value="Editor">Editor</option></select></label><button className="nd-primary" disabled={busy}>Create account</button></form></section>
    <section className="nd-panel"><div className="nd-panel-heading"><h2>Accounts</h2><label>Find account<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label></div><div className="nd-table-wrap"><table><thead><tr><th>Account</th><th>Access</th><th>Status</th><th>Action</th></tr></thead><tbody>{accounts.filter(account => `${account.username} ${account.email}`.toLowerCase().includes(search.toLowerCase())).map(account => <tr key={account.id}><td><strong>{account.username}</strong><small>{account.email}</small></td><td>{account.is_administrator ? 'Administrator' : <select aria-label={`Access for ${account.username}`} value={['Author', 'Editor'].includes(account.role) ? account.role : ''} disabled={busy} onChange={e => { if (window.confirm(`Change ${account.username}'s access to ${e.target.value}? Existing sessions will be revoked.`)) void mutate(`/api/users/accounts/${account.id}/`, 'PATCH', { newsroom_role: e.target.value }) }}><option value="" disabled>No staff access</option><option value="Author">Writer</option><option value="Editor">Editor</option></select>}</td><td>{account.is_active ? 'Active' : 'Suspended'}</td><td>{!account.is_administrator && <button disabled={busy} onClick={() => { if (window.confirm(`${account.is_active ? 'Suspend' : 'Activate'} ${account.username}?`)) void mutate(`/api/users/accounts/${account.id}/`, 'PATCH', { is_active: !account.is_active }) }}>{account.is_active ? 'Suspend' : 'Activate'}</button>}</td></tr>)}</tbody></table></div></section>
    </>}
  </DashboardLayout>
}
