import { sessionFetch } from '../../../auth/session';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

type BlogStatus = 'draft' | 'under_review' | 'approved' | 'rejected' | 'published';

type BlogComment = {
  id: number;
  post: number;
  user: number | null;
  user_username?: string;
  content: string;
  created_at: string;
};

type BlogItem = {
  id: number;
  title: string;
  slug: string;
  content: string;
  author: number | null;
  author_username?: string;
  likes_count?: number;
  comments?: BlogComment[];
  created_at: string;
  status: BlogStatus;
  feedback?: string;
};

type BlogViewProps = {
  onBackToDashboard?: () => void;
  onNavigateToArticles?: () => void;
};

type SortOption = 'newest' | 'oldest' | 'popular';
type StatusFilter = 'all' | BlogStatus;
type SessionData = {
  access?: string;
  access_token?: string;
  token?: string;
  username?: string;
};

const API_BASE = '/api/blogs/';

function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results?: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
}

function readSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem('katibaUserSession');
    return raw ? (JSON.parse(raw) as SessionData) : null;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  const session = readSession();
  return session?.access || session?.access_token || session?.token || null;
}

function headers(json = false): HeadersInit {
  const result: Record<string, string> = {};
  if (json) result['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'string' && data) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
    const messages = Object.entries(record).flatMap(([key, value]) => {
      if (Array.isArray(value)) return value.map((item) => `${key}: ${item}`);
      if (typeof value === 'string') return [`${key}: ${value}`];
      return [];
    });
    if (messages.length) return messages.join(' ');
  }
  return fallback;
}

function normalizeStatus(value: unknown): BlogStatus {
  if (value === 'draft' || value === 'under_review' || value === 'published' || value === 'approved' || value === 'rejected') {
    return value;
  }
  return 'published';
}

function normalizePost(value: unknown): BlogItem | null {
  if (!value || typeof value !== 'object') return null;
  const post = value as Partial<BlogItem>;
  if (
    typeof post.id !== 'number' ||
    typeof post.title !== 'string' ||
    typeof post.slug !== 'string' ||
    typeof post.content !== 'string'
  ) {
    return null;
  }
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    author: typeof post.author === 'number' ? post.author : null,
    author_username: post.author_username,
    likes_count: typeof post.likes_count === 'number' ? post.likes_count : 0,
    comments: Array.isArray(post.comments) ? post.comments : [],
    created_at: post.created_at || '',
    status: normalizeStatus(post.status),
    feedback: post.feedback,
  };
}

function formatDate(value: string): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function initials(value?: string): string {
  const name = value?.trim();
  if (!name) return 'U';
  return name.split(/\s+/).slice(0, 2).map((word) => word[0].toUpperCase()).join('');
}

function authorName(post: BlogItem): string {
  return post.author_username?.trim() || 'Anonymous';
}

function commentName(comment: BlogComment): string {
  return comment.user_username?.trim() || 'Community member';
}

