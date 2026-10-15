import React, { useState } from 'react';

type Template = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  openingPlaceholder: string;
  bodyPlaceholder: string;
  headingPlaceholder: string;
  sectionPlaceholder: string;
  quotePlaceholder: string;
  takeawayPlaceholder: string;
};

interface ArticleEditorProps {
  onBackToDashboard?: () => void;
}

const templates: Template[] = [
  {
    id: 'standard',
    title: 'Standard News Article',
    description: 'Perfect for daily news, announcements, events and official statements.',
    icon: '📰',
    color: '#10b981',
    openingPlaceholder: 'Start with the most important information. What happened?',
    bodyPlaceholder: 'Provide more details about the event, people involved and what happened next.',
    headingPlaceholder: 'Background',
    sectionPlaceholder: 'Provide background information and important context.',
    quotePlaceholder: 'Add an important quote from a person involved...',
    takeawayPlaceholder: 'What is the most important thing readers should remember?',
  },
  {
    id: 'breaking',
    title: 'Breaking News',
    description: 'For urgent and developing stories that need immediate attention.',
    icon: '🔔',
    color: '#ef4444',
    openingPlaceholder: 'Immediately explain what has happened and why it matters.',
    bodyPlaceholder: 'Add confirmed details about the developing situation.',
    headingPlaceholder: 'What We Know',
    sectionPlaceholder: 'Present the confirmed facts available at this time.',
    quotePlaceholder: 'Add an official confirmation or statement...',
    takeawayPlaceholder: 'What should readers know right now?',
  },
  {
    id: 'investigative',
    title: 'Investigative Article',
    description: 'For in-depth reporting, accountability and public-interest stories.',
    icon: '🔍',
    color: '#8b5cf6',
    openingPlaceholder: 'Introduce the investigation and the central issue.',
    bodyPlaceholder: 'Explain your findings and the evidence behind the story.',
    headingPlaceholder: 'Key Findings',
    sectionPlaceholder: 'Present the evidence, documents and important discoveries.',
    quotePlaceholder: 'Add a response or statement from a relevant person...',
    takeawayPlaceholder: 'What is the most significant finding?',
  },
  {
    id: 'community',
    title: 'Community / Human Interest',
    description: 'Tells the real stories of people, communities and everyday life.',
    icon: '👥',
    color: '#0f766e',
    openingPlaceholder: 'Introduce the person, family or community at the centre of the story.',
    bodyPlaceholder: 'Tell their story and explain the situation they are experiencing.',
    headingPlaceholder: 'The Community',
    sectionPlaceholder: 'Describe the community, challenge or experience.',
    quotePlaceholder: 'Add a personal quote from someone in the story...',
    takeawayPlaceholder: 'What should readers understand about this community?',
  },
  {
    id: 'politics',
    title: 'Politics & Governance',
    description: 'Covers policy, elections, government decisions and public affairs.',
    icon: '🏛️',
    color: '#2563eb',
    openingPlaceholder: 'Clearly explain the political or governance development.',
    bodyPlaceholder: 'Provide factual details, context and the positions presented.',
    headingPlaceholder: 'Key Issues',
    sectionPlaceholder: 'Explain the main policy, governance or public-interest issues.',
    quotePlaceholder: 'Add a statement from an official, stakeholder or expert...',
    takeawayPlaceholder: 'What should citizens understand about this issue?',
  },
  {
    id: 'data',
    title: 'Data / Explainer Article',
    description: 'Breaks down complex topics with simple, clear explanations.',
    icon: '📊',
    color: '#7c3aed',
    openingPlaceholder: 'Explain the issue in simple terms.',
    bodyPlaceholder: 'Break down the facts, numbers or process step by step.',
    headingPlaceholder: 'How It Works',
    sectionPlaceholder: 'Explain the topic using simple examples and facts.',
    quotePlaceholder: 'Add an expert explanation...',
    takeawayPlaceholder: 'What is the main lesson readers should take away?',
  },
  {
    id: 'opinion',
    title: 'Opinion / Commentary',
    description: 'For analysis, perspectives and editorial views.',
    icon: '✍️',
    color: '#f97316',
    openingPlaceholder: 'Introduce the subject and the perspective being presented.',
    bodyPlaceholder: 'Develop the argument or analysis.',
    headingPlaceholder: 'The Argument',
    sectionPlaceholder: 'Present supporting reasoning, evidence and context.',
    quotePlaceholder: 'Add a relevant quotation or supporting perspective...',
    takeawayPlaceholder: 'What is the central argument?',
  },
  {
    id: 'feature',
    title: 'Feature Article',
    description: 'Long-form stories with depth, context and rich detail.',
    icon: '🖼️',
    color: '#0f766e',
    openingPlaceholder: 'Open with a strong scene, person, moment or observation.',
    bodyPlaceholder: 'Develop the long-form story with detail and context.',
    headingPlaceholder: 'The Bigger Picture',
    sectionPlaceholder: 'Explore the wider context behind the story.',
    quotePlaceholder: 'Add a strong human or expert voice...',
    takeawayPlaceholder: 'What should readers remember after reading this story?',
  },
  {
    id: 'press',
    title: 'Press Release / Official Statement',
    description: 'For organizations, institutions and government agencies.',
    icon: '📢',
    color: '#0891b2',
    openingPlaceholder: 'State the official announcement clearly.',
    bodyPlaceholder: 'Provide the official details and important information.',
    headingPlaceholder: 'Key Information',
    sectionPlaceholder: 'Add the background and official context.',
    quotePlaceholder: 'Add an official statement...',
    takeawayPlaceholder: 'What is the key announcement?',
  },
  {
    id: 'education',
    title: 'Education Article',
    description: 'Covers schools, learning, students and education policy.',
    icon: '🎓',
    color: '#0f766e',
    openingPlaceholder: 'Introduce the education development or issue.',
    bodyPlaceholder: 'Explain how students, teachers, parents or institutions are affected.',
    headingPlaceholder: 'What You Need to Know',
    sectionPlaceholder: 'Provide useful information and context.',
    quotePlaceholder: 'Add a statement from a teacher, student or education official...',
    takeawayPlaceholder: 'What should readers understand about this education issue?',
  },
];

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ onBackToDashboard }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    author: '',
    readingTime: '5 min read',
    opening: '',
    body: '',
    heading: '',
    section: '',
    quote: '',
    source: '',
    takeaway: '',
    notes: '',
    status: 'draft',
  });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const handleBackToDashboard = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      window.location.href = '/authordashboard';
    }
  };

  const update = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const chooseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setMsg('');

    setForm(prev => ({
      ...prev,
      title: '',
      subtitle: '',
      opening: '',
      body: '',
      heading: template.headingPlaceholder,
      section: '',
      quote: '',
      source: '',
      takeaway: '',
      notes: '',
    }));
  };

  const goBackToTemplates = () => {
    setSelectedTemplate(null);
    setMsg('');
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim() || !form.opening.trim()) {
      setMsg('Error: Title and Opening Paragraph are required.');
      return;
    }

    setBusy(true);
    setMsg('');

    try {
      const s = sessionStorage.getItem('katibaUserSession');
      const token = s ? JSON.parse(s).access : '';

      const content = JSON.stringify({
        ...form,
        template: selectedTemplate?.id || 'standard',
        template_name: selectedTemplate?.title || 'Standard News Article',
      });

      const res = await fetch('/api/articles/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify({
          title: form.title,
          content,
          status: form.status,
        }),
      });

      if (!res.ok) throw new Error();

      setMsg('Success: Article saved successfully!');

      setForm(prev => ({
        ...prev,
        title: '',
        subtitle: '',
        opening: '',
        body: '',
        heading: '',
        section: '',
        quote: '',
        source: '',
        takeaway: '',
        notes: '',
      }));
    } catch {
      setMsg('Failure: Unable to sync with server.');
    } finally {
      setBusy(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | TEMPLATE SELECTION SCREEN
  |--------------------------------------------------------------------------
  */

  if (!selectedTemplate) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '1250px',
          margin: '0 auto',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: '#0f172a',
        }}
      >
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBackToDashboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            color: '#334155',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          <span style={{ fontSize: '20px' }}>←</span>
          <span>Back to Dashboard</span>
        </button>

        {/* Heading */}
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '34px',
              lineHeight: '1.15',
              fontWeight: '800',
              letterSpacing: '-0.8px',
              color: '#0f172a',
            }}
          >
            Create New Article
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              maxWidth: '800px',
              color: '#52657d',
              fontSize: '15px',
              lineHeight: '1.6',
            }}
          >
            Choose a format to get started. Each layout is tailored for a
            specific type of story and comes structured with pre-filled
            sections to help you write faster and better.
          </p>
        </div>

        {/* Template Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '22px',
          }}
        >
          {templates.map(template => (
            <div
              key={template.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #dbe5ed',
                borderRadius: '12px',
                padding: '22px',
                minHeight: '235px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: `${template.color}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '25px',
                  marginBottom: '18px',
                }}
              >
                {template.icon}
              </div>

              {/* Title */}
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '17px',
                  fontWeight: '800',
                  color: '#0f172a',
                  lineHeight: '1.3',
                }}
              >
                {template.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  margin: 0,
                  color: '#59708b',
                  fontSize: '13px',
                  lineHeight: '1.55',
                  flex: 1,
                }}
              >
                {template.description}
              </p>

              {/* Button */}
              <button
                type="button"
                onClick={() => chooseTemplate(template)}
                style={{
                  marginTop: '18px',
                  width: '100%',
                  height: '38px',
                  backgroundColor: '#ffffff',
                  color: '#006f64',
                  border: '1px solid #9acfc9',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Apply Blueprint
                <span style={{ marginLeft: '8px' }}>→</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ARTICLE EDITOR SCREEN
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1250px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0f172a',
      }}
    >
      {/* Top navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '22px',
        }}
      >
        <button
          type="button"
          onClick={goBackToTemplates}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#334155',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Change Format
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 12px',
            borderRadius: '20px',
            backgroundColor: `${selectedTemplate.color}12`,
            color: selectedTemplate.color,
            fontSize: '12px',
            fontWeight: '700',
          }}
        >
          <span>{selectedTemplate.icon}</span>
          {selectedTemplate.title}
        </div>
      </div>

      {/* Page title */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '30px',
            fontWeight: '800',
            letterSpacing: '-0.5px',
          }}
        >
          Write Your Article
        </h1>

        <p
          style={{
            margin: '7px 0 0',
            color: '#64748b',
            fontSize: '14px',
          }}
        >
          Use the {selectedTemplate.title} structure to create your story.
        </p>
      </div>

      {/* Main editor */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.7fr) minmax(300px, 0.8fr)',
          gap: '22px',
          alignItems: 'start',
        }}
      >
        {/* LEFT: EDITOR */}
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dbe5ed',
            borderRadius: '12px',
            padding: '26px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              color: '#64748b',
              fontWeight: '800',
              letterSpacing: '0.7px',
              marginBottom: '20px',
            }}
          >
            Article Content
          </div>

          {/* Title */}
          <label style={labelStyle}>Headline</label>

          <input
            type="text"
            placeholder="Enter your article headline..."
            value={form.title}
            onChange={e => update('title', e.target.value)}
            style={largeInputStyle}
          />

          {/* Subtitle */}
          <label style={{ ...labelStyle, marginTop: '18px' }}>
            Short Summary / Subtitle
          </label>

          <textarea
            placeholder="Write a short description that explains what the article is about..."
            rows={3}
            value={form.subtitle}
            onChange={e => update('subtitle', e.target.value)}
            style={textareaStyle}
          />

          {/* Author + reading time */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginTop: '18px',
            }}
          >
            <div>
              <label style={labelStyle}>Author</label>

              <input
                type="text"
                placeholder="Author name"
                value={form.author}
                onChange={e => update('author', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Reading Time</label>

              <input
                type="text"
                placeholder="5 min read"
                value={form.readingTime}
                onChange={e => update('readingTime', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Opening */}
          <label style={{ ...labelStyle, marginTop: '20px' }}>
            Opening Paragraph
          </label>

          <textarea
            placeholder={selectedTemplate.openingPlaceholder}
            rows={6}
            value={form.opening}
            onChange={e => update('opening', e.target.value)}
            style={bigTextareaStyle}
          />

          {/* Body */}
          <label style={{ ...labelStyle, marginTop: '20px' }}>
            Main Article Body
          </label>

          <textarea
            placeholder={selectedTemplate.bodyPlaceholder}
            rows={8}
            value={form.body}
            onChange={e => update('body', e.target.value)}
            style={bigTextareaStyle}
          />

          {/* Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '12px',
              marginTop: '20px',
            }}
          >
            <div>
              <label style={labelStyle}>Section Heading</label>

              <input
                type="text"
                placeholder={selectedTemplate.headingPlaceholder}
                value={form.heading}
                onChange={e => update('heading', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Section Content</label>

              <textarea
                placeholder={selectedTemplate.sectionPlaceholder}
                rows={5}
                value={form.section}
                onChange={e => update('section', e.target.value)}
                style={textareaStyle}
              />
            </div>
          </div>

          {/* Quote */}
          <label style={{ ...labelStyle, marginTop: '20px' }}>
            Featured Quote
          </label>

          <textarea
            placeholder={selectedTemplate.quotePlaceholder}
            rows={3}
            value={form.quote}
            onChange={e => update('quote', e.target.value)}
            style={textareaStyle}
          />

          <input
            type="text"
            placeholder="Quote source / person's name"
            value={form.source}
            onChange={e => update('source', e.target.value)}
            style={{ ...inputStyle, marginTop: '10px' }}
          />

          {/* Takeaway */}
          <label style={{ ...labelStyle, marginTop: '20px' }}>
            Key Takeaway
          </label>

          <textarea
            placeholder={selectedTemplate.takeawayPlaceholder}
            rows={3}
            value={form.takeaway}
            onChange={e => update('takeaway', e.target.value)}
            style={textareaStyle}
          />

          {/* Notes */}
          <label style={{ ...labelStyle, marginTop: '20px' }}>
            Author Notes
          </label>

          <textarea
            placeholder="Private notes, corrections or editorial references..."
            rows={3}
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            style={textareaStyle}
          />

          {/* Status / Submit */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid #eef2f7',
            }}
          >
            <select
              value={form.status}
              onChange={e => update('status', e.target.value)}
              style={inputStyle}
            >
              <option value="draft">Save as Draft</option>
              <option value="under_review">Under Review</option>
              <option value="published">Publish Article</option>
            </select>

            <button
              type="submit"
              disabled={busy}
              style={{
                height: '42px',
                border: 'none',
                borderRadius: '7px',
                backgroundColor: '#006f64',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '800',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'Saving...' : 'Save Article →'}
            </button>
          </div>

          {msg && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 12px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: msg.startsWith('Success')
                  ? '#ecfdf5'
                  : '#fef2f2',
                color: msg.startsWith('Success')
                  ? '#047857'
                  : '#b91c1c',
              }}
            >
              {msg}
            </div>
          )}
        </form>

        {/* RIGHT: LIVE PREVIEW */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dbe5ed',
            borderRadius: '12px',
            padding: '24px',
            position: 'sticky',
            top: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '13px',
              borderBottom: '1px solid #eef2f7',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              Live Preview
            </span>

            <span
              style={{
                fontSize: '10px',
                padding: '5px 8px',
                borderRadius: '5px',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                fontWeight: '700',
              }}
            >
              {form.status}
            </span>
          </div>

          {/* Article preview */}
          <article>
            <div
              style={{
                display: 'inline-block',
                padding: '5px 9px',
                borderRadius: '5px',
                backgroundColor: `${selectedTemplate.color}12`,
                color: selectedTemplate.color,
                fontSize: '10px',
                fontWeight: '800',
                marginBottom: '13px',
              }}
            >
              {selectedTemplate.title}
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: '25px',
                lineHeight: '1.25',
                fontWeight: '800',
                color: form.title ? '#0f172a' : '#cbd5e1',
              }}
            >
              {form.title || 'Your Article Headline'}
            </h2>

            <p
              style={{
                margin: '12px 0',
                fontSize: '14px',
                lineHeight: '1.55',
                color: form.subtitle ? '#64748b' : '#cbd5e1',
              }}
            >
              {form.subtitle ||
                'Your article summary will appear here.'}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '10px 0',
                marginBottom: '17px',
                borderTop: '1px solid #eef2f7',
                borderBottom: '1px solid #eef2f7',
                fontSize: '11px',
                color: '#64748b',
              }}
            >
              <strong style={{ color: '#334155' }}>
                {form.author || 'Author Name'}
              </strong>
              <span>·</span>
              <span>{form.readingTime}</span>
            </div>

            <p
              style={{
                fontSize: '14px',
                lineHeight: '1.75',
                color: form.opening ? '#334155' : '#cbd5e1',
                marginBottom: '17px',
              }}
            >
              {form.opening ||
                'The opening paragraph of your article will appear here.'}
            </p>

            <p
              style={{
                fontSize: '14px',
                lineHeight: '1.75',
                color: form.body ? '#334155' : '#cbd5e1',
                marginBottom: '20px',
              }}
            >
              {form.body ||
                'The main body of your article will appear here as you write.'}
            </p>

            {form.heading && (
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: '800',
                  margin: '20px 0 9px',
                  color: '#0f172a',
                }}
              >
                {form.heading}
              </h3>
            )}

            {form.section && (
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#334155',
                }}
              >
                {form.section}
              </p>
            )}

            {form.quote && (
              <div
                style={{
                  margin: '20px 0',
                  padding: '15px 17px',
                  borderLeft: `4px solid ${selectedTemplate.color}`,
                  backgroundColor: '#f8fafc',
                  borderRadius: '0 7px 7px 0',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: '1.6',
                    fontStyle: 'italic',
                    color: '#334155',
                  }}
                >
                  "{form.quote}"
                </p>

                {form.source && (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: '#64748b',
                      fontWeight: '700',
                    }}
                  >
                    — {form.source}
                  </div>
                )}
              </div>
            )}

            {form.takeaway && (
              <div
                style={{
                  backgroundColor: '#f0fdf9',
                  border: '1px solid #d7f3eb',
                  borderRadius: '8px',
                  padding: '14px',
                  marginTop: '20px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: '#047857',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  Key Takeaway
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#334155',
                  }}
                >
                  {form.takeaway}
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| SHARED STYLES
|--------------------------------------------------------------------------
*/

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '7px',
  fontSize: '12px',
  fontWeight: '800',
  color: '#334155',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  boxSizing: 'border-box',
  padding: '0 11px',
  border: '1px solid #d5dee8',
  borderRadius: '7px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: '13px',
  outline: 'none',
};

const largeInputStyle: React.CSSProperties = {
  ...inputStyle,
  height: '48px',
  fontSize: '16px',
  fontWeight: '600',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 11px',
  border: '1px solid #d5dee8',
  borderRadius: '7px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: '13px',
  lineHeight: '1.55',
  resize: 'vertical',
  outline: 'none',
};

const bigTextareaStyle: React.CSSProperties = {
  ...textareaStyle,
  minHeight: '120px',
};