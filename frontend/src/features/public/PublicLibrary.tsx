import { useEffect, useState } from 'react'
import PublicLayout from './PublicLayout'

type Entry = { id: number; slug?: string; title: string; content: string; author_username: string; published_at?: string; featured_image_url?: string; featured_image_alt?: string }
type Comment = { id: number; content: string; user_username: string }
function articleContent(content: string) {
  try {
    const data = JSON.parse(content) as Record<string, unknown>
    if (!data || typeof data !== 'object' || !['body', 'opening', 'section', 'quote'].some(key => key in data)) return <div className="public-prose-text">{content}</div>
    const text = (key: string) => typeof data[key] === 'string' ? data[key] as string : ''
    return <><p className="public-article-intro">{text('subtitle') || text('opening')}</p>{/^https?:\/\//.test(text('featuredImage')) && <figure><img src={text('featuredImage')} alt={text('title') || 'Article illustration'} /></figure>}<div className="public-prose-text">{text('opening') && text('subtitle') ? text('opening') : ''}</div><div className="public-prose-text">{text('body')}</div>{text('heading') && <h2>{text('heading')}</h2>}<div className="public-prose-text">{text('section')}</div>{text('quote') && <blockquote>{text('quote')}{text('source') && <cite>{text('source')}</cite>}</blockquote>}{text('takeaway') && <aside className="public-takeaway"><h2>The takeaway</h2><p>{text('takeaway')}</p></aside>}</>
  } catch { return <div className="public-prose-text">{content}</div> }
}
export default function PublicLibrary() {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('type') || 'news'
  const kind = ['news', 'articles', 'blogs'].includes(requested) ? requested : 'news'
  const identifier = params.get('story')
  const [items, setItems] = useState<Entry[]>([])
  const [selected, setSelected] = useState<Entry | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const label = kind === 'news' ? 'Latest news' : kind === 'articles' ? 'Articles & analysis' : 'Community blogs'
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        // Public reading never attaches an account token, even for signed-in staff.
        const base = kind === 'news' ? '/api/news/public/' : `/api/${kind}/`
        const endpoint = identifier ? `${base}${encodeURIComponent(identifier)}/` : `${base}${kind === 'news' ? '' : '?status=published'}`
        const response = await fetch(endpoint, { credentials: 'omit', signal: controller.signal })
        if (!response.ok) throw new Error(response.status === 404 ? 'This story is unavailable.' : 'Stories are temporarily unavailable. Please try again.')
        const data = await response.json()
        if (controller.signal.aborted) return
        if (identifier) {
          setSelected(data)
          if (kind === 'blogs') {
            const discussion = await fetch(`/api/blogs/${encodeURIComponent(data.slug)}/comments/`, { credentials: 'omit', signal: controller.signal })
            if (discussion.ok) { const list = await discussion.json(); if (!controller.signal.aborted) setComments(list) }
          }
        } else { setItems(Array.isArray(data) ? data : data.results || []); setNextPage(data.next || null) }
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load stories.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [kind, identifier])
  async function loadMore() {
    if (!nextPage) return
    setBusy(true); setError('')
    try {
      const url = new URL(nextPage, window.location.origin)
      const response = await fetch(url.pathname + url.search, { credentials: 'omit' })
      if (!response.ok) throw new Error('Could not load more stories.')
      const data = await response.json()
      setItems(current => [...current, ...(data.results || [])]); setNextPage(data.next || null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load more stories.') }
    finally { setBusy(false) }
  }
  const matches = items.filter(item => `${item.title} ${item.author_username}`.toLowerCase().includes(search.toLowerCase()))
  return <PublicLayout active={kind} search={identifier ? undefined : search} onSearch={identifier ? undefined : setSearch}>
    <nav className="public-breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span>{selected ? <a href={`/read?type=${kind}`}>{label}</a> : <span aria-current="page">{label}</span>}{selected && <><span>/</span><span aria-current="page">Story</span></>}</nav>
    {loading ? <p role="status" className="public-empty">Loading stories…</p> : error ? <section className="public-empty"><h1>We couldn’t load this page</h1><p role="alert">{error}</p><a href={`/read?type=${kind}`}>Back to {label.toLowerCase()} →</a></section> : selected ? <article className="public-article"><header><p className="public-eyebrow">{kind}</p><h1>{selected.title}</h1><p className="public-byline">By {selected.author_username}{selected.published_at && <> · <time dateTime={selected.published_at}>{new Date(selected.published_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' })}</time></>}</p></header>{selected.featured_image_url && <figure><img src={selected.featured_image_url} alt={selected.featured_image_alt || ''} /></figure>}<div className="public-article-body">{kind === 'news' ? <div dangerouslySetInnerHTML={{ __html: selected.content }} /> : kind === 'articles' ? articleContent(selected.content) : <div className="public-prose-text">{selected.content}</div>}</div>{kind === 'blogs' && comments.length > 0 && <section className="public-discussion"><h2>Discussion</h2>{comments.map(comment => <article key={comment.id}><strong>{comment.user_username}</strong><p>{comment.content}</p></article>)}</section>}<a className="public-back" href={`/read?type=${kind}`}>← More {kind}</a></article> : <><header className="public-section-title"><p className="public-eyebrow">KATIBA NEWS</p><h1>{label}</h1><p>{kind === 'news' ? 'The latest reporting on the issues shaping public life.' : kind === 'articles' ? 'Context, explanation, and in-depth reporting.' : 'Perspectives and ideas from our writers.'}</p></header><section className="published-grid" aria-label={label}>{matches.map(item => <article key={item.id} className="published-card">{item.featured_image_url && <img src={item.featured_image_url} alt={item.featured_image_alt || ''} />}<div><p className="public-eyebrow">{kind}</p><h2><a href={`/read?type=${kind}&story=${encodeURIComponent(item.slug || item.id)}`}>{item.title}</a></h2><p>By {item.author_username}</p><a className="public-story-link" href={`/read?type=${kind}&story=${encodeURIComponent(item.slug || item.id)}`}>Read story →</a></div></article>)}</section>{matches.length === 0 && <p className="public-empty">{search ? 'No stories match your search.' : 'New reporting will appear here when published.'}</p>}{nextPage && <button className="public-load-more" disabled={busy} onClick={() => void loadMore()}>{busy ? 'Loading…' : 'More stories'}</button>}</>}
  </PublicLayout>
}
