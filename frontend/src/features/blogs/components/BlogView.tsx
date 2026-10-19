import { sessionFetch } from '../../../auth/session'

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

  // Posts created before status support are treated as published.
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function initials(value?: string): string {
  const name = value?.trim();
  if (!name) return 'U';

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function authorName(post: BlogItem): string {
  return post.author_username?.trim() || 'Unknown author';
}

function commentName(comment: BlogComment): string {
  return comment.user_username?.trim() || 'Community member';
}

function statusLabel(status: BlogStatus): string {
  switch (status) {
    case 'approved': return 'Approved';
    case 'rejected': return 'Needs changes';
    case 'draft':
      return 'Draft';
    case 'under_review':
      return 'Under review';
    case 'published':
      return 'Published';
  }
}

function statusClasses(status: BlogStatus): string {
  switch (status) {
    case 'approved': return 'bg-emerald-50 text-emerald-700';
    case 'rejected': return 'bg-red-50 text-red-700';
    case 'draft':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    case 'under_review':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'published':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
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
  const [newPostStatus, setNewPostStatus] = useState<
    'draft' | 'under_review'
  >('draft');

  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>(
    {},
  );
  const [expandedPosts, setExpandedPosts] = useState<number[]>([]);
  const [openComments, setOpenComments] = useState<number[]>([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const session = readSession();

  const loadPosts = useCallback(async (initial = false) => {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError('');

    try {
      const response = await sessionFetch(`${API_BASE}?mine=true&page_size=100`, {
        headers: headers(),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(errorMessage(data, 'Unable to load posts.'));
      }

      setPosts(
        extractList<unknown>(data)
          .map(normalizePost)
          .filter((post): post is BlogItem => post !== null),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the blog server.',
      );
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
      under_review: posts.filter((post) => post.status === 'under_review')
        .length,
      published: posts.filter((post) => post.status === 'published').length,
    }),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts
      .filter((post) => {
        if (statusFilter !== 'all' && post.status !== statusFilter) {
          return false;
        }

        if (!query) return true;

        return (
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          authorName(post).toLowerCase().includes(query) ||
          (post.comments || []).some((comment) =>
            comment.content.toLowerCase().includes(query),
          )
        );
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          return (b.likes_count || 0) - (a.likes_count || 0);
        }

        const first = new Date(a.created_at).getTime() || 0;
        const second = new Date(b.created_at).getTime() || 0;

        return sortBy === 'newest' ? second - first : first - second;
      });
  }, [posts, search, sortBy, statusFilter]);

  const publishedPosts = posts.filter(
    (post) => post.status === 'published',
  );

  const totalLikes = publishedPosts.reduce(
    (sum, post) => sum + (post.likes_count || 0),
    0,
  );

  const totalComments = publishedPosts.reduce(
    (sum, post) => sum + (post.comments?.length || 0),
    0,
  );

  const savePost = async (
    event: React.FormEvent<HTMLFormElement>,
    status: 'draft' | 'under_review',
  ) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent) {
      setError('Enter a title and the content of your post.');
      return;
    }

    if (cleanTitle.length > 255) {
      setError('The title cannot exceed 255 characters.');
      return;
    }

    setSaving(true);

    try {
      const response = await sessionFetch(editingPost ? `${API_BASE}${encodeURIComponent(editingPost.slug)}/` : API_BASE, {
        method: editingPost ? 'PATCH' : 'POST',
        headers: headers(true),
        body: JSON.stringify({
          title: cleanTitle,
          content: cleanContent,
          status,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(errorMessage(data, 'Could not save your post.'));
      }

      setTitle('');
      setContent('');
      setNewPostStatus('draft');
      setEditingPost(null);

      setSuccess(
        status === 'draft'
          ? 'Your post was saved as a draft.'
          : 'Your post was submitted for review.',
      );

      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save your post.',
      );
    } finally {
      setSaving(false);
    }
  };

  const changePostStatus = async (
    post: BlogItem,
    status: BlogStatus,
  ) => {
    setError('');
    setSuccess('');
    setSavingStatusId(post.id);

    try {
      const response = await sessionFetch(
        `${API_BASE}${encodeURIComponent(post.slug)}/`,
        {
          method: 'PATCH',
          headers: headers(true),
          body: JSON.stringify({ status }),
        },
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          errorMessage(
            data,
            'Could not update the post status. Check your API permissions and status field.',
          ),
        );
      }

      const returnedPost = normalizePost(data);

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, status: returnedPost?.status ?? status }
            : item,
        ),
      );

      setSuccess(`Post status changed to "${statusLabel(status)}".`);
      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update the post status.',
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  const toggleLike = async (post: BlogItem) => {
    setError('');
    setSuccess('');
    setLikingId(post.id);

    try {
      const response = await sessionFetch(
        `${API_BASE}${encodeURIComponent(post.slug)}/like/`,
        { method: 'POST', headers: headers() },
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(errorMessage(data, 'Could not update the like.'));
      }

      setSuccess('Your like action was saved.');
      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not update the like.',
      );
    } finally {
      setLikingId(null);
    }
  };

  const submitComment = async (
    event: React.FormEvent<HTMLFormElement>,
    post: BlogItem,
  ) => {
    event.preventDefault();

    const draft = (commentDrafts[post.id] || '').trim();

    if (!draft) {
      setError('Write a comment before submitting.');
      return;
    }

    setError('');
    setSuccess('');
    setCommentingId(post.id);

    try {
      const response = await sessionFetch(
        `${API_BASE}${encodeURIComponent(post.slug)}/comments/`,
        {
          method: 'POST',
          headers: headers(true),
          body: JSON.stringify({ post: post.id, content: draft }),
        },
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(errorMessage(data, 'Could not submit your comment.'));
      }

      setCommentDrafts((current) => ({ ...current, [post.id]: '' }));
      setSuccess('Your comment was saved.');

      setOpenComments((current) =>
        current.includes(post.id) ? current : [...current, post.id],
      );

      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not submit your comment.',
      );
    } finally {
      setCommentingId(null);
    }
  };

  const toggleId = (
    id: number,
    setter: React.Dispatch<React.SetStateAction<number[]>>,
  ) => {
    setter((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const statusTabs: {
    value: StatusFilter;
    label: string;
    count: number;
  }[] = [
    { value: 'all', label: 'All posts', count: counts.all },
    { value: 'draft', label: 'Draft', count: counts.draft },
    {
      value: 'under_review',
      label: 'Under review',
      count: counts.under_review,
    },
    { value: 'published', label: 'Published', count: counts.published },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
              K
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                Katiba News
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                Community blog
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create, review and manage your posts.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                ← Dashboard
              </button>
            )}
            {onNavigateToArticles && (
              <button
                type="button"
                onClick={onNavigateToArticles}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Articles
              </button>
            )}
          </nav>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="Published posts"
            value={loading ? '—' : counts.published.toLocaleString('en-KE')}
            icon="▤"
          />
          <Stat
            label="Total likes"
            value={loading ? '—' : totalLikes.toLocaleString('en-KE')}
            icon="♡"
          />
          <Stat
            label="Comments"
            value={loading ? '—' : totalComments.toLocaleString('en-KE')}
            icon="☰"
          />
        </section>

        {(error || success) && (
          <div
            role={error ? 'alert' : 'status'}
            className={`mb-5 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <span>{error || success}</span>
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
              }}
              aria-label="Dismiss message"
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search posts</span>
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search posts or authors..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="sr-only">Sort posts</span>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as SortOption)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 sm:w-auto"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="popular">Most liked</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => void loadPosts()}
                disabled={refreshing}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
              >
                {refreshing ? 'Refreshing…' : '↻ Refresh'}
              </button>
            </div>

            <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {statusFilter === 'all'
                  ? 'All posts'
                  : statusLabel(statusFilter)}
              </h2>
              <span className="text-xs text-slate-500">
                {loading ? 'Loading…' : `${filteredPosts.length} posts`}
              </span>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse p-4">
                    <div className="mb-3 h-3 w-28 rounded bg-slate-200" />
                    <div className="mb-3 h-5 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <div className="mb-3 text-3xl text-slate-300">
                  {search ? '⌕' : '✎'}
                </div>
                <h3 className="font-semibold text-slate-800">
                  {search
                    ? 'No matching posts'
                    : statusFilter === 'all'
                      ? 'No posts yet'
                      : `No ${statusLabel(statusFilter).toLowerCase()} posts`}
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                  {search
                    ? 'Try another search phrase.'
                    : 'Posts in this section will appear here.'}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mt-3 text-sm font-semibold text-blue-600"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {filteredPosts.map((post) => {
                  const comments = post.comments || [];
                  const isExpanded = expandedPosts.includes(post.id);
                  const showComments = openComments.includes(post.id);
                  const longContent = post.content.length > 420;
                  const displayedContent =
                    longContent && !isExpanded
                      ? `${post.content.slice(0, 420)}…`
                      : post.content;

                  const isOwnPost =
                    !!session?.username &&
                    session.username === post.author_username;

                  return (
                    <article key={post.id} className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                          {initials(authorName(post))}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-slate-800">
                              {authorName(post)}
                            </span>

                            {isOwnPost && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                You
                              </span>
                            )}

                            <span className="text-xs text-slate-400">·</span>

                            <time
                              dateTime={post.created_at}
                              className="text-xs text-slate-500"
                            >
                              {formatDate(post.created_at)}
                            </time>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-lg font-bold leading-snug text-slate-900">
                              {post.title}
                            </h3>
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(post.status)}`}
                            >
                              {statusLabel(post.status)}
                            </span>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                            {displayedContent}
                          </p>

                          {longContent && (
                            <button
                              type="button"
                              onClick={() =>
                                toggleId(post.id, setExpandedPosts)
                              }
                              className="mt-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}

                          {isOwnPost && (
                            <div className="mt-3 flex flex-wrap gap-2 rounded-lg bg-slate-50 p-2.5">
                              <span className="self-center text-xs font-semibold text-slate-500">
                                Manage:
                              </span>

                              {(post.status === 'draft' || post.status === 'rejected') && <><button onClick={() => { setEditingPost(post); setTitle(post.title); setContent(post.content); setNewPostStatus('draft'); document.getElementById('blog-composer')?.scrollIntoView({ behavior: 'smooth' }) }}>Edit draft</button><button className="text-red-700" disabled={savingStatusId === post.id} onClick={async () => { if (!window.confirm(`Delete draft “${post.title}”?`)) return; setSavingStatusId(post.id); setError(''); try { const response = await sessionFetch(`${API_BASE}${encodeURIComponent(post.slug)}/`, { method: 'DELETE' }); if (!response.ok) throw new Error('Could not delete draft.'); await loadPosts() } catch (err) { setError(String(err)) } finally { setSavingStatusId(null) } }}>Delete draft</button></>}
                              {post.status === 'draft' && (
                                <button
                                  type="button"
                                  disabled={savingStatusId === post.id}
                                  onClick={() =>
                                    void changePostStatus(post, 'under_review')
                                  }
                                  className="rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {savingStatusId === post.id
                                    ? 'Saving…'
                                    : 'Submit for review'}
                                </button>
                              )}

                              {post.status === 'under_review' && <span className="text-xs text-slate-500">Awaiting editor review</span>}
                              {post.status === 'approved' && <span className="text-xs text-slate-500">Approved · awaiting publication</span>}
                              {post.status === 'rejected' && <button disabled={savingStatusId === post.id} onClick={() => void changePostStatus(post, 'draft')}>Return to draft</button>}
                              {post.feedback && <p className="text-sm text-slate-600">Editor feedback: {post.feedback}</p>}

                            </div>
                          )}

                          {post.status === 'published' && (
                            <>
                              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span>
                                    <strong className="font-semibold text-slate-700">
                                      {post.likes_count || 0}
                                    </strong>{' '}
                                    likes
                                  </span>
                                  <span>
                                    <strong className="font-semibold text-slate-700">
                                      {comments.length}
                                    </strong>{' '}
                                    comments
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void toggleLike(post)}
                                    disabled={likingId === post.id}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                                  >
                                    {likingId === post.id
                                      ? 'Updating…'
                                      : '♡ Like'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleId(post.id, setOpenComments)
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                  >
                                    {showComments
                                      ? 'Hide comments'
                                      : 'Comment'}
                                  </button>
                                </div>
                              </div>

                              {showComments && (
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                  <h4 className="mb-3 text-sm font-semibold text-slate-800">
                                    Discussion
                                  </h4>

                                  {comments.length === 0 ? (
                                    <p className="mb-3 text-sm text-slate-500">
                                      No comments yet. Start the conversation.
                                    </p>
                                  ) : (
                                    <div className="mb-4 space-y-3">
                                      {comments.map((comment) => (
                                        <div
                                          key={comment.id}
                                          className="flex gap-2.5"
                                        >
                                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                            {initials(commentName(comment))}
                                          </div>

                                          <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <span className="text-xs font-semibold text-slate-800">
                                                {commentName(comment)}
                                              </span>
                                              <time className="text-[10px] text-slate-400">
                                                {formatDate(comment.created_at)}
                                              </time>
                                            </div>
                                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">
                                              {comment.content}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <form
                                    onSubmit={(event) =>
                                      void submitComment(event, post)
                                    }
                                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                                  >
                                    <label className="min-w-0 flex-1">
                                      <span className="sr-only">
                                        Write a comment
                                      </span>
                                      <textarea
                                        value={commentDrafts[post.id] || ''}
                                        onChange={(event) =>
                                          setCommentDrafts((current) => ({
                                            ...current,
                                            [post.id]: event.target.value,
                                          }))
                                        }
                                        rows={2}
                                        maxLength={5000}
                                        required
                                        placeholder="Write a comment…"
                                        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                      />
                                    </label>

                                    <button
                                      type="submit"
                                      disabled={
                                        commentingId === post.id ||
                                        !(commentDrafts[post.id] || '').trim()
                                      }
                                      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {commentingId === post.id
                                        ? 'Sending…'
                                        : 'Send'}
                                    </button>
                                  </form>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-5">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-4">
                <h2 className="text-base font-bold text-slate-900">
                  Create a post
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {editingPost ? `Editing: ${editingPost.title}` : 'Save a draft or submit your post for review.'}
                </p>
              </div>

              <form
                id="blog-composer" onSubmit={(event) => void savePost(event, newPostStatus)}
                className="space-y-3 p-4"
              >
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Title
                  </span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={255}
                    required
                    placeholder="Post headline"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="mt-1 block text-right text-[10px] text-slate-400">
                    {title.length}/255
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Message
                  </span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={20000}
                    rows={6}
                    required
                    placeholder="Write your thoughts here…"
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="mt-1 block text-right text-[10px] text-slate-400">
                    {content.length.toLocaleString('en-KE')}/20,000
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Save as
                  </span>
                  <select
                    value={newPostStatus}
                    onChange={(event) =>
                      setNewPostStatus(
                        event.target.value as 'draft' | 'under_review',
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="draft">Draft</option>
                    <option value="under_review">Submit for review</option>
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={saving || !title.trim() || !content.trim()}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? 'Saving…'
                    : newPostStatus === 'draft'
                      ? 'Save draft'
                      : 'Submit for review'}
                </button>

                <p className="text-xs leading-5 text-slate-400">
                  Posts are saved through the Katiba News API.
                </p>
              </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Post workflow
              </h3>

              <ol className="mt-3 space-y-3">
                <WorkflowStep
                  number="1"
                  title="Draft"
                  description="Write and save your work."
                  color="bg-slate-100 text-slate-700"
                />
                <WorkflowStep
                  number="2"
                  title="Under review"
                  description="Submit your post for review."
                  color="bg-amber-50 text-amber-800"
                />
                <WorkflowStep
                  number="3"
                  title="Published"
                  description="Make your post available to readers."
                  color="bg-emerald-50 text-emerald-700"
                />
              </ol>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Community guidelines
              </h3>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                <li>✓ Respect different perspectives.</li>
                <li>✓ Share accurate information.</li>
                <li>✓ Keep discussions constructive.</li>
                <li>✓ Protect personal information.</li>
              </ul>
            </section>

            {onNavigateToArticles && (
              <button
                type="button"
                onClick={onNavigateToArticles}
                className="w-full rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left transition hover:bg-blue-100"
              >
                <span className="block text-sm font-semibold text-blue-800">
                  Explore published articles →
                </span>
                <span className="mt-1 block text-xs text-blue-700">
                  Read more from Katiba News.
                </span>
              </button>
            )}
          </aside>
        </div>

        <footer className="mt-9 border-t border-slate-200 py-5 text-center text-xs text-slate-400">
          Katiba News · Community blog
        </footer>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg text-blue-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold leading-6 text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  description,
  color,
}: {
  number: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}
      >
        {number}
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </li>
  );
}

export default BlogView;
