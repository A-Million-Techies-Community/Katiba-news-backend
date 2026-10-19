import { useEffect, useState } from 'react'

type Kind = 'news' | 'articles' | 'blogs'
type Story = { id: number; slug?: string; title: string; author_username: string; published_at?: string; category_name?: string; featured_image_url?: string; featured_image_alt?: string }
type Feed = { stories: Story[]; loading: boolean; error: boolean }
const kinds: Kind[] = ['news', 'articles', 'blogs']
const emptyFeed = (): Feed => ({ stories: [], loading: true, error: false })
const storyLink = (kind: Kind, story: Story) => `/read?type=${kind}&story=${encodeURIComponent(story.slug || story.id)}`
function publishedDate(story: Story) {
  return story.published_at ? new Date(story.published_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) : ''
}
function FeedStatus({ feed, search }: { feed: Feed; search: string }) {
  return <p className="home-feed-status" role={feed.error ? 'alert' : 'status'}>{feed.loading ? 'Loading published stories…' : feed.error ? 'Stories are temporarily unavailable. Please try again later.' : search ? 'No published stories match your search.' : 'No stories published yet.'}</p>
}

function CarouselControls({ target, enabled }: { target: string; enabled: boolean }) {
  return <div className="carousel-controls">{(['left', 'right'] as const).map(direction => <button type="button" key={direction} aria-label={`Scroll ${direction}`} disabled={!enabled} onClick={() => document.getElementById(target)?.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' })}>{direction === 'left' ? '←' : '→'}</button>)}</div>
}
function StoryCard({ kind, story }: { kind: Kind; story: Story }) {
  return <article className="feature-card">{story.featured_image_url && <a href={storyLink(kind, story)}><img className="home-card-image" src={story.featured_image_url} alt={story.featured_image_alt || ''} /></a>}<div className="feature-card-copy"><span className="story-category">{story.category_name || kind}</span><h3><a href={storyLink(kind, story)}>{story.title}</a></h3><p>By {story.author_username}</p>{publishedDate(story) && <time dateTime={story.published_at}>{publishedDate(story)}</time>}</div></article>
}

export default function HomepageStories({ search }: { search: string }) {
  const [feeds, setFeeds] = useState<Record<Kind, Feed>>({ news: emptyFeed(), articles: emptyFeed(), blogs: emptyFeed() })
  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled(kinds.map(async kind => {
      try {
        const endpoint = kind === 'news' ? '/api/news/public/' : `/api/${kind}/?status=published`
        const response = await fetch(endpoint, { credentials: 'omit', signal: controller.signal })
        if (!response.ok) throw new Error('Could not load stories')
        const data = await response.json()
        const stories: Story[] = Array.isArray(data) ? data : data.results || []
        stories.sort((a, b) => (Date.parse(b.published_at || '') || 0) - (Date.parse(a.published_at || '') || 0))
        if (!controller.signal.aborted) setFeeds(current => ({ ...current, [kind]: { stories, loading: false, error: false } }))
      } catch {
        if (!controller.signal.aborted) setFeeds(current => ({ ...current, [kind]: { stories: [], loading: false, error: true } }))
      }
    }))
    return () => controller.abort()
  }, [])
  const matches = (kind: Kind) => feeds[kind].stories.filter(story => story.title.toLowerCase().includes(search.trim().toLowerCase()))
  const news = matches('news')
  const lead = news[0]
  const articles = matches('articles')
  const blogs = matches('blogs')
  return <>
    <section className="lead-latest" id="latest" aria-label="Latest news">
      <article className="lead-story">
        {lead ? <>{lead.featured_image_url ? <img className="home-lead-image" src={lead.featured_image_url} alt={lead.featured_image_alt || ''} /> : <div className="lead-art" aria-hidden="true" />}<div className="lead-copy"><span className="story-category">{lead.category_name || 'NEWS'}</span><h1><a href={storyLink('news', lead)}>{lead.title}</a></h1><p>By {lead.author_username}{publishedDate(lead) && ` · ${publishedDate(lead)}`}</p><a href={storyLink('news', lead)}>Read story →</a></div></> : <><div className="lead-art" aria-hidden="true" /><div className="lead-copy"><span className="story-category">KATIBA NEWS</span><h1>Latest News</h1><FeedStatus feed={feeds.news} search={search.trim()} /></div></>}
      </article>
      <aside className="latest-panel"><div className="latest-panel-heading"><h2>Latest</h2><a href="/read?type=news">View all →</a></div><div className="latest-list">{news.slice(0, 6).map(story => <article key={story.id}>{publishedDate(story) && <time dateTime={story.published_at}>{publishedDate(story)}</time>}<a href={storyLink('news', story)}>{story.title}</a></article>)}{!news.length && <FeedStatus feed={feeds.news} search={search.trim()} />}</div></aside>
    </section>
    <section className="content-section" id="featured">
      <div className="section-heading"><div><span className="section-kicker">KATIBA NEWS</span><h2>Featured</h2></div><CarouselControls target="featured-row" enabled={articles.length > 0} /></div>
      <div className="featured-row horizontal-row" id="featured-row"><article className="featured-promo"><span className="story-category">KATIBA EXPLAINER</span><h3>Understand the decisions that shape your community</h3><p>Clear guides to the Constitution, public services, and your rights.</p><a href="/read?type=articles">Explore articles <span>→</span></a></article>{articles.slice(0, 4).map(story => <StoryCard kind="articles" story={story} key={story.id} />)}{!articles.length && <div className="home-section-empty"><FeedStatus feed={feeds.articles} search={search.trim()} /></div>}</div>
    </section>
    <section className="content-section" id="newsletters"><div className="section-heading"><div><span className="section-kicker">FROM OUR DESK</span><h2>Newsletters</h2></div><CarouselControls target="newsletter-row" enabled={false} /></div><div className="newsletter-row horizontal-row" id="newsletter-row"><div className="home-section-empty"><p>No newsletters available yet.</p></div></div></section>
    <section className="content-section" id="your-news"><div className="section-heading"><div><span className="section-kicker">FOLLOW THE ISSUES</span><h2>Your News</h2></div><CarouselControls target="your-news-row" enabled={news.length > 0} /></div><div className="category-row horizontal-row" id="your-news-row">{Array.from(new Set(news.map(story => story.category_name || 'News'))).map(category => <article className="category-column" key={category}><h3>{category}</h3>{news.filter(story => (story.category_name || 'News') === category).slice(0, 3).map(story => <a className="category-story" href={storyLink('news', story)} key={story.id}>{story.featured_image_url && <img className="mini-art" src={story.featured_image_url} alt={story.featured_image_alt || ''} />}<strong>{story.title}</strong></a>)}</article>)}{!news.length && <div className="home-section-empty"><FeedStatus feed={feeds.news} search={search.trim()} /></div>}</div></section>
    <section className="content-section" id="guest-analysis"><div className="section-heading"><div><span className="section-kicker">PERSPECTIVES</span><h2>Guest Analysis</h2></div><CarouselControls target="analysis-row" enabled={blogs.length > 0} /></div><div className="analysis-row horizontal-row" id="analysis-row">{blogs.slice(0, 4).map(story => <article className="analysis-card" key={story.id}><div className="analysis-copy"><div className="author-line"><span className="author-avatar">{story.author_username.slice(0, 2).toUpperCase()}</span><span>{story.author_username}</span></div><h3><a href={storyLink('blogs', story)}>{story.title}</a></h3>{publishedDate(story) && <time dateTime={story.published_at}>{publishedDate(story)}</time>}</div></article>)}{!blogs.length && <div className="home-section-empty"><FeedStatus feed={feeds.blogs} search={search.trim()} /></div>}</div></section>
    <section className="content-section events-section" id="events"><div className="section-heading"><div><span className="section-kicker">JOIN THE CONVERSATION</span><h2>Events</h2></div><CarouselControls target="events-row" enabled={false} /></div><div className="events-layout"><div className="events-intro"><h3>Upcoming events</h3><p>Public conversations, practical workshops, and community forums.</p></div><div className="events-row horizontal-row" id="events-row"><div className="home-section-empty"><p>No upcoming events announced.</p></div></div></div></section>
    <section className="content-section" id="shows"><div className="section-heading"><div><span className="section-kicker">WATCH &amp; LISTEN</span><h2>Shows</h2></div><CarouselControls target="shows-row" enabled={false} /></div><div className="shows-row horizontal-row" id="shows-row"><div className="home-section-empty"><p>No shows available yet.</p></div></div></section>
    <section className="business-section" id="business-intelligence"><div className="business-heading"><div><span className="section-kicker">DATA FOR DECISIONS</span><h2>Katiba News Business Intelligence</h2><p>Context for understanding Kenya’s economy and public sector.</p></div><a className="orange-button" href="/read?type=news">Read latest news <span>→</span></a></div><div className="business-content"><div className="business-features"><article><h3>Economic indicators</h3><p>No indicators available yet.</p></article><article><h3>Local and global insights</h3><p>No insights available yet.</p></article><article><h3>Public finance</h3><p>No reports available yet.</p></article><article><h3>Interactive data</h3><p>No datasets available yet.</p></article></div><div className="business-preview"><span>BUSINESS INTELLIGENCE</span><strong>Data. Context. Better decisions.</strong><p>No data published yet.</p></div></div></section>
  </>
}
