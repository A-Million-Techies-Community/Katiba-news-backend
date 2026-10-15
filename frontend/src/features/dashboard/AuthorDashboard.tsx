import React, { useState, useEffect } from 'react';
import { ArticleEditor } from '../articles/components/ArticleEditor';
import { BlogView } from '../blogs/components/BlogView';

type Tab =
  | 'dashboard'
  | 'articles'
  | 'blogs'
  | 'news'
  | 'analytics'
  | 'media'
  | 'comments'
  | 'settings'
  | 'profile';

interface ArticleItem {
  id: number;
  title: string;
  slug?: string;
  content?: string;
  status?: string;
  created_at?: string;
  template_name?: string;
}

interface BlogItem {
  id: number;
  title: string;
  slug: string;
  content: string;
  author_username?: string;
  likes_count?: number;
  created_at?: string;
}

interface SelectedItem {
  type: 'article' | 'blog' | 'news';
  title: string;
  content: string;
  meta: string;
  status?: string;
}

/* =========================================================
   ICONS
   ========================================================= */

const Icon = ({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );

    case 'news':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );

    case 'edit':
      return (
        <svg {...common}>
          <path d="m4 20 4.2-1 10-10a2 2 0 0 0-2.8-2.8l-10 10L4 20Z" />
          <path d="m13.8 7.2 3 3" />
        </svg>
      );

    case 'article':
      return (
        <svg {...common}>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M15 3v4h4M9 11h6M9 15h6M9 18h4" />
        </svg>
      );

    case 'analytics':
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );

    case 'image':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="m21 15-5-5L5 20" />
        </svg>
      );

    case 'comment':
      return (
        <svg {...common}>
          <path d="M20 11.5a7 7 0 0 1-7 7H8l-4 3v-5.2a7 7 0 1 1 16-4.8Z" />
        </svg>
      );

    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.5-1H6v-2.4h.9a1.7 1.7 0 0 0 1.5-1A1.7 1.7 0 0 0 8.1 8.7L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );

    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );

    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );

    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );

    case 'eye':
      return (
        <svg {...common}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );

    case 'people':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4" />
        </svg>
      );

    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5a3 3 0 0 1 3-3h4v19H7a3 3 0 0 0-3 3V5Z" />
          <path d="M20 5a3 3 0 0 0-3-3h-4v19h4a3 3 0 0 1 3 3V5Z" />
        </svg>
      );

    default:
      return null;
  }
};

// Unpacks standard array OR DRF paginated responses ({ count, results })
const extractList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

/* =========================================================
   NEWS BLUEPRINT VIEW
   EMPTY MODULE - SAME STYLE AS OTHER EMPTY MODULES
   ========================================================= */

