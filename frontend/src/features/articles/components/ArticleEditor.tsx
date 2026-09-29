import React, { useState } from 'react';

export const ArticleEditor: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiMessage, setApiMessage] = useState('');

  async function handlePublishSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setApiMessage('Validation Error: Both title and document body text nodes are required.');
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

      const response = await fetch('/api/articles/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ title, content, status }),
      });

      await response.json();

      if (!response.ok) {
        setApiMessage('Access Blocked: Make sure you are signed in.');
        return;
      }

      setApiMessage('Success: Article saved and synchronized cleanly with the Django database ledger!');
      setTitle('');
      setContent('');
    } catch (error) {
      setApiMessage('Network Failure: Cannot establish connection pipeline with the Django server.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      {/* Premium Dark Header Banner */}
      <div style={{ backgroundColor: '#020617', color: '#ffffff', borderRadius: '16px', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', border: '1px solid #1e293b' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'monospace' }}>Editorial Board Dashboard / Creator Space</div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Constitutional Manuscript Composer</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>Draft precise civic guides, structural legal breakdowns, and institutional models. All modifications are compiled and tracked via the system's ledger.</p>
        </div>
      </div>

      {/* Main Structural Twin-Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        
        {/* Left Side: Document Inputs Panel */}
        <form onSubmit={handlePublishSubmit} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', margin: 0, fontFamily: 'monospace' }}>Document Input Controls</h2>
          
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>Document Title</label>
            <input 
              type="text" 
              placeholder="Enter precise legislative or educational text title..."
              style={{ width: '100%', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>Workflow Processing Route</label>
            <select 
              style={{ width: '100%', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f8fafc', fontWeight: '500' }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Save to Internal System App Drafts Gallery</option>
              <option value="published">Deploy Immediately to Public Live Ledger</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>Manuscript Content Body</label>
            <textarea 
              placeholder="Inject legal articles text, explanatory analysis sections, and constitutional definitions blocks..."
              rows={12}
              style={{ width: '100%', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#f8fafc', resize: 'none', lineHeight: '1.6', fontFamily: 'serif' }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {apiMessage && (
            <div style={{ padding: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', backgroundColor: apiMessage.startsWith('Success') ? '#f0fdf4' : '#fef2f2', color: apiMessage.startsWith('Success') ? '#166534' : '#991b1b', border: apiMessage.startsWith('Success') ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
              {apiMessage}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '8px', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', maxWidth: '300px', lineHeight: '1.4' }}>Submitting updates validates operational parameters and indexes information inside the group ledger.</span>
            <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '14px 28px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1, fontFamily: 'monospace' }}>
              {isSubmitting ? 'Syncing...' : 'Commit Manuscript'}
            </button>
          </div>
        </form>

        {/* Right Side: Professional Live Preview Monitor */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', margin: 0, fontFamily: 'monospace' }}>Live Preview Monitor</h2>
            <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '4px', backgroundColor: status === 'published' ? '#f0fdf4' : '#fff9db', color: status === 'published' ? '#166534' : '#b58900', border: '1px solid currentColor', fontFamily: 'monospace' }}>
              Target: {status === 'published' ? 'Live Channel' : 'Draft Layer'}
            </span>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '28px', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div>
              <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontFamily: 'monospace' }}>Verification Ledger Node / Canvas Preview</div>
              <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: title ? '#0f172a' : '#cbd5e1', margin: '0 0 16px 0', lineHeight: '1.3' }}>{title || 'Untitled Document Entry'}</h3>
              <p style={{ fontSize: '16px', color: content ? '#334155' : '#cbd5e1', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap', fontStyle: content ? 'normal' : 'italic', fontFamily: 'serif' }}>
                {content || 'Begin typing document metrics and textual clauses inside the composer layout configuration dashboard workspace on the left hand panel to observe real-time formatting layouts here...'}
              </p>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
              <span>Author identity: Dida (You)</span>
              <span>Layout Status: Checked</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
