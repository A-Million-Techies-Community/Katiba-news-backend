import React, { useEffect, useState } from 'react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  author_username: string;
  likes_count: number;
  created_at: string;
}

export const BlogView: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiMessage, setApiMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchBlogPosts() {
    try {
      const response = await fetch('/api/blogs/');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch {
      console.error('Failed to update conversation threads.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  async function handleCommentSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!commentText.trim()) {
      setApiMessage('Validation Error: Input space cannot be blank.');
      return;
    }

    setIsSubmitting(true);
    setApiMessage('');

    try {
      const sessionData = sessionStorage.getItem('katibaUserSession');
      let accessToken = '';
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        accessToken = parsed.access || '';
      }

      const response = await fetch('/api/blogs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ title: "Civic Voice Thread", content: commentText }),
      });

      await response.json();

      if (!response.ok) {
        setApiMessage(`Access Blocked: Make sure you are signed in.`);
        return;
      }

      setApiMessage('Success: Your civic perspective has been added live to the feed!');
      setCommentText('');
      fetchBlogPosts();
    } catch {
      setApiMessage('Network Failure: Unable to establish contact with the server.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLikeClick(slug: string) {
    try {
      const sessionData = sessionStorage.getItem('katibaUserSession');
      let accessToken = '';
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        accessToken = parsed.access || '';
      }

      const response = await fetch(`/api/blogs/${slug}/like/`, {
        method: 'POST',
        headers: {
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        }
      });

      if (response.ok) {
        fetchBlogPosts();
      }
    } catch {
      console.error('Could not toggle interaction parameters.');
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', color: '#64748b', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          Public Discussion Forum / Citizen Voice
        </div>
        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#475569', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '6px' }}>
          Active Threads: {posts.length}
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
        <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a', marginBottom: '10px', fontFamily: 'monospace' }}>
              Start an Opinion Thread or Post Public Feedback
            </label>
            <textarea 
              placeholder="Share an articulate thought perspective regarding constitutional amendments..."
              rows={3}
              style={{ width: '100%', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc', resize: 'none', lineHeight: '1.5' }}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
          </div>

          {apiMessage && (
            <div style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', backgroundColor: apiMessage.startsWith('Success') ? '#f0fdf4' : '#fef2f2', color: apiMessage.startsWith('Success') ? '#166534' : '#991b1b', border: apiMessage.startsWith('Success') ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
              {apiMessage}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, maxWidth: '400px', lineHeight: '1.4' }}>Keep submissions civic, precise, and focused on institutional framework reviews.</p>
            <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1, fontFamily: 'monospace' }}>
              {isSubmitting ? 'Posting...' : 'Deploy Voice Node'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Active Community Thread Timeline Feed Stream */}
      {loading ? (
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}>Synchronizing community conversations...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic', margin: 0, fontFamily: 'serif' }}>No community dialogues have been registered on the server yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {posts.map((post) => (
            <div key={post.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '12px' }}>
                <span style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>User: {post.author_username || 'Citizen'}</span>
                <span>•</span>
                <span>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'serif' }}>{post.content}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => handleLikeClick(post.slug)} style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', cursor: 'pointer', fontFamily: 'monospace' }}>♡ Upvote Insight</button>
                <div style={{ width: '1px', height: '12px', backgroundColor: '#e2e8f0' }}></div>
                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>Support Tally: <strong style={{ color: '#0f172a' }}>{post.likes_count}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