const NewsBlueprintView: React.FC<{
  onBackToDashboard: () => void;
}> = ({ onBackToDashboard }) => {
  return (
    <div style={{ padding: '27px' }}>
      <div className="katiba-placeholder">
        <Icon name="news" size={40} />

        <h2 style={{ marginTop: '16px', color: '#0f172a' }}>
          News Blueprint Module
        </h2>

        <p style={{ margin: '8px 0 20px', fontSize: '14px' }}>
          This section is ready for expansion.
        </p>

        <button
          type="button"
          onClick={onBackToDashboard}
          style={{
            backgroundColor: '#006f64',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '7px',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN DASHBOARD
   ========================================================= */

export const AuthorDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [load, setLoad] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Articles & Blogs from backend API
  useEffect(() => {
    async function fetchDashboardData() {
      setLoad(true);

      try {
        const sessionData = sessionStorage.getItem('katibaUserSession');
        const token = sessionData ? JSON.parse(sessionData).access : '';

        const headers: Record<string, string> = {};

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Fetch using ?all=true&page_size=100 to get all articles regardless of status/pagination
        const [articlesRes, blogsRes] = await Promise.all([
          fetch('/api/articles/?all=true&page_size=100', { headers }),
          fetch('/api/blogs/?page_size=100', { headers }),
        ]);

        const articlesData = articlesRes.ok
          ? await articlesRes.json()
          : [];

        const blogsData = blogsRes.ok
          ? await blogsRes.json()
          : [];

        setArticles(extractList(articlesData));
        setBlogs(extractList(blogsData));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoad(false);
      }
    }

    fetchDashboardData();
  }, [tab]);

  // Derived metrics for all database statuses
  const publishedArticles = articles.filter(
    a => a.status?.toLowerCase() === 'published'
  );

  const draftArticles = articles.filter(
    a => a.status?.toLowerCase() === 'draft'
  );

  const reviewArticles = articles.filter(
    a =>
      a.status?.toLowerCase() === 'under review' ||
      a.status?.toLowerCase() === 'under_review'
  );

  const totalLikes = blogs.reduce(
    (acc, b) => acc + (b.likes_count || 0),
    0
  );

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems: {
    id: Tab;
    label: string;
    icon: string;
    badge?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    {
      id: 'articles',
      label: 'Articles',
      icon: 'article',
      badge: articles.length > 0 ? String(articles.length) : undefined,
    },
    {
      id: 'blogs',
      label: 'Blogs Feed',
      icon: 'edit',
      badge: blogs.length > 0 ? String(blogs.length) : undefined,
    },
    {
      id: 'news',
      label: 'News Blueprint',
      icon: 'news',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'analytics',
    },
    {
      id: 'media',
      label: 'Media Library',
      icon: 'image',
    },
    {
      id: 'comments',
      label: 'Comments',
      icon: 'comment',
      badge: '3',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'user',
    },
  ];

  const formatDate = (date?: string) => {
    if (!date) return 'Recently';

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return 'Recently';
    }

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const parseArticleContent = (rawContent?: string) => {
    if (!rawContent) {
      return 'No content preview available.';
    }

    try {
      const parsed = JSON.parse(rawContent);
      return parsed.opening || parsed.body || rawContent;
    } catch {
      return rawContent;
    }
  };

  const getStatusBadgeStyle = (status?: string) => {
    const s = status?.toLowerCase();

    if (s === 'published') {
      return {
        background: '#eaf6f2',
        color: '#006f64',
      };
    }

    if (s === 'under review' || s === 'under_review') {
      return {
        background: '#fef3c7',
        color: '#b45309',
      };
    }

    return {
      background: '#eeeafa',
      color: '#6952b4',
    };
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .katiba-dashboard {
          min-height: 100vh;
          background: #f6f8fa;
          color: #101820;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
        }

        .katiba-sidebar {
          width: 248px;
          min-width: 248px;
          background: #0b1a1f;
          color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        .katiba-logo {
          padding: 25px 24px 21px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .katiba-logo-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #35d49f;
          color: #0b1a1f;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .katiba-logo-title {
          font-size: 19px;
          font-weight: 800;
          line-height: 1.05;
        }

        .katiba-logo-subtitle {
          font-size: 10px;
          color: #b8c4c7;
          margin-top: 4px;
        }

        .katiba-nav {
          padding: 10px;
        }

        .katiba-nav-button {
          width: 100%;
          border: 0;
          background: transparent;
          color: #d7e0e2;
          height: 46px;
          border-radius: 9px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          margin-bottom: 3px;
        }

        .katiba-nav-button:hover {
          background: rgba(255,255,255,.06);
        }

        .katiba-nav-button.active {
          background: #0d6953;
          color: white;
        }

        .katiba-nav-badge {
          margin-left: auto;
          padding: 2px 7px;
          border-radius: 10px;
          background: #35d49f;
          color: #08231c;
          font-size: 10px;
          font-weight: 800;
        }

        .katiba-sidebar-bottom {
          margin-top: auto;
          padding: 20px;
        }

        .katiba-story-card {
          min-height: 180px;
          border: 1px solid rgba(95, 207, 170, .25);
          border-radius: 10px;
          padding: 18px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(to bottom, rgba(9, 29, 35, .72), rgba(9, 29, 35, .98));
        }

        .katiba-story-card:before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: .18;
          background: radial-gradient(circle at 50% 100%, #35d49f 0, transparent 40%);
          pointer-events: none;
        }

        .katiba-story-title {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #ffffff;
        }

        .katiba-story-text {
          font-size: 11px;
          line-height: 1.6;
          color: #c7d0d2;
        }

        .katiba-story-line {
          width: 35px;
          height: 2px;
          background: #35d49f;
          margin-top: 14px;
        }

        .katiba-main {
          min-width: 0;
          flex: 1;
        }

        .katiba-topbar {
          height: 68px;
          background: #fff;
          border-bottom: 1px solid #e6eaed;
          display: flex;
          align-items: center;
          padding: 0 27px;
          gap: 20px;
        }

        .katiba-search {
          height: 38px;
          background: #f3f5f7;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          flex: 1;
          max-width: 515px;
          color: #829096;
        }

        .katiba-search input {
          border: 0;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 12px;
          color: #334155;
        }

        .katiba-create {
          margin-left: auto;
          height: 36px;
          border: 0;
          background: #006f64;
          color: white;
          border-radius: 8px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 7px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }

        .katiba-notification {
          position: relative;
          color: #16242a;
          cursor: pointer;
        }

        .katiba-notification-dot {
          position: absolute;
          top: 0;
          right: 0;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e11d48;
        }

        .katiba-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 4px;
        }

        .katiba-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #006f64;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 800;
        }

        .katiba-user-name {
          font-size: 12px;
          font-weight: 700;
        }

        .katiba-user-role {
          color: #859196;
          font-size: 10px;
          margin-top: 2px;
        }

        .katiba-content {
          padding: 24px 27px 36px;
        }

        .katiba-welcome {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .katiba-welcome h1 {
          margin: 0;
          font-size: 26px;
          letter-spacing: -.5px;
          font-weight: 800;
        }

        .katiba-welcome p {
          margin: 7px 0 0;
          color: #66757b;
          font-size: 13px;
        }

        .katiba-welcome-right {
          text-align: right;
        }

        .katiba-date {
          color: #58676d;
          font-size: 12px;
          font-weight: 600;
        }

        .katiba-quote {
          margin-top: 6px;
          color: #5d696e;
          font-size: 11px;
          font-style: italic;
        }

        .katiba-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .katiba-stat-card {
          background: white;
          border: 1px solid #e5eaed;
          border-radius: 10px;
          padding: 18px;
          position: relative;
        }

        .katiba-stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #e5f8f1;
          color: #078362;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .katiba-stat-icon.blue {
          background: #e8eefb;
          color: #2765c4;
        }

        .katiba-stat-icon.amber {
          background: #fef3c7;
          color: #b45309;
        }

        .katiba-stat-title {
          position: absolute;
          top: 19px;
          left: 68px;
          color: #66747a;
          font-size: 11px;
          font-weight: 600;
        }

        .katiba-stat-value {
          font-size: 26px;
          font-weight: 800;
          line-height: 1;
        }

        .katiba-stat-change {
          color: #07916c;
          font-size: 11px;
          font-weight: 700;
          margin-top: 10px;
        }

        .katiba-stat-note {
          color: #9aa5a9;
          font-size: 10px;
          margin-top: 3px;
        }

        .katiba-middle {
          display: grid;
          grid-template-columns: minmax(0, 1.85fr) minmax(285px, .85fr);
          gap: 16px;
          margin-top: 18px;
        }

        .katiba-card {
          background: white;
          border: 1px solid #e5eaed;
          border-radius: 10px;
          overflow: hidden;
        }

        .katiba-card-header {
          padding: 18px 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .katiba-card-title {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }

        .katiba-card-subtitle {
          color: #7e8b90;
          font-size: 11px;
          margin-top: 4px;
        }

        .katiba-period {
          display: flex;
          border: 1px solid #edf0f1;
          border-radius: 6px;
          overflow: hidden;
        }

        .katiba-period button {
          border: 0;
          background: white;
          color: #79868b;
          padding: 6px 10px;
          font-size: 10px;
          cursor: pointer;
        }

        .katiba-period button.active {
          background: #006f64;
          color: white;
        }

        .katiba-chart {
          padding: 16px 20px;
          height: 220px;
        }

        .katiba-chart svg {
          width: 100%;
          height: 100%;
        }

        .katiba-activity-list {
          padding: 10px 20px 18px;
        }

        .katiba-activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f0f2f3;
        }

        .katiba-activity-item:last-child {
          border-bottom: 0;
        }

        .katiba-activity-icon {
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e5f8f1;
          color: #006f64;
        }

        .katiba-activity-text {
          min-width: 0;
          flex: 1;
        }

        .katiba-activity-title {
          font-size: 12px;
          font-weight: 700;
          color: #26363c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .katiba-activity-sub {
          color: #879398;
          font-size: 11px;
          margin-top: 2px;
        }

        .katiba-activity-time {
          color: #859196;
          font-size: 10px;
          white-space: nowrap;
        }

        .katiba-lower {
          display: grid;
          grid-template-columns: 1fr 1fr .85fr;
          gap: 16px;
          margin-top: 18px;
        }

        .katiba-list {
          padding: 10px 20px 16px;
        }

        .katiba-list-row {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 52px;
          border-bottom: 1px solid #f0f2f3;
          cursor: pointer;
        }

        .katiba-list-row:last-child {
          border-bottom: 0;
        }

        .katiba-thumb {
          width: 42px;
          height: 34px;
          flex: 0 0 42px;
          border-radius: 6px;
          background: linear-gradient(135deg, #006f64, #35d49f);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .katiba-list-info {
          min-width: 0;
          flex: 1;
        }

        .katiba-list-title {
          font-size: 12px;
          font-weight: 700;
          color: #26363c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .katiba-list-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 4px;
          font-size: 10px;
          color: #8b979b;
        }

        .katiba-tag {
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
        }

        .katiba-quick-list {
          padding: 10px 20px 16px;
        }

        .katiba-quick-row {
          height: 44px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #f0f2f3;
          font-size: 12px;
          font-weight: 600;
          color: #304047;
          cursor: pointer;
        }

        .katiba-quick-row:last-child {
          border-bottom: 0;
        }

        .katiba-quick-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #e6f7f1;
          color: #006f64;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .katiba-quick-arrow {
          margin-left: auto;
          color: #78868a;
        }

        .katiba-viewer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 20, 24, .45);
          z-index: 100;
          display: flex;
          justify-content: flex-end;
        }

        .katiba-viewer {
          width: min(650px, 92vw);
          height: 100vh;
          background: white;
          padding: 32px;
          overflow-y: auto;
          box-shadow: -8px 0 30px rgba(0,0,0,.12);
        }

        .katiba-viewer-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #edf0f1;
          padding-bottom: 14px;
          margin-bottom: 22px;
        }

        .katiba-close {
          border: 0;
          background: #f1f4f5;
          border-radius: 7px;
          padding: 8px 14px;
          cursor: pointer;
          color: #435157;
          font-size: 12px;
          font-weight: 700;
        }

        .katiba-viewer h1 {
          font-size: 24px;
          margin: 0 0 12px;
          color: #0f172a;
        }

        .katiba-viewer-content {
          white-space: pre-wrap;
          color: #334155;
          font-size: 14px;
          line-height: 1.7;
        }

        .katiba-placeholder {
          background: white;
          border: 1px solid #e5eaed;
          border-radius: 12px;
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        @media (max-width: 1200px) {
          .katiba-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .katiba-lower {
            grid-template-columns: 1fr 1fr;
          }

          .katiba-lower > :last-child {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 900px) {
          .katiba-sidebar {
            width: 75px;
            min-width: 75px;
          }

          .katiba-logo {
            justify-content: center;
            padding: 20px 10px;
          }

          .katiba-logo-text,
          .katiba-nav-button span,
          .katiba-story-card,
          .katiba-nav-badge {
            display: none;
          }

          .katiba-nav-button {
            justify-content: center;
            padding: 0;
          }

          .katiba-middle,
          .katiba-lower {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="katiba-dashboard">
        {/* SIDEBAR */}
        <aside className="katiba-sidebar">
          <div className="katiba-logo">
            <div className="katiba-logo-icon">
              <Icon name="book" size={23} />
            </div>

            <div className="katiba-logo-text">
              <div className="katiba-logo-title">Katiba News</div>
              <div className="katiba-logo-subtitle">
                Know. Understand. Engage.
              </div>
            </div>
          </div>

          <nav className="katiba-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`katiba-nav-button ${
                  tab === item.id ? 'active' : ''
                }`}
                onClick={() => {
                  setTab(item.id);
                  setSelectedItem(null);
                }}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="katiba-nav-badge">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="katiba-sidebar-bottom">
            <div className="katiba-story-card">
              <div className="katiba-story-title">
                Good stories
                <br />
                build a better Kenya.
              </div>

              <div className="katiba-story-text">
                Keep informing,
                <br />
                keep inspiring.
              </div>

              <div className="katiba-story-line" />
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="katiba-main">
          {/* TOP BAR */}
          <header className="katiba-topbar">
            <div className="katiba-search">
              <Icon name="search" size={17} />

              <input
                type="text"
                placeholder="Search your articles, blogs, or topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              className="katiba-create"
              onClick={() => setTab('articles')}
            >
              <Icon name="plus" size={16} />
              Create Article
            </button>

            <div className="katiba-notification">
              <Icon name="bell" size={21} />
              <span className="katiba-notification-dot" />
            </div>

            <div className="katiba-user">
              <div className="katiba-avatar">AD</div>

              <div>
                <div className="katiba-user-name">
                  Abdube Dida
                </div>

                <div className="katiba-user-role">
                  Author
                </div>
              </div>
            </div>
          </header>

          {/* TAB CONTENT SWITCHING */}

          {tab === 'articles' ? (
            <div style={{ padding: '24px' }}>
              <ArticleEditor
                onBackToDashboard={() => setTab('dashboard')}
              />
            </div>
          ) : tab === 'blogs' ? (
            <div style={{ padding: '24px' }}>
              <BlogView
                onBackToDashboard={() => setTab('dashboard')}
                onNavigateToArticles={() => setTab('articles')}
              />
            </div>
          ) : tab === 'news' ? (
            <NewsBlueprintView
              onBackToDashboard={() => setTab('dashboard')}
            />
          ) : tab !== 'dashboard' ? (
            <div style={{ padding: '27px' }}>
              <div className="katiba-placeholder">
                <Icon
                  name={navItems.find(i => i.id === tab)?.icon || 'home'}
                  size={40}
                />

                <h2
                  style={{
                    marginTop: '16px',
                    color: '#0f172a',
                  }}
                >
                  {navItems.find(i => i.id === tab)?.label} Module
                </h2>

                <p
                  style={{
                    margin: '8px 0 20px',
                    fontSize: '14px',
                  }}
                >
                  This section is connected to the backend database and ready
                  for expansion.
                </p>

                <button
                  type="button"
                  onClick={() => setTab('dashboard')}
                  style={{
                    backgroundColor: '#006f64',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '7px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  ← Return to Main Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* DASHBOARD VIEW */
            <div className="katiba-content">
              {/* WELCOME */}
              <section className="katiba-welcome">
                <div>
                  <h1>Welcome back, Abdube! 👋</h1>

                  <p>
                    Here is what is happening with your content live from the
                    database.
                  </p>
                </div>

                <div className="katiba-welcome-right">
                  <div className="katiba-date">
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>

                  <div className="katiba-quote">
                    “A well-informed citizen is a powerful citizen.”
                  </div>
                </div>
              </section>

              {/* STATISTICS */}
              <section className="katiba-stat-grid">
                <div className="katiba-stat-card">
                  <div className="katiba-stat-icon">
                    <Icon name="article" size={20} />
                  </div>

                  <div className="katiba-stat-title">
                    Published Articles
                  </div>

                  <div className="katiba-stat-value">
                    {load ? '...' : publishedArticles.length}
                  </div>

                  <div className="katiba-stat-change">
                    Live in database
                  </div>

                  <div className="katiba-stat-note">
                    Updated real-time
                  </div>
                </div>

                <div className="katiba-stat-card">
                  <div className="katiba-stat-icon amber">
                    <Icon name="edit" size={20} />
                  </div>

                  <div className="katiba-stat-title">
                    Under Review
                  </div>

                  <div className="katiba-stat-value">
                    {load ? '...' : reviewArticles.length}
                  </div>

                  <div
                    className="katiba-stat-change"
                    style={{ color: '#b45309' }}
                  >
                    Awaiting moderation
                  </div>

                  <div className="katiba-stat-note">
                    In editorial queue
                  </div>
                </div>

                <div className="katiba-stat-card">
                  <div className="katiba-stat-icon">
                    <Icon name="edit" size={20} />
                  </div>

                  <div className="katiba-stat-title">
                    Article Drafts
                  </div>

                  <div className="katiba-stat-value">
                    {load ? '...' : draftArticles.length}
                  </div>

                  <div
                    className="katiba-stat-change"
                    style={{ color: '#8a969a' }}
                  >
                    Saved locally/cloud
                  </div>

                  <div className="katiba-stat-note">
                    Work in progress
                  </div>
                </div>

                <div className="katiba-stat-card">
                  <div className="katiba-stat-icon blue">
                    <Icon name="people" size={20} />
                  </div>

                  <div className="katiba-stat-title">
                    Blog Posts / Likes
                  </div>

                  <div className="katiba-stat-value">
                    {load
                      ? '...'
                      : `${blogs.length} / ${totalLikes}`}
                  </div>

                  <div className="katiba-stat-change">
                    Civic engagement
                  </div>

                  <div className="katiba-stat-note">
                    Community support
                  </div>
                </div>
              </section>

              {/* MIDDLE SECTION */}
              <section className="katiba-middle">
                <div className="katiba-card">
                  <div className="katiba-card-header">
                    <div>
                      <h3 className="katiba-card-title">
                        Content Reach Overview
                      </h3>

                      <div className="katiba-card-subtitle">
                        Engagement across articles and community posts
                      </div>
                    </div>

                    <div className="katiba-period">
                      <button className="active">
                        7 Days
                      </button>

                      <button>
                        30 Days
                      </button>
                    </div>
                  </div>

                  <div className="katiba-chart">
                    <svg
                      viewBox="0 0 500 150"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 120 Q 75 40, 150 90 T 300 50 T 450 80 L 500 30 L 500 150 L 0 150 Z"
                        fill="rgba(53, 212, 159, 0.15)"
                      />

                      <path
                        d="M0 120 Q 75 40, 150 90 T 300 50 T 450 80 L 500 30"
                        fill="none"
                        stroke="#006f64"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                </div>

                <div className="katiba-card">
                  <div className="katiba-card-header">
                    <div>
                      <h3 className="katiba-card-title">
                        Recent Activity
                      </h3>

                      <div className="katiba-card-subtitle">
                        Latest platform updates
                      </div>
                    </div>
                  </div>

                  <div className="katiba-activity-list">
                    {articles.slice(0, 3).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="katiba-activity-item"
                      >
                        <div className="katiba-activity-icon">
                          <Icon
                            name="article"
                            size={16}
                          />
                        </div>

                        <div className="katiba-activity-text">
                          <div className="katiba-activity-title">
                            {item.title}
                          </div>

                          <div className="katiba-activity-sub">
                            Status: {item.status || 'Draft'}
                          </div>
                        </div>

                        <div className="katiba-activity-time">
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* LOWER SECTION */}
              <section className="katiba-lower">
                <div className="katiba-card">
                  <div className="katiba-card-header">
                    <div>
                      <h3 className="katiba-card-title">
                        Articles Database
                      </h3>

                      <div className="katiba-card-subtitle">
                        Recent stories & legal pieces
                      </div>
                    </div>
                  </div>

                  <div className="katiba-list">
                    {filteredArticles.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        className="katiba-list-row"
                        onClick={() =>
                          setSelectedItem({
                            type: 'article',
                            title: item.title,
                            content: parseArticleContent(
                              item.content
                            ),
                            meta: formatDate(
                              item.created_at
                            ),
                            status: item.status,
                          })
                        }
                      >
                        <div className="katiba-thumb">
                          <Icon
                            name="article"
                            size={16}
                          />
                        </div>

                        <div className="katiba-list-info">
                          <div className="katiba-list-title">
                            {item.title}
                          </div>

                          <div className="katiba-list-meta">
                            <span>
                              {formatDate(item.created_at)}
                            </span>

                            <span
                              className="katiba-tag"
                              style={getStatusBadgeStyle(
                                item.status
                              )}
                            >
                              {item.status || 'Draft'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="katiba-card">
                  <div className="katiba-card-header">
                    <div>
                      <h3 className="katiba-card-title">
                        Blogs & Engagement
                      </h3>

                      <div className="katiba-card-subtitle">
                        Community posts
                      </div>
                    </div>
                  </div>

                  <div className="katiba-list">
                    {blogs.slice(0, 4).map(blog => (
                      <div
                        key={blog.id}
                        className="katiba-list-row"
                        onClick={() =>
                          setSelectedItem({
                            type: 'blog',
                            title: blog.title,
                            content: blog.content,
                            meta: `@${
                              blog.author_username ||
                              'anonymous'
                            } • ${formatDate(
                              blog.created_at
                            )}`,
                          })
                        }
                      >
                        <div
                          className="katiba-thumb"
                          style={{
                            background:
                              'linear-gradient(135deg, #2765c4, #35d49f)',
                          }}
                        >
                          <Icon
                            name="edit"
                            size={16}
                          />
                        </div>

                        <div className="katiba-list-info">
                          <div className="katiba-list-title">
                            {blog.title}
                          </div>

                          <div className="katiba-list-meta">
                            <span>
                              @
                              {blog.author_username ||
                                'anonymous'}
                            </span>

                            <span>
                              ❤️ {blog.likes_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="katiba-card">
                  <div className="katiba-card-header">
                    <div>
                      <h3 className="katiba-card-title">
                        Quick Actions
                      </h3>

                      <div className="katiba-card-subtitle">
                        Shortcuts for management
                      </div>
                    </div>
                  </div>

                  <div className="katiba-quick-list">
                    <div
                      className="katiba-quick-row"
                      onClick={() =>
                        setTab('articles')
                      }
                    >
                      <div className="katiba-quick-icon">
                        <Icon
                          name="plus"
                          size={16}
                        />
                      </div>

                      <span>
                        New Article
                      </span>

                      <div className="katiba-quick-arrow">
                        <Icon
                          name="arrow"
                          size={14}
                        />
                      </div>
                    </div>

                    <div
                      className="katiba-quick-row"
                      onClick={() =>
                        setTab('news')
                      }
                    >
                      <div className="katiba-quick-icon">
                        <Icon
                          name="news"
                          size={16}
                        />
                      </div>

                      <span>
                        News Blueprint
                      </span>

                      <div className="katiba-quick-arrow">
                        <Icon
                          name="arrow"
                          size={14}
                        />
                      </div>
                    </div>

                    <div
                      className="katiba-quick-row"
                      onClick={() =>
                        setTab('blogs')
                      }
                    >
                      <div className="katiba-quick-icon">
                        <Icon
                          name="edit"
                          size={16}
                        />
                      </div>

                      <span>
                        Browse Blogs Feed
                      </span>

                      <div className="katiba-quick-arrow">
                        <Icon
                          name="arrow"
                          size={14}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SELECTED ITEM VIEWER OVERLAY */}
              {selectedItem && (
                <div
                  className="katiba-viewer-overlay"
                  onClick={() =>
                    setSelectedItem(null)
                  }
                >
                  <div
                    className="katiba-viewer"
                    onClick={e =>
                      e.stopPropagation()
                    }
                  >
                    <div className="katiba-viewer-top">
                      <span
                        className="katiba-tag"
                        style={getStatusBadgeStyle(
                          selectedItem.status
                        )}
                      >
                        {selectedItem.type.toUpperCase()}
                      </span>

                      <button
                        className="katiba-close"
                        onClick={() =>
                          setSelectedItem(null)
                        }
                      >
                        Close
                      </button>
                    </div>

                    <h1>
                      {selectedItem.title}
                    </h1>

                    <div className="katiba-viewer-content">
                      {selectedItem.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};