import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './AuthorSettings.css'

type Preferences = {
  notify_submission: boolean
  notify_feedback: boolean
  notify_publication: boolean
  warn_unsaved_edits: boolean
  default_category: string
  theme: 'system' | 'light' | 'dark'
  density: 'comfortable' | 'compact'
  reduce_motion: boolean
}

type Account = {
  username: string
  email: string
}

const defaults: Preferences = {
  notify_submission: true,
  notify_feedback: true,
  notify_publication: true,
  warn_unsaved_edits: true,
  default_category: '',
  theme: 'system',
  density: 'comfortable',
  reduce_motion: false,
}

type BooleanPreference =
  | 'notify_submission'
  | 'notify_feedback'
  | 'notify_publication'
  | 'warn_unsaved_edits'
  | 'reduce_motion'

function savedAccessToken(): string {
  try {
    const session = JSON.parse(sessionStorage.getItem('katibaUserSession') || '{}')
    return typeof session.access === 'string' ? session.access : ''
  } catch {
    return ''
  }
}

async function settingsRequest(
  path: string,
  method = 'GET',
  body?: unknown,
) {
  const token = savedAccessToken()
  if (!token) throw new Error('Your session has expired. Please sign in again.')

  const response = await fetch(path, {
    method,
    credentials: 'omit',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : 'The request could not be completed.',
    )
  }
  return data
}

function applyAppearance(preferences: Preferences, cache = true) {
  // Appearance choices are scoped to Settings, not the whole dashboard.
  if (cache) {
    try {
      localStorage.setItem('katibaAuthorPreferences', JSON.stringify(preferences))
    } catch {
      // The backend remains the source of truth if browser storage is unavailable.
    }
  }
}

