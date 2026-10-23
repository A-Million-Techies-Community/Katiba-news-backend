import { useEffect, useRef, useState } from 'react'
import { Camera, LoaderCircle, Trash2 } from 'lucide-react'
import { sessionFetch } from '../../auth/session'
import './profile-photo.css'

function savedPhoto(): string | null {
  try { return JSON.parse(sessionStorage.getItem('katibaUserSession') || '{}').profile_picture_url || null } catch { return null }
}

/** All mounted avatars update together after a photo is uploaded or removed. */
export function ProfilePhoto({ initials, large = false }: { initials: string; large?: boolean }) {
  const [photo, setPhoto] = useState<string | null>(savedPhoto)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const update = (event: Event) => setPhoto((event as CustomEvent<string | null>).detail)
    window.addEventListener('katiba-profile-photo', update)
    return () => window.removeEventListener('katiba-profile-photo', update)
  }, [])
  async function updatePhoto(file?: File) {
    if (busy) return
    setError('')
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError('Choose a JPEG, PNG, or WebP photo up to 5 MB.')
      return
    }
    setBusy(true)
    try {
      const body = new FormData()
      if (file) body.append('profile_picture', file)
      const response = await sessionFetch('/api/users/me/photo/', { method: file ? 'PUT' : 'DELETE', body: file ? body : undefined })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.profile_picture?.[0] || data.detail || 'Could not update your photo. Please try again.')
      const url: string | null = data.profile_picture_url || null
      const session = JSON.parse(sessionStorage.getItem('katibaUserSession') || '{}')
      sessionStorage.setItem('katibaUserSession', JSON.stringify({ ...session, profile_picture_url: url }))
      window.dispatchEvent(new CustomEvent('katiba-profile-photo', { detail: url }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update your photo.') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  return <div className={`workspace-photo${large ? ' workspace-photo-large' : ''}`}>
    <div className="workspace-photo-controls">
      <button type="button" className="workspace-photo-avatar" onClick={() => input.current?.click()} disabled={busy} aria-label="Upload profile picture" title="Change profile picture">
        {photo ? <img src={photo} alt="Your profile" /> : <span>{initials}</span>}
        <span className="workspace-photo-camera" aria-hidden="true">{busy ? <LoaderCircle size={13} /> : <Camera size={13} />}</span>
      </button>
      {large && <div className="workspace-photo-help"><button type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : photo ? 'Change photo' : 'Upload photo'}</button><small>JPEG, PNG or WebP · Up to 5 MB</small>{photo && <button className="workspace-photo-remove" type="button" disabled={busy} onClick={() => void updatePhoto()}><Trash2 size={13} aria-hidden="true" /> Remove photo</button>}</div>}
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void updatePhoto(file) }} />
    {error && <p className="workspace-photo-error" role="alert">{error}</p>}
  </div>
}
