import Brand from '../../brand/Brand'
import { useState } from 'react'
import type { ReactNode } from 'react'
import '../../App.css'
import './public.css'

type Props = { children: ReactNode; search?: string; onSearch?: (value: string) => void; active?: string }
export default function PublicLayout({ children, search = '', onSearch, active }: Props) {
  const [showCookieNotice, setShowCookieNotice] = useState(true)
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('katibaPublicTheme') === 'dark' } catch { return false }
  })
  function toggleTheme() {
    const next = !darkMode
    setDarkMode(next)
    try { localStorage.setItem('katibaPublicTheme', next ? 'dark' : 'light') } catch { /* Theme still works when storage is unavailable. */ }
  }
  return (
    <div
      className={`news-home ${darkMode ? 'dark-mode' : ''}`}
      id="top"
    >
      <header className="news-header">
        <div className="masthead">
          <button
            className="news-logo"
            type="button"
            onClick={() => window.location.assign('/')}
          >
            <Brand />
            <small>THE PEOPLE. THE LAW. THE FUTURE.</small>
          </button>

          <span className="today">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>

          {onSearch && <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search news"
              placeholder="Search news"
              value={search}
              onChange={(event) => onSearch?.(event.target.value)}
            />
          </label>}

          <div className="header-actions">
            <button
              className="theme-toggle"
              type="button"
              aria-label={
                darkMode ? 'Switch to light mode' : 'Switch to dark mode'
              }
              title={
                darkMode ? 'Switch to light mode' : 'Switch to dark mode'
              }
              onClick={toggleTheme}
            >
              {darkMode ? '☀' : '☾'}
            </button>
            <a className="header-signin" href="/workspace">Staff sign in</a>

          </div>
        </div>

        <nav className="news-nav" aria-label="Main navigation">
          <a href="/" aria-current={active === 'home' ? 'page' : undefined}>Home</a>
          <a href="/read?type=news" aria-current={active === 'news' ? 'page' : undefined}>Latest News</a>
          <a href="/read?type=articles" aria-current={active === 'articles' ? 'page' : undefined}>Articles</a>
          <a href="/read?type=blogs" aria-current={active === 'blogs' ? 'page' : undefined}>Blogs</a>
        </nav>
      </header>

      <main className="page-content" id="main-content">{children}</main>

      <footer className="site-footer" id="footer">
        <div className="footer-brand">
          <Brand />
          <small>THE PEOPLE. THE LAW. THE FUTURE.</small>
          <p>
            Independent reporting and useful context for public life
            in Kenya.
          </p>
        </div>

        <div>
          <h3>Quick links</h3>
          <a href="/read?type=news">Latest News</a>
          <a href="/read?type=articles">Articles</a>
          <a href="/read?type=blogs">Blogs</a>
          <a href="/workspace">Staff sign in</a>
        </div>

        <div>
          <h3>About Katiba News</h3>
          <p>
            News and explanations focused on the Constitution,
            governance, rights, and public services.
          </p>
        </div>
      </footer>

      {showCookieNotice && (
        <div className="cookie-notice">
          <p>
            We use essential site storage to keep this demonstration
            working. Read our <a href="#footer">privacy information</a>.
          </p>

          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setShowCookieNotice(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
