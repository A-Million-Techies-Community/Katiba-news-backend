import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './news-dashboard.css'
import { api } from './api'
import type { UploadedImage } from './api'
import RichTextEditor from './RichTextEditor'
import FeaturedImage from './FeaturedImage'
import NewsImage from './NewsImage'

type Access = { id: number; username: string; can_write: boolean; can_review: boolean }
type Category = { id: number; name: string }
type Story = { id: number; title: string; content: string; category: number; category_name: string; author: number; author_username: string; status: string; feedback: string; updated_at: string; featured_image: string | null; featured_image_url: string | null; featured_image_alt: string; featured_image_caption: string }
type Page<T> = { results: T[]; next: string | null }
const statuses = ['draft', 'submitted', 'approved', 'rejected']

async function all<T>(path: string): Promise<T[]> {
  const items: T[] = []
  let next: string | null = path
  while (next) {
    const page: Page<T> = await api<Page<T>>(next)
    items.push(...page.results)
    // Keep pagination on the frontend proxy's origin.
    next = page.next ? new URL(page.next, window.location.origin).pathname + new URL(page.next, window.location.origin).search : null
  }
  return items
}

export default function NewsDashboard() {
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
  const [tab, setTab] = useState<'stories' | 'categories'>('stories')
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
        if (active) { setAccess(user); setMode(user.can_write ? 'writer' : 'editor'); setStories(news); setCategories(groups) }
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
      setComposing(false); setSelected(null); setDeleting(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'The action could not be completed.') }
    finally { setBusy(false) }
  }

  function open(story: Story | null) {
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
  const visible = scoped.filter(story => (filter === 'all' || story.status === filter) && `${story.title} ${story.author_username}`.toLowerCase().includes(search.toLowerCase()))
  const dirty = selected && (title !== selected.title || content !== selected.content || category !== String(selected.category) || (featuredImage?.id || null) !== selected.featured_image || featuredAlt !== selected.featured_image_alt || featuredCaption !== selected.featured_image_caption)

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

  return <div className="nd-shell">
    <aside className="nd-sidebar">
      <a className="nd-brand" href="/">KATIBA<span>NEWSROOM</span></a>
      <div className="nd-section-label">WORKSPACE</div>
      <button disabled={busy || uploading} className={tab === 'stories' ? 'active' : ''} onClick={() => { setTab('stories'); setComposing(false) }}>{mode === 'writer' ? 'My stories' : 'Review desk'}</button>
      <button disabled={busy || uploading} className={tab === 'categories' ? 'active' : ''} onClick={() => { setTab('categories'); setComposing(false) }}>Categories</button>

      <a className="nd-back" href="/">← Back to Katiba News</a>
    </aside>
    <main className="nd-main">
      <header className="nd-top"><span>News / {mode === 'writer' ? 'Writer' : 'Editor'} workspace</span><span>{access?.username || 'Newsroom'} {access && <b className="nd-avatar">{access.username.slice(0, 1).toUpperCase()}</b>}</span>{access && <button disabled={busy || uploading} onClick={() => { sessionStorage.removeItem('katibaUserSession'); window.location.assign('/') }}>Sign out</button>}</header>
      {loading ? <p role="status">Loading your dashboard…</p> : <>
        <div className="nd-heading"><div><p className="nd-eyebrow">{mode === 'writer' ? 'YOUR WORDS, YOUR WORKSPACE' : 'THE EDITORIAL DESK'}</p><h1>{tab === 'categories' ? 'News categories' : mode === 'writer' ? 'Writer dashboard' : 'Editor dashboard'}</h1><p>{mode === 'writer' ? 'Write, refine, and follow your stories through review.' : 'Review submissions, refine the reporting, and make your decision.'}</p></div>{access && mode === 'writer' && tab === 'stories' && <button className="nd-primary" disabled={busy || uploading} onClick={() => open(null)}>+ Create news</button>}</div>
        {error && <div className="nd-error" role="alert">{error}</div>}
        {notice && <div className="nd-notice" role="status">{notice}</div>}
        {!access ? <section className="nd-panel nd-empty"><h2>Your newsroom account is required</h2><p>Use the existing sign-in page with your Writer (Author) or Editor account.</p><a href="/">Go to Katiba sign-in →</a></section> : <>
          {tab === 'stories' ? <>
            <section className="nd-stats">{(mode === 'writer' ? statuses : ['submitted', 'approved', 'rejected']).map(status => <button key={status} onClick={() => setFilter(status)}><span>{status === 'submitted' ? 'Awaiting review' : status}</span><strong>{scoped.filter(story => story.status === status).length}</strong></button>)}</section>
            {composing && <section className="nd-panel nd-compose"><div className="nd-panel-heading"><h2>{selected ? editable ? 'Edit story' : 'Story details' : 'Create a news draft'}</h2><div className="nd-actions"><button type="button" disabled={uploading} onClick={() => setPreview(!preview)}>{preview ? 'Back to editing' : 'Preview story'}</button><button disabled={busy || uploading} onClick={() => setComposing(false)}>Close</button></div></div>
              {preview ? <article className="nd-story-preview"><p className="nd-eyebrow">{categories.find(item => String(item.id) === category)?.name}</p><h1>{title || 'Untitled story'}</h1><p>By {selected?.author_username || access.username}</p>{featuredImage && <figure><NewsImage src={featuredImage.url} alt={featuredAlt} />{featuredCaption && <figcaption>{featuredCaption}</figcaption>}</figure>}<RichTextEditor key={`preview-${selected?.id || 'new'}`} value={content} editable={false} /></article> : <form onSubmit={save}><fieldset disabled={busy || uploading || !editable}><label>Headline<input required maxLength={255} value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your story a clear headline" /></label><label>Category<select aria-label="Category" required value={category} onChange={e => setCategory(e.target.value)}><option value="">Select a category</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{editable && <div className="nd-create-category"><button type="button" onClick={() => setAddingCategory(!addingCategory)}>+ Add category</button>{addingCategory && <div className="nd-actions"><label>New category name<input maxLength={100} value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void addCategoryToStory() } }} /></label><button type="button" disabled={!newCategoryName.trim() || busy} onClick={() => void addCategoryToStory()}>Create category</button><button type="button" onClick={() => setAddingCategory(false)}>Cancel</button></div>}</div>}<FeaturedImage image={featuredImage} alt={featuredAlt} caption={featuredCaption} editable={!!editable} onImage={setFeaturedImage} onAlt={setFeaturedAlt} onCaption={setFeaturedCaption} onBusy={setUploading} /><div><p className="nd-field-label">Story</p><RichTextEditor key={selected?.id || 'new'} value={content} editable={!!editable} disabled={busy || uploading} onChange={setContent} onBusy={setUploading} /></div></fieldset>
                {!categories.length && <p>Add a category above before saving your story.</p>}
                {selected?.feedback && <blockquote><strong>Editor feedback</strong><p>{selected.feedback}</p></blockquote>}
                <div className="nd-actions">{editable && <button className="nd-primary" disabled={busy || uploading || !categories.length}>Save {selected ? 'changes' : 'draft'}</button>}{mode === 'writer' && ownEditable && <><button type="button" disabled={busy || uploading || !!dirty} onClick={() => transition('submit')}>Submit to editor</button><button className="nd-danger" type="button" disabled={busy || uploading} onClick={() => setDeleting(true)}>Delete</button></>}</div>
              </form>}
              {dirty && <p className="nd-hint">Save changes before submitting or making a review decision.</p>}
              {deleting && <div className="nd-confirm"><p>Delete this story permanently?</p><button className="nd-danger" disabled={busy || uploading} onClick={() => void mutate(() => api(`/api/news/stories/${selected?.id}/`, 'DELETE'), 'Story deleted.')}>Confirm delete</button><button onClick={() => setDeleting(false)}>Keep story</button></div>}
              {reviewable && <div className="nd-review"><h3>Editorial decision</h3><label>Feedback (required for rejection)<textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} /></label><div className="nd-actions"><button className="nd-primary" disabled={busy || uploading || !!dirty} onClick={() => transition('approve')}>Approve story</button><button className="nd-danger" disabled={busy || uploading || !!dirty || !feedback.trim()} onClick={() => transition('reject')}>Reject with feedback</button></div></div>}
              {mode === 'editor' && selected?.author === access.id && <p>You cannot review your own story. Another editor must make the decision.</p>}
            </section>}
            <section className="nd-panel"><div className="nd-panel-heading"><h2>{mode === 'writer' ? 'My stories' : 'News submissions'}</h2><span>{visible.length} stories</span></div><div className="nd-toolbar"><label className="nd-search">Search stories<input placeholder="Search headline or writer…" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option>{statuses.filter(status => mode === 'writer' || status !== 'draft').map(status => <option key={status}>{status}</option>)}</select></label></div>
              {!visible.length ? <div className="nd-empty"><h3>{mode === 'writer' ? 'Your next story starts here' : 'No submissions to review'}</h3><p>{mode === 'writer' ? 'Create a draft or adjust your filters to see your stories.' : 'Submitted stories will appear here for editing and review.'}</p></div> : <div className="nd-table-wrap"><table><thead><tr><th>Story</th>{mode === 'editor' && <th>Writer</th>}<th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>{visible.map(story => <tr key={story.id}><td><strong>{story.title}</strong><small>{story.category_name}</small></td>{mode === 'editor' && <td>{story.author_username}</td>}<td><span className={`nd-badge nd-${story.status}`}>{story.status}</span></td><td>{new Date(story.updated_at).toLocaleDateString()}</td><td><button disabled={busy || uploading} onClick={() => open(story)}>{mode === 'editor' && story.status === 'submitted' ? 'Review' : 'Open'} →</button></td></tr>)}</tbody></table></div>}
            </section>
          </> : <section className="nd-panel"><h2>{mode === 'editor' ? 'Manage categories' : 'News categories'}</h2><p>Keep stories organised by subject.</p>{<form className="nd-category-form" onSubmit={e => { e.preventDefault(); void mutate(async () => { await api(categoryId ? `/api/news/categories/${categoryId}/` : '/api/news/categories/', categoryId ? 'PATCH' : 'POST', { name: categoryName }); setCategoryName(''); setCategoryId(null) }, 'Category saved.') }}><label>Category name<input required maxLength={100} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Courts" /></label><button className="nd-primary" disabled={busy || uploading}>{categoryId ? 'Save category' : 'Add category'}</button>{categoryId && <button type="button" onClick={() => { setCategoryId(null); setCategoryName('') }}>Cancel</button>}</form>}{!categories.length && <p>No categories yet.</p>}<ul className="nd-categories">{categories.map(item => <li key={item.id}><strong>{item.name}</strong>{mode === 'editor' && <div><button disabled={busy || uploading} onClick={() => { setCategoryId(item.id); setCategoryName(item.name) }}>Rename</button><button className="nd-danger" disabled={busy || uploading} onClick={() => { if (window.confirm(`Delete category “${item.name}”?`)) void mutate(() => api(`/api/news/categories/${item.id}/`, 'DELETE'), 'Category deleted.') }}>Delete</button></div>}</li>)}</ul></section>}
        </>}
      </>}
    </main>
  </div>
}
