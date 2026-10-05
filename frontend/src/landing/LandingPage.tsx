import { useState } from 'react'
import { ArticleReader } from '../features/articles/components/ArticleReader'
import { ArticleEditor } from '../features/articles/components/ArticleEditor'
import { BlogView } from '../features/blogs/components/BlogView'
import { featuredStories, newsletters, newsCategories, guestArticles, events, shows, latestStories } from './content'
import './landing.css'

type LandingPageProps = {
  signedInUser: { username: string; role: string } | null
  onHome: () => void
  onOpenAuth: (mode: 'signin' | 'signup') => void
  onSignOut: () => void
}

function scrollRow(id: string, direction: 'left' | 'right') {
  const row = document.getElementById(id)
  row?.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' })
}

function CarouselControls({ target }: { target: string }) {
  return (
    <div className="carousel-controls">
      <button type="button" aria-label="Scroll left" onClick={() => scrollRow(target, 'left')}>
        ←
      </button>
      <button type="button" aria-label="Scroll right" onClick={() => scrollRow(target, 'right')}>
        →
      </button>
    </div>
  )
}

export default function LandingPage({ signedInUser, onHome, onOpenAuth, onSignOut }: LandingPageProps) {
  const [search, setSearch] = useState('')
  const [showCookieNotice, setShowCookieNotice] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const filteredLatest = latestStories.filter((story) =>
    story.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <main className={`news-home ${darkMode ? 'dark-mode' : ''}`} id="top">
      <header className="news-header">
        <div className="masthead">
          <button className="news-logo" type="button" onClick={() => onHome()}>
            Katiba News
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

          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search news"
              placeholder="Search news"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

                    <div className="header-actions">
            <a className="header-signin" href="/news/dashboard">News dashboard</a>
            {signedInUser && (
  <span className="signed-in-label">
    {signedInUser.username} · {signedInUser.role}
  </span>
)}
<button
              className="theme-toggle"
              type="button"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? '☀' : '☾'}
            </button>

            {signedInUser ? (
  <button
    className="header-signin"
    type="button"
   onClick={() => {
  onSignOut()
}}
  >
    Sign out
  </button>
) : (
  <button
    className="header-signin"
    type="button"
    onClick={() => onOpenAuth('signin')}
  >
    Sign in
  </button>
)}
          </div>
          </div>
        <nav className="news-nav" aria-label="Main navigation">
          <a href="#top">Home</a>
          <a href="#your-news">Your News</a>
          <a href="#guest-analysis">Guest Analysis</a>
          <a href="#events">Events</a>
          <a href="#shows">Shows</a>
          <a href="#business-intelligence">Business Intelligence</a>
          {!signedInUser && (
  <button type="button" onClick={() => onOpenAuth('signup')}>
  Become an author?
</button>
)}
        </nav>
      </header>

      <div className="page-content">
                <section className="lead-latest" id="latest">
          <article className="lead-story">
            <div className="lead-art" aria-hidden="true" />
            <div className="lead-copy">
              <span className="story-category">GOVERNANCE</span>
              <h1>Understanding the decisions that shape Kenya</h1>
              <p>
                The latest reporting and clear explanations on public life,
                policy, and the Constitution.
              </p>
              <a href="#your-news">Explore the story →</a>
            </div>
          </article>

          <aside className="latest-panel">
            <div className="latest-panel-heading">
              <h2>Latest</h2>
            </div>
            <div className="latest-list">
              {filteredLatest.map((story) => (
                <article key={story.title}>
                  <time>{story.time}</time>
                  <a href="#latest">{story.title}</a>
                </article>
              ))}
              {filteredLatest.length === 0 && <p>No headlines match your search.</p>}
            </div>
          </aside>
        </section>

        <section className="content-section" id="featured">
          <div className="section-heading">
            <div>
              <span className="section-kicker">KATIBA NEWS</span>
              <h2>Featured</h2>
            </div>
            <CarouselControls target="featured-row" />
          </div>

          <div className="featured-row horizontal-row" id="featured-row">
            <article className="featured-promo">
              <span className="story-category">KATIBA EXPLAINER</span>
              <h3>Understand the decisions that shape your community</h3>
              <p>Clear guides to the Constitution, public services, and your rights.</p>
              <a href="#your-news">Explore the news <span>→</span></a>
            </article>

            {featuredStories.map((story) => (
              <article className="feature-card" key={story.title}>
                <div className={`image-panel ${story.art}`}>
                  <span>{story.category}</span>
                </div>
                <div className="feature-card-copy">
                  <span className="story-category">{story.category}</span>
                  <h3>{story.title}</h3>
                  <p>{story.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section" id="newsletters">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FROM OUR DESK</span>
              <h2>Newsletters</h2>
              <a className="view-all" href="#footer">View all newsletters →</a>
            </div>
            <CarouselControls target="newsletter-row" />
          </div>

          <div className="newsletter-row horizontal-row" id="newsletter-row">
            {newsletters.map((item) => (
              <article className="newsletter-card" key={item.title}>
                <div className={`newsletter-cover ${item.art}`}>
                  <span className="cover-date">{item.date}</span>
                  <strong>{item.title}</strong>
                  <span className="cover-mark">K</span>
                </div>
                <h3>{item.title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section" id="your-news">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FOLLOW THE ISSUES</span>
              <h2>Your News</h2>
            </div>
            <CarouselControls target="your-news-row" />
          </div>

          <div className="category-row horizontal-row" id="your-news-row">
            {newsCategories.map((category, index) => (
              <article className="category-column" key={category.name}>
                <h3>{category.name}</h3>
                {category.stories.map((title, storyIndex) => (
                  <a className="category-story" href="#latest" key={title}>
                    <div className={`mini-art mini-art-${index}-${storyIndex}`} />
                    <strong>{title}</strong>
                  </a>
                ))}
              </article>
            ))}
          </div>

          <div className="latest-block" id="latest">
            <h3>Latest updates</h3>
            <div className="latest-list">
              {filteredLatest.map((story) => (
                <article key={story.title}>
                  <time>{story.time}</time>
                  <a href="#latest">{story.title}</a>
                </article>
              ))}
              {filteredLatest.length === 0 && <p>No headlines match your search.</p>}
            </div>
          </div>
          <section className="max-w-6xl mx-auto px-4 py-12 space-y-16 border-t border-slate-100 mt-12">
            <ArticleReader />
            <ArticleEditor />
            <BlogView />
          </section>
        </section>

        <section className="content-section" id="guest-analysis">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PERSPECTIVES</span>
              <h2>Guest Analysis</h2>
            </div>
            <CarouselControls target="analysis-row" />
          </div>

          <div className="analysis-row horizontal-row" id="analysis-row">
            {guestArticles.map((article) => (
              <article className="analysis-card" key={article.title}>
                <div className={`analysis-art ${article.art}`} />
                <div className="analysis-copy">
                  <div className="author-line">
                    <span className="author-avatar">{article.initials}</span>
                    <span>{article.author}</span>
                    <time>Guest contributor</time>
                  </div>
                  <h3>{article.title}</h3>
                  <p>{article.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section events-section" id="events">
          <div className="section-heading">
            <div>
              <span className="section-kicker">JOIN THE CONVERSATION</span>
              <h2>Events</h2>
            </div>
            <CarouselControls target="events-row" />
          </div>

          <div className="events-layout">
            <div className="events-intro">
              <h3>Upcoming events</h3>
              <p>Join public conversations, practical workshops, and community forums.</p>
            </div>
            <div className="events-row horizontal-row" id="events-row">
              {events.map((event) => (
                <article className="event-card" key={event.title}>
                  <div className={`event-art ${event.art}`} />
                  <div className="event-copy">
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <div className="event-meta">
                      <span>◷ {event.date}</span>
                      <span>⌖ {event.place}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="content-section" id="shows">
          <div className="section-heading">
            <div>
              <span className="section-kicker">WATCH & LISTEN</span>
              <h2>Shows</h2>
            </div>
            <CarouselControls target="shows-row" />
          </div>

          <div className="shows-row horizontal-row" id="shows-row">
            {shows.map((show) => (
              <article className="show-card" key={show.title}>
                <div className={`show-art ${show.art}`}>
                  <span>KATIBA NEWS</span>
                  <strong>{show.title}</strong>
                </div>
                <h3>{show.title}</h3>
                <p>{show.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="business-section" id="business-intelligence">
          <div className="business-heading">
            <div>
              <span className="section-kicker">DATA FOR DECISIONS</span>
              <h2>Katiba News Business Intelligence</h2>
              <p>Useful context and tools for understanding Kenya’s economy and public sector.</p>
            </div>
            <button className="orange-button" type="button" onClick={() => onOpenAuth('signup')}>
              Sign up <span>→</span>
            </button>
          </div>

          <div className="business-content">
            <div className="business-features">
              <article>
                <h3>Economic indicators</h3>
                <p>Follow key figures and understand what they mean.</p>
              </article>
              <article>
                <h3>Local and global insights</h3>
                <p>Explore analysis connecting Kenyan markets with wider trends.</p>
              </article>
              <article>
                <h3>Public finance</h3>
                <p>Get clearer context on budgets, revenue, and public spending.</p>
              </article>
              <article>
                <h3>Interactive data</h3>
                <p>Compare information through simple charts and visual guides.</p>
              </article>
            </div>

            <div className="business-preview">
              <span>BUSINESS INTELLIGENCE</span>
              <strong>Data. Context. Better decisions.</strong>
              <div className="preview-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer" id="footer">
        <div className="footer-brand">
          <strong>Katiba News</strong>
          <small>THE PEOPLE. THE LAW. THE FUTURE.</small>
          <p>Independent reporting and useful context for public life in Kenya.</p>
        </div>

        <div>
          <h3>Quick links</h3>
          <a href="#your-news">Your News</a>
          <a href="#guest-analysis">Guest Analysis</a>
          <a href="#events">Events</a>
          <a href="#shows">Shows</a>
        </div>

        <div>
          <h3>Contact</h3>
          <a href="mailto:hello@katibanews.example">Media and partnerships</a>
          <a href="#footer">Contact the newsroom →</a>
        </div>

        <div>
          <h3>About Katiba News</h3>
          <p>News and explanations focused on the Constitution, governance, rights, and public services.</p>
        </div>
      </footer>

      {showCookieNotice && (
        <div className="cookie-notice">
          <p>
            We use essential site storage to keep this demonstration working.
            Read our <a href="#footer">privacy information</a>.
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
    </main>
  )
}