function StatusBadge({ status }: { status: BlogStatus }) {
  let config = { bg: '', text: '', label: '' };
  switch (status) {
    case 'approved': config = { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' }; break;
    case 'rejected': config = { bg: 'bg-red-50', text: 'text-red-700', label: 'Needs Revisions' }; break;
    case 'draft': config = { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Draft' }; break;
    case 'under_review': config = { bg: 'bg-amber-50', text: 'text-amber-700', label: 'In Review' }; break;
    case 'published': config = { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Published' }; break;
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function BlogView({
  onBackToDashboard,
  onNavigateToArticles,
}: BlogViewProps) {
  const [posts, setPosts] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);
  const [likingId, setLikingId] = useState<number | null>(null);
  const [commentingId, setCommentingId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingPost, setEditingPost] = useState<BlogItem | null>(null);
  const [newPostStatus, setNewPostStatus] = useState<'draft' | 'under_review'>('draft');

  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<number[]>([]);
  const [openComments, setOpenComments] = useState<number[]>([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const session = readSession();

  const loadPosts = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const response = await sessionFetch(`${API_BASE}?mine=true&page_size=100`, { headers: headers() });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(data, 'Unable to load posts.'));
      setPosts(extractList<unknown>(data).map(normalizePost).filter((post): post is BlogItem => post !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the blog server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadPosts(true); });
    return () => { active = false; };
  }, [loadPosts]);

  const counts = useMemo(
    () => ({
      all: posts.length,
      draft: posts.filter((post) => post.status === 'draft').length,
      under_review: posts.filter((post) => post.status === 'under_review').length,
      approved: posts.filter((post) => post.status === 'approved').length,
      published: posts.filter((post) => post.status === 'published').length,
    }),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts
      .filter((post) => {
        if (statusFilter !== 'all' && post.status !== statusFilter) return false;
        if (!query) return true;
        return (
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          authorName(post).toLowerCase().includes(query) ||
          (post.comments || []).some((comment) => comment.content.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return (b.likes_count || 0) - (a.likes_count || 0);
        const first = new Date(a.created_at).getTime() || 0;
        const second = new Date(b.created_at).getTime() || 0;
        return sortBy === 'newest' ? second - first : first - second;
      });
  }, [posts, search, sortBy, statusFilter]);

  const publishedPosts = posts.filter((post) => post.status === 'published');
  const totalLikes = publishedPosts.reduce((sum, post) => sum + (post.likes_count || 0), 0);

  const savePost = async (event: React.FormEvent<HTMLFormElement>, status: 'draft' | 'under_review') => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent) {
      setError('Enter a title and the content of your post.');
      return;
    }

    setSaving(true);
    try {
      const response = await sessionFetch(editingPost ? `${API_BASE}${encodeURIComponent(editingPost.slug)}/` : API_BASE, {
        method: editingPost ? 'PATCH' : 'POST',
        headers: headers(true),
        body: JSON.stringify({ title: cleanTitle, content: cleanContent, status }),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(data, 'Could not save your post.'));

      setTitle('');
      setContent('');
      setNewPostStatus('draft');
      setEditingPost(null);
      setSuccess(status === 'draft' ? 'Your post was saved as a draft.' : 'Your post was submitted for review.');
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your post.');
    } finally {
      setSaving(false);
    }
  };

  const changePostStatus = async (post: BlogItem, status: BlogStatus) => {
    setError('');
    setSuccess('');
    setSavingStatusId(post.id);
    try {
      const response = await sessionFetch(`${API_BASE}${encodeURIComponent(post.slug)}/`, {
        method: 'PATCH',
        headers: headers(true),
        body: JSON.stringify({ status }),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(errorMessage(data, 'Could not update the post status.'));
      const returnedPost = normalizePost(data);
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, status: returnedPost?.status ?? status } : item)));
      setSuccess(`Post status updated.`);
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the post status.');
    } finally {
      setSavingStatusId(null);
    }
  };

  const toggleLike = async (post: BlogItem) => {
    setLikingId(post.id);
    try {
      const response = await sessionFetch(`${API_BASE}${encodeURIComponent(post.slug)}/like/`, { method: 'POST', headers: headers() });
      if (!response.ok) throw new Error();
      await loadPosts();
    } catch (err) {
      // silent fail for likes
    } finally {
      setLikingId(null);
    }
  };

  const submitComment = async (event: React.FormEvent<HTMLFormElement>, post: BlogItem) => {
    event.preventDefault();
    const draft = (commentDrafts[post.id] || '').trim();
    if (!draft) return;
    setCommentingId(post.id);
    try {
      const response = await sessionFetch(`${API_BASE}${encodeURIComponent(post.slug)}/comments/`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ post: post.id, content: draft }),
      });
      if (!response.ok) throw new Error('Could not submit comment.');
      setCommentDrafts((current) => ({ ...current, [post.id]: '' }));
      setOpenComments((current) => (current.includes(post.id) ? current : [...current, post.id]));
      await loadPosts();
    } catch (err) {
      setError(String(err));
    } finally {
      setCommentingId(null);
    }
  };

  const toggleId = (id: number, setter: React.Dispatch<React.SetStateAction<number[]>>) => {
    setter((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Blogs Overview</h1>
            <p className="mt-1 text-sm text-slate-500">Community pieces, opinions, and personal stories.</p>
          </div>
          <nav className="flex gap-3">
            {onBackToDashboard && (
              <button onClick={onBackToDashboard} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Dashboard
              </button>
            )}
            {onNavigateToArticles && (
              <button onClick={onNavigateToArticles} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm">
                View Feed
              </button>
            )}
          </nav>
        </header>

        {(error || success) && (
          <div className={`mb-8 flex items-center justify-between rounded-md border px-4 py-3 text-sm font-medium ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            <span>{error || success}</span>
            <button onClick={() => { setError(''); setSuccess(''); }} className="opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        {/* Dashboard Cards */}
        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <OverviewCard 
            title="Blog Drafts" 
            value={loading ? '-' : counts.draft} 
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="border-t-amber-500" 
            textColor="text-amber-600" 
            bgTint="bg-amber-50"
            linkText="View drafts" 
            onClick={() => setStatusFilter('draft')} 
          />

          <OverviewCard 
            title="In Review" 
            value={loading ? '-' : counts.under_review} 
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            colorClass="border-t-red-500" 
            textColor="text-red-600" 
            bgTint="bg-red-50"
            linkText="Review queue" 
            onClick={() => setStatusFilter('under_review')} 
          />

          <OverviewCard 
            title="Approved" 
            value={loading ? '-' : counts.approved} 
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            colorClass="border-t-teal-500" 
            textColor="text-teal-600" 
            bgTint="bg-teal-50"
            linkText="Ready to publish" 
            onClick={() => setStatusFilter('approved')} 
          />

          <OverviewCard 
            title="Published" 
            value={loading ? '-' : counts.published} 
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
            colorClass="border-t-emerald-500" 
            textColor="text-emerald-600" 
            bgTint="bg-emerald-50"
            linkText="Live blogs" 
            onClick={() => setStatusFilter('published')} 
          />

          <OverviewCard 
            title="Total Likes" 
            value={loading ? '-' : totalLikes} 
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            colorClass="border-t-purple-500" 
            textColor="text-purple-600" 
            bgTint="bg-purple-50"
            linkText="View analytics" 
            onClick={() => setStatusFilter('all')} 
          />
        </section>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          
          <section className="min-w-0 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search articles..."
                  className="w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="popular">Popular</option>
                </select>
                <button onClick={() => void loadPosts()} disabled={refreshing} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                  ↻
                </button>
              </div>
            </div>

            <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
              {[{v:'all',l:'All'},{v:'draft',l:'Drafts'},{v:'under_review',l:'In Review'},{v:'approved',l:'Approved'},{v:'published',l:'Published'}].map(t => (
                <button key={t.v} onClick={() => setStatusFilter(t.v as StatusFilter)} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${statusFilter === t.v ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
                  {t.l}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-white border border-slate-200 shadow-sm" />)}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
                <p className="text-slate-500">No blogs found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const comments = post.comments || [];
                  const isExpanded = expandedPosts.includes(post.id);
                  const showComments = openComments.includes(post.id);
                  const longContent = post.content.length > 250;
                  const displayedContent = longContent && !isExpanded ? `${post.content.slice(0, 250)}...` : post.content;
                  const isOwnPost = !!session?.username && session.username === post.author_username;

                  return (
                    <article key={post.id} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => toggleId(post.id, setExpandedPosts)}>
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {initials(authorName(post))}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{authorName(post)} {isOwnPost && <span className="text-xs text-slate-400 ml-1">(You)</span>}</p>
                              <p className="text-xs text-slate-500">{formatDate(post.created_at)}</p>
                            </div>
                          </div>
                          <StatusBadge status={post.status} />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-slate-900">{post.title}</h3>
                        <p className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed">{displayedContent}</p>
                      </div>

                      <div className="bg-slate-50 border-t border-slate-100 px-5 py-4">
                        {isOwnPost && (post.status === 'draft' || post.status === 'rejected') && (
                          <div className="mb-4 flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingPost(post); setTitle(post.title); setContent(post.content); setNewPostStatus('draft'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded bg-white border border-slate-200 shadow-sm">
                              Edit Draft
                            </button>
                            {post.status === 'draft' && (
                              <button 
                                disabled={savingStatusId === post.id}
                                onClick={(e) => { e.stopPropagation(); void changePostStatus(post, 'under_review'); }} 
                                className="text-xs font-medium text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200 shadow-sm disabled:opacity-50"
                              >
                                {savingStatusId === post.id ? 'Submitting...' : 'Submit for Review'}
                              </button>
                            )}
                          </div>
                        )}

                        {post.status === 'published' && (
                          <>
                            <div className="flex items-center gap-6">
                              <button onClick={(e) => { e.stopPropagation(); void toggleLike(post); }} className={`flex items-center gap-1.5 text-sm font-medium ${likingId === post.id ? 'opacity-50' : 'text-slate-600 hover:text-rose-600'}`}>
                                <svg className={`w-4 h-4 ${post.likes_count ? 'text-rose-500' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                {post.likes_count || 0}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); toggleId(post.id, setOpenComments); }} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">
                                <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                                {comments.length}
                              </button>
                            </div>

                            {showComments && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                {comments.length > 0 && (
                                  <div className="space-y-4 mb-4">
                                    {comments.map((comment) => (
                                      <div key={comment.id} className="flex gap-3">
                                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{initials(commentName(comment))}</div>
                                        <div>
                                          <div className="flex items-baseline gap-2"><span className="text-sm font-medium text-slate-800">{commentName(comment)}</span><span className="text-[10px] text-slate-400">{formatDate(comment.created_at)}</span></div>
                                          <p className="text-sm text-slate-600 mt-0.5">{comment.content}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <form onSubmit={(e) => { e.stopPropagation(); void submitComment(e, post); }} className="flex gap-2">
                                  <input type="text" value={commentDrafts[post.id] || ''} onChange={(e) => setCommentDrafts((c) => ({ ...c, [post.id]: e.target.value }))} placeholder="Add a comment..." className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm" />
                                  <button type="submit" disabled={commentingId === post.id || !commentDrafts[post.id]} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 shadow-sm">Post</button>
                                </form>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-6 lg:sticky lg:top-8">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-900">{editingPost ? 'Edit Blog' : 'Compose'}</h2>
              <form onSubmit={(event) => void savePost(event, newPostStatus)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Title</label>
                  <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} required className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Content</label>
                  <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} required className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Action</label>
                  <select value={newPostStatus} onChange={(event) => setNewPostStatus(event.target.value as 'draft' | 'under_review')} className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm cursor-pointer">
                    <option value="draft">Save as Draft</option>
                    <option value="under_review">Submit for Review</option>
                  </select>
                </div>
                <button type="submit" disabled={saving || !title.trim() || !content.trim()} className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
                  {saving ? 'Saving...' : 'Save Blog'}
                </button>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function OverviewCard({
  title,
  value,
  icon,
  colorClass,
  textColor,
  bgTint,
  linkText,
  onClick
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string; 
  textColor: string;
  bgTint: string;
  linkText: string;
  onClick: () => void;
}) {
  return (
    <div className={`rounded-xl bg-white border-l border-r border-b border-slate-200 border-t-4 ${colorClass} p-5 flex flex-col justify-between h-36 shadow-sm`}>
      <div className="flex justify-between items-start">
        <h3 className="text-slate-600 font-medium text-sm">{title}</h3>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${bgTint} ${textColor}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 mt-1 mb-3">{value}</p>
      <button onClick={onClick} className={`text-sm font-medium hover:opacity-80 text-left transition-opacity ${textColor} flex items-center gap-1 w-max`}>
        {linkText} <span>&rarr;</span>
      </button>
    </div>
  );
}

export default BlogView;