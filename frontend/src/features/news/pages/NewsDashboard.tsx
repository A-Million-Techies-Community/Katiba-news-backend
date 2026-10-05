import { DashboardLayout, ThemeToggle } from '../../../dashboard'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, all } from '../api'
import type { UploadedImage } from '../api'
import RichTextEditor from '../components/RichTextEditor'
import FeaturedImage from '../components/FeaturedImage'
import NewsImage from '../components/NewsImage'
import NewsContentManager from '../components/NewsContentManager'
import EditorDesk from '../components/EditorDesk'

type Access = { id: number; username: string; can_write: boolean; can_review: boolean }
type Category = { id: number; name: string }
type Story = { id: number; title: string; content: string; category: number; category_name: string; author: number; author_username: string; status: string; feedback: string; updated_at: string; submitted_at?: string | null; featured_image: string | null; featured_image_url: string | null; featured_image_alt: string; featured_image_caption: string }
const statuses = ['draft', 'submitted', 'approved', 'rejected']

export default function NewsDashboard() {
  const [route, setRoute] = useState(window.location.pathname)
  const [access, setAccess] = useState<Access | null>(null)
  const [mode, setMode] = useState<'writer' | 'editor'>('writer')
  const [stories, setStories] = useState<Story[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Story | null>(null)
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [feedback, setFeedback] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'overview' | 'stories' | 'categories'>('overview')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [featuredImage, setFeaturedImage] = useState<UploadedImage | null>(null)
  const [featuredAlt, setFeaturedAlt] = useState('')
  const [featuredCaption, setFeaturedCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const user = await api<Access>('/api/news/dashboard/')
        const [news, groups] = await Promise.all([all<Story>('/api/news/stories/'), all<Category>('/api/news/categories/')])
        if (user.can_write === user.can_review) throw new Error('This account must have exactly one newsroom role. Use a separate Writer or Editor login.')
        if (active) { setAccess(user); setMode(user.can_write ? 'writer' : 'editor'); setFilter(user.can_write ? 'all' : 'submitted'); setStories(news); setCategories(groups) }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Could not load the newsroom.') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [])

  async function mutate(work: () => Promise<unknown>, message: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      await work()
      const [news, groups] = await Promise.all([all<Story>('/api/news/stories/'), all<Category>('/api/news/categories/')])
      setStories(news); setCategories(groups); setNotice(message)
      setComposing(false); setSelected(null); setDeleting(false); if (composing) navigate('stories', true)
    } catch (err) { setError(err instanceof Error ? err.message : 'The action could not be completed.') }
    finally { setBusy(false) }
  }

  function open(story: Story | null) {
    navigate(`stories/${story?.id || 'new'}`)
  }

  function fillStory(story: Story | null) {
    setPreview(false); setAddingCategory(false); setNewCategoryName('')
    setFeaturedImage(story?.featured_image && story.featured_image_url ? { id: story.featured_image, url: story.featured_image_url } : null)
    setFeaturedAlt(story?.featured_image_alt || ''); setFeaturedCaption(story?.featured_image_caption || '')
    setSelected(story); setComposing(true); setTitle(story?.title || ''); setContent(story?.content || '')
    setCategory(String(story?.category || categories[0]?.id || '')); setFeedback(''); setDeleting(false); setError(''); setNotice('')
  }

  const ownEditable = selected?.author === access?.id && ['draft', 'rejected'].includes(selected?.status || '')
  const editable = !selected ? mode === 'writer' : mode === 'writer' ? ownEditable : selected.status === 'submitted'
  const reviewable = mode === 'editor' && selected?.status === 'submitted' && selected.author !== access?.id
  const scoped = stories.filter(story => mode === 'writer' ? story.author === access?.id : story.status !== 'draft')
  const dirty = selected && (title !== selected.title || content !== selected.content || category !== String(selected.category) || (featuredImage?.id || null) !== selected.featured_image || featuredAlt !== selected.featured_image_alt || featuredCaption !== selected.featured_image_caption)

  const basePath = `/news/dashboard/${mode}`
  function navigate(page: string, saved = false) {
    if (!saved && (dirty || (!selected && composing && (title || content))) && !window.confirm('Leave this page and discard unsaved changes?')) return
    const path = page === 'overview' ? basePath : `${basePath}/${page}`
    window.history.pushState(null, '', path)
    setRoute(path)
  }

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (!access) return
    let active = true
    queueMicrotask(() => {
    if (!active) return
    const parts = route.replace(/^\/news\/dashboard\/?/, '').split('/').filter(Boolean)
    const page = ['writer', 'editor'].includes(parts[0]) ? parts.slice(1) : parts
    const canonical = `${basePath}${page.length ? '/' + page.join('/') : ''}`
    if (route !== canonical) { window.history.replaceState(null, '', canonical); setRoute(canonical); return }
    setTab(page[0] === 'categories' ? 'categories' : page[0] === 'stories' ? 'stories' : 'overview')
    if (page[0] === 'stories' && page[1]) {
      const story = stories.find(item => String(item.id) === page[1])
      if (page[1] === 'new' && mode === 'writer') fillStory(null)
      else if (story) fillStory(story)
      else { setComposing(false); setError('This story is unavailable. Choose a story from your workspace.') }
    } else { setComposing(false); setSelected(null) }
    })
    return () => { active = false }
    // Initialize the form on navigation only; refreshes must not overwrite edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, access, basePath])

  useEffect(() => {
    if (!composing || !(dirty || (!selected && (title || content)))) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [composing, dirty, selected, title, content])

  function save(event: FormEvent) {
    event.preventDefault()
    void mutate(() => api(selected ? `/api/news/stories/${selected.id}/` : '/api/news/stories/', selected ? 'PATCH' : 'POST', { title, content, category: Number(category), featured_image: featuredImage?.id || null, featured_image_alt: featuredAlt, featured_image_caption: featuredCaption }), 'Story saved.')
  }

  async function addCategoryToStory() {
    if (!newCategoryName.trim()) return
    setBusy(true); setError('')
    try {
      const added = await api<Category>('/api/news/categories/', 'POST', { name: newCategoryName.trim() })
      setCategories(current => [...current, added].sort((a, b) => a.name.localeCompare(b.name)))
      setCategory(String(added.id)); setAddingCategory(false); setNewCategoryName('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add category.') }
    finally { setBusy(false) }
  }

  function transition(action: string) {
    if (!selected) return
    void mutate(() => api(`/api/news/stories/${selected.id}/${action}/`, 'POST', action === 'submit' ? {} : { feedback }), action === 'submit' ? 'Sent to the editor.' : `Story ${action === 'approve' ? 'approved' : 'rejected'}.`)
  }

  return <DashboardLayout workspace={mode === 'editor' ? 'EDITORIAL WORKSPACE' : 'AUTHOR WORKSPACE'} items={[
    { id: 'overview', label: '⌂ Dashboard' },
    { id: 'stories', label: mode === 'writer' ? 'My stories' : 'Submission queue' },
    { id: 'categories', label: 'Categories' },
  ]} activeItem={tab} onNavigate={navigate} disabled={busy || uploading}>
      <header className="nd-top"><form className="nd-global-search" onSubmit={event => { event.preventDefault(); navigate('stories') }}><label htmlFor="newsroom-search">Search newsroom</label><input id="newsroom-search" type="search" placeholder="Search your news, headlines, or topics…" value={search} disabled={busy || uploading} onChange={event => setSearch(event.target.value)} /><button disabled={busy || uploading} aria-label="Search news">⌕</button></form><div className="nd-account"><ThemeToggle /><b className="nd-avatar">{(access?.username || 'N').slice(0, 1).toUpperCase()}</b><span><strong>{access?.username || 'Newsroom'}</strong><small>{mode === 'writer' ? 'Author' : 'Editor'}</small></span>{access && <button disabled={busy || uploading} onClick={() => { sessionStorage.removeItem('katibaUserSession'); window.location.assign('/') }}>Sign out</button>}</div></header>
      <nav className="nd-breadcrumbs" aria-label="Breadcrumb"><a href="/">Katiba News</a><span aria-hidden="true">/</span>{tab === 'overview' ? <span aria-current="page">Dashboard</span> : <><button disabled={busy || uploading} onClick={() => navigate('overview')}>Dashboard</button><span aria-hidden="true">/</span>{composing ? <><button disabled={busy || uploading} onClick={() => navigate('stories')}>{mode === 'writer' ? 'My stories' : 'Submission queue'}</button><span aria-hidden="true">/</span><span className="nd-current-crumb" aria-current="page">{selected?.title || 'New story'}{preview ? ' · Preview' : ''}</span></> : <span aria-current="page">{tab === 'categories' ? 'Categories' : mode === 'writer' ? 'My stories' : 'Review desk'}</span>}</>}</nav>
      {loading ? <p role="status">Loading your dashboard…</p> : <>
        <div className="nd-heading"><div><p className="nd-eyebrow">{mode === 'writer' ? 'YOUR WORDS, YOUR WORKSPACE' : 'THE EDITORIAL DESK'}</p><h1>{composing ? (mode === 'editor' ? selected?.status === 'submitted' ? 'Review submission' : 'Editorial decision' : selected ? 'Edit story' : 'Create a story') : tab === 'categories' ? 'News categories' : tab === 'stories' ? (mode === 'writer' ? 'My stories' : 'Review desk') : `Welcome back, ${access?.username || 'there'}!`}</h1><p>{mode === 'writer' ? 'Write, refine, and follow your stories through review.' : 'Review submissions, refine the reporting, and make your decision.'}</p></div>{access && mode === 'writer' && !composing && tab !== 'categories' && <button className="nd-primary" disabled={busy || uploading} onClick={() => open(null)}>+ Create news</button>}</div>
        {error && <div className="nd-error" role="alert">{error}</div>}
        {notice && <div className="nd-notice" role="status">{notice}</div>}
        {!access ? <section className="nd-panel nd-empty"><h2>Your newsroom account is required</h2><p>Use the existing sign-in page with your Writer (Author) or Editor account.</p><a href="/">Go to Katiba sign-in →</a></section> : <>
          {tab !== 'categories' ? <>
            {!composing && tab === 'overview' && <section className="nd-stats">{(mode === 'writer' ? statuses : ['submitted', 'approved', 'rejected']).map(status => <button key={status} className={`nd-stat-${status}`} onClick={() => { setFilter(status); navigate('stories') }}><span>{status === 'submitted' ? 'Awaiting review' : status === 'rejected' ? 'Needs changes' : status}</span><strong>{scoped.filter(story => story.status === status).length}</strong><small>View stories →</small></button>)}</section>}
            {tab === 'overview' && mode === 'writer' && <div className="nd-overview-grid">
              <section className="nd-panel nd-recent"><div className="nd-panel-heading"><div><h2>{mode === 'writer' ? 'Your recent stories' : 'Latest submissions'}</h2><p>A little progress, every day.</p></div><button onClick={() => navigate('stories')}>View all →</button></div>
                {!scoped.length ? <div className="nd-empty"><h3>{mode === 'writer' ? 'Your voice belongs here' : 'Your review desk is up to date'}</h3><p>{mode === 'writer' ? 'Start your first story and bring a fresh perspective.' : 'Stories will appear when writers submit them for review.'}</p></div> : [...scoped].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5).map(story => <button className="nd-story-row" key={story.id} onClick={() => open(story)}><span className="nd-story-icon">▤</span><span><strong>{story.title}</strong><small>{story.category_name} · {story.author_username}</small></span><span className={`nd-badge nd-${story.status}`}>{story.status}</span><span>→</span></button>)}
              </section>
              <aside className="nd-overview-side"><section className="nd-voice"><span>◈</span><h2>{mode === 'writer' ? 'Share your voice' : 'Make every story count'}</h2><p>{mode === 'writer' ? 'Write, inform, inspire. Your perspective matters.' : 'Help clear, thoughtful reporting reach our readers.'}</p><button className="nd-primary" onClick={() => mode === 'writer' ? open(null) : (setFilter('submitted'), navigate('stories'))}>{mode === 'writer' ? 'Create a new story' : 'Review submissions'} →</button></section>
              <section className="nd-panel"><h2>Quick links</h2><button className="nd-quick-link" onClick={() => navigate('stories')}>▤ &nbsp; {mode === 'writer' ? 'Manage my stories' : 'Open review desk'} <span>→</span></button><button className="nd-quick-link" onClick={() => navigate('categories')}>◇ &nbsp; News categories <span>→</span></button><a className="nd-quick-link" href="/">⌂ &nbsp; Visit Katiba News <span>→</span></a></section></aside>
              <section className="nd-panel"><h2>Recent activity</h2>{[...scoped].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4).map(story => <div className="nd-activity" key={story.id}><span className="nd-activity-dot" /><div><strong>{story.title}</strong><p>{story.status === 'submitted' ? 'Sent for editorial review' : story.status === 'approved' ? 'Approved by the editorial desk' : story.status === 'rejected' ? 'Returned with editorial feedback' : 'Draft updated'}</p></div><time>{new Date(story.updated_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi' })}</time></div>)}{!scoped.length && <p>Story updates will appear here as your newsroom gets going.</p>}</section>
              <section className="nd-panel"><h2>Story pipeline</h2><div className="nd-pipeline">{statuses.filter(status => mode === 'writer' || status !== 'draft').map(status => <button key={status} onClick={() => { setFilter(status); navigate('stories') }}><span>{status === 'submitted' ? 'In review' : status === 'rejected' ? 'Needs changes' : status}<strong>{scoped.filter(story => story.status === status).length}</strong></span><meter aria-label={`${status} stories`} min={0} max={Math.max(1, scoped.length)} value={scoped.filter(story => story.status === status).length} /></button>)}</div><h3>Keep your newsroom moving</h3><p>{mode === 'writer' ? 'Save a draft, refine your reporting, then submit it to the editorial desk.' : 'Open a submission to edit the story, preview it, and approve it or return it with feedback.'}</p><div className="nd-workspace-summary"><strong>{categories.length}</strong><span>categories to keep reporting organised</span></div></section>
            </div>}
            {tab === 'overview' && mode === 'editor' && <div className="nd-editor-overview"><EditorDesk stories={scoped} categories={categories} filter={filter} onFilter={setFilter} search={search} onSearch={setSearch} onOpen={story => open(stories.find(item => item.id === story.id)!)} disabled={busy || uploading} overview /><aside className="nd-panel nd-editor-mission"><p className="nd-eyebrow">THE EDITORIAL DESK</p><h2>Quality before approval</h2><p>Writers create the reporting. You verify, refine, and decide whether a submission is ready.</p><button className="nd-primary" onClick={() => { setFilter('submitted'); navigate('stories') }}>Open submission queue →</button><h3>Manage the newsroom</h3><button className="nd-quick-link" onClick={() => navigate('categories')}>Manage news categories →</button><p className="nd-hint">Approval records your editorial decision. It does not publish the story to the articles app.</p></aside></div>}
            {composing && <section className="nd-panel nd-compose"><div className="nd-compose-status"><span className={`nd-badge nd-${selected?.status || 'draft'}`}>{selected?.status || 'New draft'}</span><span>{dirty || (!selected && (title || content)) ? 'Unsaved changes' : selected ? 'Saved story' : 'Start your draft'}</span><span>{new DOMParser().parseFromString(content, 'text/html').body.textContent?.trim().split(/\s+/).filter(Boolean).length || 0} words</span></div><div className="nd-panel-heading"><h2>{selected ? editable ? 'Edit story' : 'Story details' : 'Create a news draft'}</h2><div className="nd-actions"><button type="button" disabled={uploading} onClick={() => setPreview(!preview)}>{preview ? 'Back to editing' : 'Preview story'}</button><button disabled={busy || uploading} onClick={() => navigate('stories')}>← Back to stories</button></div></div>
              {preview ? <article className="nd-story-preview"><p className="nd-eyebrow">{categories.find(item => String(item.id) === category)?.name}</p><h1>{title || 'Untitled story'}</h1><p>By {selected?.author_username || access.username}</p>{featuredImage && <figure><NewsImage src={featuredImage.url} alt={featuredAlt} />{featuredCaption && <figcaption>{featuredCaption}</figcaption>}</figure>}<RichTextEditor key={`preview-${selected?.id || 'new'}`} value={content} editable={false} /></article> : <form onSubmit={save}><fieldset disabled={busy || uploading || !editable}><label>Headline<input required maxLength={255} value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your story a clear headline" /></label><label>Category<select aria-label="Category" required value={category} onChange={e => setCategory(e.target.value)}><option value="">Select a category</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{editable && <div className="nd-create-category"><button type="button" onClick={() => setAddingCategory(!addingCategory)}>+ Add category</button>{addingCategory && <div className="nd-actions"><label>New category name<input maxLength={100} value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void addCategoryToStory() } }} /></label><button type="button" disabled={!newCategoryName.trim() || busy} onClick={() => void addCategoryToStory()}>Create category</button><button type="button" onClick={() => setAddingCategory(false)}>Cancel</button></div>}</div>}<FeaturedImage image={featuredImage} alt={featuredAlt} caption={featuredCaption} editable={!!editable} onImage={setFeaturedImage} onAlt={setFeaturedAlt} onCaption={setFeaturedCaption} onBusy={setUploading} /><div><p className="nd-field-label">Story</p><RichTextEditor key={selected?.id || 'new'} value={content} editable={!!editable} disabled={busy || uploading} onChange={setContent} onBusy={setUploading} /></div></fieldset>
                {!categories.length && <p>Add a category above before saving your story.</p>}
                {selected?.feedback && <blockquote><strong>Editor feedback</strong><p>{selected.feedback}</p></blockquote>}
                <div className="nd-actions">{editable && <button className="nd-primary" disabled={busy || uploading || !categories.length}>Save {selected ? 'changes' : 'draft'}</button>}{mode === 'writer' && ownEditable && <><button type="button" disabled={busy || uploading || !!dirty} onClick={() => transition('submit')}>Submit to editor</button><button className="nd-danger" type="button" disabled={busy || uploading} onClick={() => setDeleting(true)}>Delete</button></>}</div>
              </form>}
              {dirty && <p className="nd-hint">Save changes before submitting or making a review decision.</p>}
              {deleting && <div className="nd-confirm"><p>Delete this story permanently?</p><button className="nd-danger" disabled={busy || uploading} onClick={() => void mutate(() => api(`/api/news/stories/${selected?.id}/`, 'DELETE'), 'Story deleted.')}>Confirm delete</button><button onClick={() => setDeleting(false)}>Keep story</button></div>}
              {reviewable && <div className="nd-review"><h3>Make your editorial decision</h3><p className="nd-hint">Save any story edits first. Approve the reporting or return it to the writer with clear, actionable feedback.</p><label>Feedback (required for rejection)<textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} /></label><div className="nd-actions"><button className="nd-primary" disabled={busy || uploading || !!dirty} onClick={() => transition('approve')}>Approve story</button><button className="nd-danger" disabled={busy || uploading || !!dirty || !feedback.trim()} onClick={() => transition('reject')}>Reject with feedback</button></div></div>}
              {mode === 'editor' && selected?.author === access.id && <p>You cannot review your own story. Another editor must make the decision.</p>}
            </section>}
            {!composing && tab === 'stories' && mode === 'writer' && <NewsContentManager stories={scoped} categories={categories} mode={mode} filter={filter} onFilter={setFilter} search={search} onSearch={setSearch} onOpen={story => open(stories.find(item => item.id === story.id)!)} onCreate={() => open(null)} disabled={busy || uploading} />}
            {!composing && tab === 'stories' && mode === 'editor' && <EditorDesk stories={scoped} categories={categories} filter={filter} onFilter={setFilter} search={search} onSearch={setSearch} onOpen={story => open(stories.find(item => item.id === story.id)!)} disabled={busy || uploading} />}
          </> : <section className="nd-panel"><h2>{mode === 'editor' ? 'Manage categories' : 'News categories'}</h2><p>Keep stories organised by subject.</p>{<form className="nd-category-form" onSubmit={e => { e.preventDefault(); void mutate(async () => { await api(categoryId ? `/api/news/categories/${categoryId}/` : '/api/news/categories/', categoryId ? 'PATCH' : 'POST', { name: categoryName }); setCategoryName(''); setCategoryId(null) }, 'Category saved.') }}><label>Category name<input required maxLength={100} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Courts" /></label><button className="nd-primary" disabled={busy || uploading}>{categoryId ? 'Save category' : 'Add category'}</button>{categoryId && <button type="button" onClick={() => { setCategoryId(null); setCategoryName('') }}>Cancel</button>}</form>}{!categories.length && <p>No categories yet.</p>}<ul className="nd-categories">{categories.map(item => <li key={item.id}><strong>{item.name}</strong>{mode === 'editor' && <div><button disabled={busy || uploading} onClick={() => { setCategoryId(item.id); setCategoryName(item.name) }}>Rename</button><button className="nd-danger" disabled={busy || uploading} onClick={() => { if (window.confirm(`Delete category “${item.name}”?`)) void mutate(() => api(`/api/news/categories/${item.id}/`, 'DELETE'), 'Category deleted.') }}>Delete</button></div>}</li>)}</ul></section>}
        </>}
      </>}
  </DashboardLayout>
}
