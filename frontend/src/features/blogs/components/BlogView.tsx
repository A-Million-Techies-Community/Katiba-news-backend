import React, { useState, useEffect } from 'react';

interface BlogItem {
  id: number;
  title?: string;
  slug?: string;
  content: string;
  author_username?: string;
  likes_count?: number;
  created_at?: string;
}

interface BlogViewProps {
  onBackToDashboard?: () => void;
  onNavigateToArticles?: () => void;
}

const extractList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

export const BlogView: React.FC<BlogViewProps> = ({ onBackToDashboard, onNavigateToArticles }) => {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [postText, setPostText] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBlogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/blogs/?page_size=100');
      if (res.ok) {
        const data = await res.json();
        setBlogs(extractList(data));
      }
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const sessionData = sessionStorage.getItem('katibaUserSession');
      let token = '';
      let username = 'Guest Author';

      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          token = parsed.access || '';
          username = parsed.username || 'Abdube Dida';
        } catch {
          // Fallback if session parsing fails
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const titleValue = postTitle.trim() || 'Community Discussion';
      // Auto-generate URL-friendly slug required by Django BlogPost models
      const slugValue =
        titleValue
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') || `post-${Date.now()}`;

      const payload = {
        title: titleValue,
        slug: slugValue,
        content: postText.trim(),
        author_username: username,
      };

      const res = await fetch('/api/blogs/', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedBlog = await res.json().catch(() => null);
        setPostText('');
        setPostTitle('');
        setMessage({ type: 'success', text: 'Blog post published successfully!' });

        if (savedBlog && savedBlog.id) {
          setBlogs((prev) => [savedBlog, ...prev]);
        } else {
          fetchBlogs();
        }
      } else {
        // Parse exact Django error messages (e.g., missing author, bad slug, unauthenticated)
        let errorDetails = '';
        try {
          const errData = await res.json();
          if (typeof errData === 'object' && errData !== null) {
            errorDetails = Object.entries(errData)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
              .join(' | ');
          }
        } catch {
          errorDetails = `HTTP ${res.status} ${res.statusText}`;
        }

        setMessage({
          type: 'error',
          text: `Database Error (${res.status}): ${errorDetails || 'Failed to save post to Django database.'}`,
        });
      }
    } catch (err) {
      console.error('Error posting blog:', err);
      setMessage({
        type: 'error',
        text: 'Could not connect to Django backend server. Please check your API connection.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
            Blogs & Public Discussion
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
            Share commentary, read citizen perspectives, and participate in community dialogues.
          </p>
        </div>

        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
            }}
          >
            ← Back to Dashboard
          </button>
        )}
      </div>

      {/* Post Editor Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.5px',
            color: '#475569',
            marginBottom: '12px',
          }}
        >
          START A DISCUSSION OR SHARE FEEDBACK
        </div>

        <form onSubmit={handlePublishPost}>
          <input
            type="text"
            placeholder="Title / Topic (Optional)"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              marginBottom: '12px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <textarea
            rows={4}
            placeholder="Type your commentary or civic post here..."
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />

          {message && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: message.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {message.text}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Submissions should remain constructive, respectful, and focused on community engagement.
            </span>

            <button
              type="submit"
              disabled={isSubmitting || !postText.trim()}
              style={{
                backgroundColor: postText.trim() ? '#006f64' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: postText.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s ease',
              }}
            >
              {isSubmitting ? 'Publishing...' : 'Publish Post →'}
            </button>
          </div>
        </form>
      </div>

      {/* Blog Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Loading community posts...
          </div>
        ) : blogs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            No community posts have been published yet. Be the first to start a conversation!
          </div>
        ) : (
          blogs.map((blog) => (
            <div
              key={blog.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: '#006f64',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '800',
                    }}
                  >
                    {(blog.author_username || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                      {blog.author_username || 'Anonymous'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>
                      {formatDate(blog.created_at)}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  ❤️ {blog.likes_count || 0} Likes
                </span>
              </div>

              {blog.title && blog.title !== 'Community Discussion' && (
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#1e293b' }}>
                  {blog.title}
                </h3>
              )}

              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {blog.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};