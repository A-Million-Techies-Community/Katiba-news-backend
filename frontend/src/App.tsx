import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Role = 'Reader' | 'Author' | 'Editor'
type Mode = 'signin' | 'signup'

const endpoints: Record<Role, string> = {
  Reader: 'reader',
  Author: 'author',
  Editor: 'editor',
}

function App() {
  const [mode, setMode] = useState<Mode>('signin')
  const [role, setRole] = useState<Role>('Reader')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setBusy(true)

    try {
      if (mode === 'signup') {
        const response = await fetch('/api/users/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            username,
            password,
          }),
        })
        const result = await response.json()

        if (!response.ok) {
          setMessage(JSON.stringify(result))
          return
        }

        setMessage('Account created. You can now sign in as a Reader.')
        setMode('signin')
        setRole('Reader')
        setPassword('')
        return
      }

      const loginResponse = await fetch('/api/users/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const login = await loginResponse.json()

      if (!loginResponse.ok || !login.access) {
        setMessage(login.detail || 'Login failed. Check your username and password.')
        return
      }

      const response = await fetch(`/api/users/${endpoints[role]}/`, {
        headers: { Authorization: `Bearer ${login.access}` },
      })
      const result = await response.json()

      if (!response.ok) {
        setMessage(result.detail || `This account does not have ${role} access.`)
        return
      }

      setMessage(result.message)
      setPassword('')
    } catch {
      setMessage('Could not reach the server. Check that Django is running.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="landing">
      <header className="site-header">
        <a className="brand" href="/">Katiba News</a>
        <span>Independent. Informed. Constitutional.</span>
      </header>

      <section className="welcome">
        <div className="intro">
          <p className="eyebrow">THE NEWSROOM, CONNECTED</p>
          <h1>Stories that shape<br />our <em>future.</em></h1>
          <p className="intro-copy">
            Thoughtful reporting on the ideas, people, and decisions shaping Kenya.
          </p>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <p className="eyebrow">YOUR NEWSROOM</p>
          <h2>{mode === 'signin' ? 'Welcome back' : 'Create an account'}</h2>
          <p className="hint">
            {mode === 'signin'
              ? 'Choose your account type and sign in.'
              : 'Create a Reader account to get started.'}
          </p>

          <div className="role-options" aria-label="Choose sign-in or sign-up">
            <button
              type="button"
              className={mode === 'signin' ? 'role selected' : 'role'}
              onClick={() => {
                setMode('signin')
                setMessage('')
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'role selected' : 'role'}
              onClick={() => {
                setMode('signup')
                setMessage('')
              }}
            >
              Sign up
            </button>
          </div>

          {mode === 'signin' && (
            <div className="role-options" aria-label="Account type">
              {(['Reader', 'Author', 'Editor'] as Role[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={role === item ? 'role selected' : 'role'}
                  onClick={() => {
                    setRole(item)
                    setMessage('')
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {mode === 'signup' && (
            <>
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
              />

              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
              />

              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </>
          )}

          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
          />

          <button className="submit" type="submit" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'signin'
                ? `Sign in as ${role}`
                : 'Create Reader account'}
          </button>

          {message && <p className="message" role="status">{message}</p>}
        </form>
      </section>

      <footer>Readers · Authors · Editors</footer>
    </main>
  )
}

export default App