export default function AuthorSettings() {
  const [account, setAccount] = useState<Account | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await settingsRequest('/api/users/author/settings/')
        if (!active) return
        setAccount({ username: data.username, email: data.email })
        const loaded = { ...defaults, ...(data.preferences || {}) } as Preferences
        setPreferences(loaded)
        applyAppearance(loaded)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load settings.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  function updateBoolean(key: BooleanPreference, value: boolean) {
    setPreferences(current => ({ ...current, [key]: value }))
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const data = await settingsRequest(
        '/api/users/author/settings/',
        'PUT',
        { preferences },
      )
      const saved = { ...defaults, ...data.preferences } as Preferences
      setPreferences(saved)
      applyAppearance(saved)
      setMessage('Your settings have been saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')
    setPasswordSaving(true)

    try {
      await settingsRequest(
        '/api/users/author/settings/password/',
        'POST',
        {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
      )

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password changed. Redirecting you to sign in…')
      sessionStorage.removeItem('katibaUserSession')
      window.setTimeout(() => window.location.replace('/signin'), 1200)
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Could not change your password.',
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  function toggle(
    key: BooleanPreference,
    title: string,
    description: string,
  ) {
    return (
      <label className="as-toggle-row" key={key}>
        <span className="as-toggle-copy">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <input
          type="checkbox"
          checked={preferences[key]}
          onChange={event => updateBoolean(key, event.target.checked)}
        />
      </label>
    )
  }

  if (loading) {
    return <div className="as-settings"><p>Loading your settings…</p></div>
  }

  return (
    <div
      className="as-settings"
      data-katiba-theme={preferences.theme}
      data-katiba-density={preferences.density}
      data-katiba-reduced-motion={String(preferences.reduce_motion)}
    >
      <div className="as-intro">
        <span className="as-eyebrow">YOUR WORKSPACE</span>
        <h1>Settings</h1>
        <p>Manage your account, writing preferences, notifications, and workspace appearance.</p>
      </div>

      {error && <div className="as-alert as-alert-error" role="alert">{error}</div>}
      {message && <div className="as-alert as-alert-success" role="status">{message}</div>}

      <form onSubmit={savePreferences}>
        <div className="as-grid">
          <section className="as-card">
            <div className="as-card-heading">
              <span className="as-icon">♙</span>
              <div>
                <h2>Account &amp; security</h2>
                <p>Your account identity and sign-in security.</p>
              </div>
            </div>

            <div className="as-readonly-field">
              <span>Username</span>
              <strong>{account?.username || '—'}</strong>
            </div>
            <div className="as-readonly-field">
              <span>Email address</span>
              <strong>{account?.email || 'No email on file'}</strong>
            </div>
            <div className="as-readonly-field">
              <span>Workspace role</span>
              <strong><span className="as-role">Author</span></strong>
            </div>

            <div className="as-subsection">
              <h3>Change password</h3>
              <p>Choose a new password you do not use on other websites.</p>
              <form className="as-password-form" onSubmit={changePassword}>
                <label>
                  Current password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={event => setCurrentPassword(event.target.value)}
                    required
                  />
                </label>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    required
                  />
                </label>
                {passwordError && <div className="as-alert as-alert-error" role="alert">{passwordError}</div>}
                {passwordMessage && <div className="as-alert as-alert-success" role="status">{passwordMessage}</div>}
                <button type="submit" className="as-secondary-button" disabled={passwordSaving}>
                  {passwordSaving ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </div>
          </section>

          <section className="as-card">
            <div className="as-card-heading">
              <span className="as-icon">♧</span>
              <div>
                <h2>Notifications</h2>
                <p>Choose the newsroom updates you prefer.</p>
              </div>
            </div>
            {toggle('notify_submission', 'Submission updates', 'When a story is submitted for review.')}
            {toggle('notify_feedback', 'Editorial feedback', 'When an editor approves, rejects, or comments on a story.')}
            {toggle('notify_publication', 'Publication updates', 'When a story becomes publicly available.')}
            <p className="as-note">
              These choices are saved as your preferences. Email or in-app notification delivery still needs to be connected to a notification service.
            </p>
          </section>

          <section className="as-card">
            <div className="as-card-heading">
              <span className="as-icon">✎</span>
              <div>
                <h2>Writing preferences</h2>
                <p>Set your preferred writing workflow.</p>
              </div>
            </div>
            {toggle('warn_unsaved_edits', 'Warn before leaving unsaved edits', 'Ask for confirmation before navigating away from unsaved newsroom work.')}
            <label className="as-field">
              Preferred default category
              <input
                type="text"
                maxLength={100}
                placeholder="e.g. Constitutional affairs"
                value={preferences.default_category}
                onChange={event => setPreferences(current => ({
                  ...current,
                  default_category: event.target.value,
                }))}
              />
              <small>Saved as your preference for future writing forms.</small>
            </label>
          </section>

          <section className="as-card">
            <div className="as-card-heading">
              <span className="as-icon">◐</span>
              <div>
                <h2>Appearance &amp; accessibility</h2>
                <p>Adjust the workspace to suit you.</p>
              </div>
            </div>

            <label className="as-field">
              Theme
              <select
                value={preferences.theme}
                onChange={event => setPreferences(current => ({
                  ...current,
                  theme: event.target.value as Preferences['theme'],
                }))}
              >
                <option value="system">Use device setting</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>

            <label className="as-field">
              Workspace spacing
              <select
                value={preferences.density}
                onChange={event => setPreferences(current => ({
                  ...current,
                  density: event.target.value as Preferences['density'],
                }))}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>

            {toggle('reduce_motion', 'Reduce animation', 'Minimize non-essential movement and transitions.')}
          </section>

          <section className="as-card as-card-wide">
            <div className="as-card-heading">
              <span className="as-icon">♧</span>
              <div>
                <h2>Privacy &amp; data</h2>
                <p>Understand how your account and work appear in Katiba News.</p>
              </div>
            </div>
            <div className="as-privacy-list">
              <div>
                <strong>Account information</strong>
                <p>Your username and account email are used to identify your account. You cannot change your role from this page.</p>
              </div>
              <div>
                <strong>Published work</strong>
                <p>Published articles may be publicly visible and can display your author name. Do not include private information in a story intended for publication.</p>
              </div>
              <div>
                <strong>Account changes or closure</strong>
                <p>Account deactivation, deletion, and access changes must be handled by an authorized administrator.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="as-save-bar">
          <span>Your preferences are stored with your account.</span>
          <button className="as-primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>
    </div>
  )
}
