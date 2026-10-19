export type WorkspaceAccount = {
  username: string
  role: 'Author' | 'Editor' | 'Administrator' | null
  workspace_url: string | null
}
export function saveSession(account: WorkspaceAccount, tokens: { access: string; refresh?: string }) {
  sessionStorage.removeItem('katibaEditorSession')
  sessionStorage.removeItem('katibaAdminSession')
  sessionStorage.setItem('katibaUserSession', JSON.stringify({ username: account.username, role: account.role, ...tokens }))
}

/** Shared token refresh and revocation for all account workspaces. */
export function sessionKey() { return 'katibaUserSession' }
const refreshing = new Map<string, Promise<boolean>>()
export async function sessionFetch(input: RequestInfo | URL, options: RequestInit = {}): Promise<Response> {
  const key = sessionKey()
  const saved = () => { try { return JSON.parse(sessionStorage.getItem(key) || '{}') } catch { return {} } }
  const send = () => {
    const headers = new Headers(options.headers)
    const account = saved()
    if (account.access) headers.set('Authorization', `Bearer ${account.access}`)
    return fetch(input, { ...options, headers, credentials: 'omit' })
  }
  let response = await send()
  if (response.status !== 401 || !saved().refresh) return response
  if (!refreshing.has(key)) {
    const account = saved()
    refreshing.set(key, (async () => {
      const refresh = await fetch('/api/users/token/refresh/', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: account.refresh }) })
      if (!refresh.ok) { sessionStorage.removeItem(key); return false }
      const tokens = await refresh.json()
      // A sign-out or account switch while refresh was pending must remain effective.
      if (saved().refresh !== account.refresh) return false
      sessionStorage.setItem(key, JSON.stringify({ ...account, ...tokens }))
      return true
    })().finally(() => refreshing.delete(key)))
  }
  if (await refreshing.get(key)) response = await send()
  return response
}
export async function signOut(destination: string) {
  const key = sessionKey()
  try { await sessionFetch('/api/users/logout/', { method: 'POST' }) }
  finally {
    sessionStorage.removeItem(key)
    sessionStorage.removeItem('katibaEditorSession')
    sessionStorage.removeItem('katibaAdminSession')
    window.location.assign(destination)
  }
}
