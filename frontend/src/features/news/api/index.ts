/** Use this tab's explicit account login, never an unrelated Django admin session. */
export async function newsFetch(path: string, method = 'GET', body?: unknown): Promise<Response> {
  let access: string | undefined
  const editorRoute = window.location.pathname === '/editor' || /^\/news\/dashboard\/editor(?:\/|$)/.test(window.location.pathname)
  try { access = JSON.parse(sessionStorage.getItem(editorRoute ? 'katibaEditorSession' : 'katibaUserSession') || '{}').access }
  catch { /* A malformed saved login is handled as signed out below. */ }
  if (!access) throw new Error('Sign in with your Writer or Editor account on the main website, then open News dashboard.')
  const multipart = body instanceof FormData
  const response = await fetch(path, {
    method, credentials: 'omit', headers: {
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}),
    }, body: multipart ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('Please sign in through the existing Katiba login, then return to this dashboard.')
    const data = await response.json().catch(() => ({ detail: 'The request could not be completed.' }))
    throw new Error(typeof data.detail === 'string' ? data.detail : Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : value}`).join(' '))
  }
  return response
}

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await newsFetch(path, method, body)
  return response.status === 204 ? null as T : response.json() as Promise<T>
}

export type UploadedImage = { id: string; url: string }

export async function uploadImage(file: File): Promise<UploadedImage> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Use an image smaller than 5 MB.')
  const form = new FormData()
  form.append('file', file)
  return api<UploadedImage>('/api/news/images/', 'POST', form)
}

/** Collect paginated results through the frontend proxy. */
export async function all<T>(path: string): Promise<T[]> {
  const items: T[] = []
  let next: string | null = path
  while (next) {
    const page: { results: T[]; next: string | null } = await api(next)
    items.push(...page.results)
    const url: URL | null = page.next ? new URL(page.next, window.location.origin) : null
    next = url ? url.pathname + url.search : null
  }
  return items
}
