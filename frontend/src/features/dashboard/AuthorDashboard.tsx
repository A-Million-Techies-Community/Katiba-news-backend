import { ProfilePhoto } from '../../dashboard/components/ProfilePhoto'
import './profile-design.css'
import { signOut } from '../../auth/session'
import { NavigationIcon } from '../../dashboard/components/NavigationIcon'
import { ThemeToggle } from '../../dashboard/components/ThemeToggle'
import AuthorSettings from './AuthorSettings'
import { useDashboardTheme } from '../../dashboard/hooks/useDashboardTheme'
import './writer-theme.css'

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
const ArticleEditor = lazy(() => import('../articles/components/ArticleEditor').then(module => ({ default: module.ArticleEditor })))
const BlogView = lazy(() => import('../blogs/components/BlogView').then(module => ({ default: module.BlogView })))

type Tab =
  | 'dashboard'
  | 'articles'
  | 'blogs'
  | 'analytics'
  | 'media'
  | 'comments'
  | 'settings'
  | 'profile'

type Session = {
  username: string
  role: string
  access: string
}

type Article = {
  id: number | string
  title: string
  slug?: string
  content?: string
  status?: string
  category?: string
  category_name?: string
  created_at?: string
  updated_at?: string
  published_at?: string
  views_count?: number
  author_username?: string
  word_count?: number
  seo_score?: number
  comments_count?: number
}

type Blog = {
  id: number | string
  title: string
  slug?: string
  content?: string
  status?: string
  category?: string
  category_name?: string
  created_at?: string
  updated_at?: string
  published_at?: string
  author_username?: string
  likes_count?: number
  views_count?: number
  comments_count?: number
}

type AuthorProfile = {
  username?: string
  first_name?: string
  last_name?: string
  email?: string
  professional_title?: string
  preferred_byline?: string
  organisation?: string
  location?: string
  phone_number?: string
  years_of_experience?: string | number
  highest_education?: string
  journalism_training?: string
  previous_media_experience?: string
  portfolio_url?: string
  linkedin_url?: string
  published_work?: string
  primary_expertise?: string
  secondary_expertise?: string
  reporting_beats?: string
  content_types?: string
  languages?: string
  geographic_coverage?: string
  writing_experience?: string
  investigative_experience?: string
  fact_checking_experience?: string
  source_verification_experience?: string
  topics_of_interest?: string
  motivation_to_join?: string
  conflicts_of_interest?: string
  additional_information?: string
  areas_of_expertise?: string
  biography?: string
  [key: string]: unknown
}

type ContentRecord = Article | Blog
type ChartPoint = { label: string; value: number; secondary?: number }

const PROFILE_ENDPOINT = '/api/users/author/profile/'
const ACCOUNT_ENDPOINT = '/api/users/me/'
const ARTICLES_ENDPOINT = '/api/articles/?mine=true&page_size=100'
const BLOGS_ENDPOINT = '/api/blogs/?mine=true&page_size=100'
const MEDIA_ENDPOINT = '/api/media/?mine=true&page_size=50'
const COMMENTS_ENDPOINT = '/api/blogs/moderation/comments/'
const DASHBOARD_PATH = '/author/dashboard'

const navItems: {
  id: Tab
  label: string
  icon: string
  description: string
}[] = [
  { id: 'dashboard', label: 'Overview', icon: '⌂', description: 'Publishing overview' },
  { id: 'articles', label: 'Articles', icon: '▤', description: 'Create and manage articles' },
  { id: 'blogs', label: 'Blogs', icon: '✎', description: 'Explore blog content' },
  { id: 'analytics', label: 'Analytics', icon: '▥', description: 'Publishing performance' },
  { id: 'media', label: 'Media library', icon: '▣', description: 'Manage media resources' },
  { id: 'comments', label: 'Comments', icon: '☏', description: 'Reader conversations' },
  { id: 'settings', label: 'Settings', icon: '⚙', description: 'Workspace settings' },
  { id: 'profile', label: 'My profile', icon: '♙', description: 'Your saved author profile' },
]

const validTabs = new Set<Tab>(navItems.map((item) => item.id))

const STATUS_COLORS: Record<string, string> = {
  published: '#159b76',
  draft: '#7770d6',
  under_review: '#e6a23c',
  pending: '#e6a23c',
  scheduled: '#3984d6',
  archived: '#87958e',
  rejected: '#dc6464',
  other: '#a6b0ab',
}

const PROFILE_GROUPS: { title: string; fields: (keyof AuthorProfile)[] }[] = [
  {
    title: 'Author identity',
    fields: ['professional_title', 'preferred_byline', 'organisation', 'location', 'phone_number', 'email', 'biography'],
  },
  {
    title: 'Experience and education',
    fields: ['years_of_experience', 'highest_education', 'journalism_training', 'previous_media_experience', 'writing_experience'],
  },
  {
    title: 'Portfolio and professional links',
    fields: ['portfolio_url', 'linkedin_url', 'published_work'],
  },
  {
    title: 'Expertise and reporting',
    fields: ['areas_of_expertise', 'primary_expertise', 'secondary_expertise', 'reporting_beats', 'content_types', 'languages', 'geographic_coverage', 'topics_of_interest'],
  },
  {
    title: 'Journalism practice',
    fields: ['investigative_experience', 'fact_checking_experience', 'source_verification_experience', 'motivation_to_join', 'conflicts_of_interest', 'additional_information'],
  },
]

const PROFILE_LABELS: Partial<Record<keyof AuthorProfile, string>> = {
  professional_title: 'Professional title',
  preferred_byline: 'Preferred byline',
  organisation: 'Organisation',
  location: 'Location',
  phone_number: 'Phone number',
  email: 'Email',
  biography: 'Biography',
  years_of_experience: 'Years of experience',
  highest_education: 'Highest education',
  journalism_training: 'Journalism training',
  previous_media_experience: 'Previous media experience',
  writing_experience: 'Writing experience',
  portfolio_url: 'Portfolio / website',
  linkedin_url: 'LinkedIn profile',
  published_work: 'Published work',
  areas_of_expertise: 'Areas of expertise',
  primary_expertise: 'Primary expertise',
  secondary_expertise: 'Secondary expertise',
  reporting_beats: 'Reporting beats',
  content_types: 'Content types',
  languages: 'Languages',
  geographic_coverage: 'Geographic coverage',
  topics_of_interest: 'Topics of interest',
  investigative_experience: 'Investigative experience',
  fact_checking_experience: 'Fact-checking experience',
  source_verification_experience: 'Source verification',
  motivation_to_join: 'Motivation to join',
  conflicts_of_interest: 'Conflicts of interest',
  additional_information: 'Additional information',
}

const LONG_TEXT_FIELDS = new Set<keyof AuthorProfile>([
  'biography', 'published_work', 'journalism_training', 'previous_media_experience', 'writing_experience', 'areas_of_expertise', 'primary_expertise', 'secondary_expertise', 'reporting_beats', 'content_types', 'languages', 'geographic_coverage', 'topics_of_interest', 'investigative_experience', 'fact_checking_experience', 'source_verification_experience', 'motivation_to_join', 'conflicts_of_interest', 'additional_information',
])

function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem('katibaUserSession')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.access !== 'string' || !parsed.access || typeof parsed.username !== 'string') return null
    return { username: parsed.username, role: parsed.role || 'Author', access: parsed.access }
  } catch {
    return null
  }
}

function getTabFromUrl(): Tab {
  const path = window.location.pathname.replace(/\/+$/, '')
  const pathTab = path.startsWith(`${DASHBOARD_PATH}/`)
    ? path.slice(DASHBOARD_PATH.length + 1)
    : ''
  if (pathTab === 'article') return 'articles'
  if (validTabs.has(pathTab as Tab)) return pathTab as Tab

  const requested = new URLSearchParams(window.location.search).get('tab')
  return requested && validTabs.has(requested as Tab)
    ? (requested as Tab)
    : 'dashboard'
}

function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: T[] }).results
  }
  return []
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function getErrorMessage(data: unknown, fallback: string): string {
  const object = asObject(data)
  if (typeof object.detail === 'string') return object.detail
  if (typeof object.message === 'string') return object.message
  const firstError = Object.values(object).find((value) => Array.isArray(value) && typeof value[0] === 'string')
  if (Array.isArray(firstError)) return String(firstError[0])
  return fallback
}

function displayValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim() || 'Not provided'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return 'Not provided'
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-KE')
}

function formatDate(value?: string): string {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function normalizeStatus(status?: string): string {
  return (status || 'unknown').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function getStatusLabel(status?: string): string {
  const normalized = normalizeStatus(status)
  if (normalized === 'under_review' || normalized === 'in_review') return 'Under review'
  if (normalized === 'pending_review') return 'Pending review'
  if (normalized === 'unknown') return 'Not provided'
  return normalized.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function isPublished(record: ContentRecord): boolean {
  return normalizeStatus(record.status) === 'published'
}

function isDraft(record: ContentRecord): boolean {
  return normalizeStatus(record.status) === 'draft'
}

function isUnderReview(record: ContentRecord): boolean {
  return ['under_review', 'in_review', 'pending_review'].includes(normalizeStatus(record.status))
}

function isRejected(record: ContentRecord): boolean {
  return normalizeStatus(record.status) === 'rejected' || normalizeStatus(record.status) === 'needs_revision'
}

function getRecordDate(record: ContentRecord): string | undefined {
  return record.published_at || record.created_at || record.updated_at
}

function getCreatedDate(record: ContentRecord): string | undefined {
  return record.created_at || record.updated_at
}

function getDateKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function getLastSevenDays(): ChartPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return { label: date.toLocaleDateString('en-GB', { weekday: 'short' }), value: 0 }
  })
}

function getLastTwelveMonths(): ChartPoint[] {
  const today = new Date()
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 11 + index, 1)
    return { label: date.toLocaleDateString('en-GB', { month: 'short' }), value: 0, secondary: 0 }
  })
}

function getRecordCategory(record: ContentRecord): string {
  const category = record.category_name || record.category || (record as Record<string, unknown>).category_title
  return typeof category === 'string' && category.trim() ? category.trim() : 'Uncategorized'
}

function getCardImage(record: ContentRecord): string {
  if ((record as any).featured_image) return (record as any).featured_image;
  if ((record as any).image_url) return (record as any).image_url;
  try {
    if (typeof record.content === 'string') {
      const parsed = JSON.parse(record.content);
      if (parsed.featuredImage) return parsed.featuredImage;
    } else if (record.content && typeof record.content === 'object') {
      const c = record.content as any;
      if (c.featuredImage) return c.featuredImage;
    }
  } catch (e) {}
  return "";
}

function getCardExcerpt(record: ContentRecord): string {
  try {
    if (typeof record.content === 'string') {
      const parsed = JSON.parse(record.content);
      return parsed.subtitle || parsed.opening || (parsed.body ? parsed.body.substring(0, 100) + '...' : "");
    } else if (record.content && typeof record.content === 'object') {
      const c = record.content as any;
      return c.subtitle || c.opening || (c.body ? c.body.substring(0, 100) + '...' : "");
    }
  } catch (e) {}
  return typeof record.content === 'string' ? record.content.substring(0, 100).replace(/<[^>]*>?/gm, '') + '...' : "";
}

function countByStatus(records: ContentRecord[]) {
  const counts = new Map<string, number>()
  records.forEach((record) => {
    const key = normalizeStatus(record.status)
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return Array.from(counts.entries())
    .map(([key, value]) => ({ label: getStatusLabel(key), key, value, color: STATUS_COLORS[key] || STATUS_COLORS.other }))
    .sort((a, b) => b.value - a.value)
}

function getCategoryCounts(records: ContentRecord[]) {
  const counts = new Map<string, number>()
  records.forEach((record) => {
    const category = getRecordCategory(record)
    counts.set(category, (counts.get(category) || 0) + 1)
  })
  const colors = ['#159b76', '#7770d6', '#3984d6', '#e6a23c', '#dc6464', '#2097a6', '#8b6dc1', '#82958c']
  return Array.from(counts.entries())
    .map(([label, value], index) => ({ label, value, color: colors[index % colors.length] }))
    .sort((a, b) => b.value - a.value)
}

function StatCard({ label, value, icon, detail, accent = 'green', onClick }: { label: string; value: string | number; icon: string; detail: string; accent?: string; onClick?: () => void }) {
  return (
    <article className={`ad-stat ad-stat-${accent} ${onClick ? 'ad-stat-clickable' : ''}`} onClick={onClick}>
      <div className="ad-stat-inner">
        <div className="ad-stat-content">
          <span className="ad-stat-label">{label}</span>
          <strong className="ad-stat-value">{value}</strong>
        </div>
        <div className="ad-stat-icon-wrap" aria-hidden="true">{icon}</div>
      </div>
      <div className="ad-stat-link">{detail}</div>
    </article>
  )
}

function PanelHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="ad-panel-heading">
      <div>
        {eyebrow && <span className="ad-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {subtitle && <p className="ad-section-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function LineChart({ title, subtitle, labels, series, legend }: { title: string; subtitle: string; labels: string[]; series: { name: string; values: number[]; color: string }[]; legend?: boolean }) {
  const width = 650; const height = 255; const left = 38; const right = 20; const top = 24; const bottom = 36
  const plotWidth = width - left - right; const plotHeight = height - top - bottom
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values))
  const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4)
  const pointsFor = (values: number[]) => values.map((value, index) => ({ x: left + (index / Math.max(1, labels.length - 1)) * plotWidth, y: top + plotHeight - (value / yMax) * plotHeight, value }))

  return (
    <section className="ad-chart-card">
      <div className="ad-chart-heading"><div><h3>{title}</h3><p>{subtitle}</p></div></div>
      <div className="ad-chart-scroll">
        <svg className="ad-svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {[0, 1, 2, 3, 4].map((step) => {
            const value = (yMax / 4) * step; const y = top + plotHeight - (step / 4) * plotHeight
            return (
              <g key={step}>
                <line x1={left} y1={y} x2={width - right} y2={y} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                <text x={left - 9} y={y + 4} textAnchor="end" fill="var(--chart-text)" fontSize="10">{Math.round(value)}</text>
              </g>
            )
          })}
          {series.map((item) => {
            const points = pointsFor(item.values)
            const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')
            return (
              <g key={item.name}>
                <polyline points={polyline} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {points.map((point, index) => (
                  <g key={`${item.name}-${index}`}>
                    <circle cx={point.x} cy={point.y} r="4" fill="var(--surface)" stroke={item.color} strokeWidth="2.5" />
                    <title>{`${labels[index]}: ${point.value} ${item.name}`}</title>
                  </g>
                ))}
              </g>
            )
          })}
          {labels.map((label, index) => <text key={`${label}-${index}`} x={left + (index / Math.max(1, labels.length - 1)) * plotWidth} y={height - 12} textAnchor="middle" fill="var(--chart-text)" fontSize="10">{label}</text>)}
        </svg>
      </div>
      {legend !== false && <div className="ad-chart-legend">{series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div>}
    </section>
  )
}

function BarChart({ title, subtitle, labels, series }: { title: string; subtitle: string; labels: string[]; series: { name: string; values: number[]; color: string }[] }) {
  const width = 650; const height = 255; const left = 38; const right = 16; const top = 25; const bottom = 39
  const plotWidth = width - left - right; const plotHeight = height - top - bottom
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values))
  const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4)
  const groupWidth = plotWidth / Math.max(1, labels.length); const groupGap = groupWidth * 0.12; const barGap = 3
  const barWidth = Math.max(3, (groupWidth - groupGap - barGap * Math.max(0, series.length - 1)) / Math.max(1, series.length))

  return (
    <section className="ad-chart-card">
      <div className="ad-chart-heading"><div><h3>{title}</h3><p>{subtitle}</p></div></div>
      <div className="ad-chart-scroll">
        <svg className="ad-svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {[0, 1, 2, 3, 4].map((step) => {
            const value = (yMax / 4) * step; const y = top + plotHeight - (step / 4) * plotHeight
            return (
              <g key={step}>
                <line x1={left} y1={y} x2={width - right} y2={y} stroke="var(--chart-grid)" strokeDasharray="4 5" />
                <text x={left - 9} y={y + 4} textAnchor="end" fill="var(--chart-text)" fontSize="10">{Math.round(value)}</text>
              </g>
            )
          })}
          {labels.map((label, index) => {
            const groupStart = left + index * groupWidth + groupGap / 2
            return (
              <g key={`${label}-${index}`}>
                {series.map((item, seriesIndex) => {
                  const value = item.values[index] || 0; const barHeight = (value / yMax) * plotHeight
                  const x = groupStart + seriesIndex * (barWidth + barGap); const y = top + plotHeight - barHeight
                  return (
                    <g key={item.name}>
                      <rect x={x} y={y} width={barWidth} height={Math.max(0, barHeight)} rx="3" fill={item.color} />
                      <title>{`${label}: ${value} ${item.name}`}</title>
                    </g>
                  )
                })}
                <text x={left + index * groupWidth + groupWidth / 2} y={height - 12} textAnchor="middle" fill="var(--chart-text)" fontSize="10">{label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="ad-chart-legend">{series.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div>
    </section>
  )
}

function PieChart({
  title,
  subtitle,
  data,
}: {
  title: string
  subtitle: string
  data: { label: string; value: number; color: string }[]
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = 72
  const circumference = 2 * Math.PI * radius
  let runningOffset = 0

  return (
    <section className="ad-chart-card">
      <div className="ad-chart-heading"><div><h3>{title}</h3><p>{subtitle}</p></div></div>
      {total === 0 ? (
        <div className="ad-chart-empty"><div className="ad-pie-empty">0</div><p>No records available for this chart.</p></div>
      ) : (
        <div className="ad-pie-layout">
          <div className="ad-pie-graphic">
            <svg viewBox="0 0 190 190" role="img" aria-label={title}>
              <circle cx="95" cy="95" r={radius} fill="none" stroke="var(--chart-pie-bg)" strokeWidth="25" />
              <g transform="rotate(-90 95 95)">
                {data.filter((item) => item.value > 0).map((item) => {
                  const length = (item.value / total) * circumference
                  const offset = runningOffset
                  runningOffset += length

                  return (
                    <circle
                      key={item.label}
                      cx="95"
                      cy="95"
                      r={radius}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="25"
                      strokeDasharray={`${length} ${circumference - length}`}
                      strokeDashoffset={-offset}
                    >
                      <title>{`${item.label}: ${item.value}`}</title>
                    </circle>
                  )
                })}
              </g>
              <text x="95" y="90" textAnchor="middle" fill="var(--ink)" fontSize="27" fontWeight="800">{total}</text>
              <text x="95" y="109" textAnchor="middle" fill="var(--chart-text)" fontSize="10">TOTAL</text>
            </svg>
          </div>
          <div className="ad-pie-legend">
            {data.map((item) => (
              <div className="ad-pie-legend-row" key={item.label}>
                <span className="ad-pie-legend-name"><i style={{ background: item.color }} /><span>{item.label}</span></span>
                <strong style={{color: 'var(--ink)'}}>{item.value}</strong><span className="ad-pie-percent">{((item.value / total) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function CategoryChart({ title, subtitle, records }: { title: string; subtitle: string; records: ContentRecord[] }) {
  const categories = getCategoryCounts(records); const total = records.length
  return (
    <section className="ad-chart-card">
      <div className="ad-chart-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><div className="ad-chart-total"><strong>{total}</strong><span>Records</span></div></div>
      {categories.length === 0 ? (
        <div className="ad-chart-empty"><p>No content records available.</p></div>
      ) : (
        <div className="ad-category-list">
          {categories.slice(0, 8).map((category) => {
            const percentage = total ? (category.value / total) * 100 : 0
            return (
              <div className="ad-category-row" key={category.label}>
                <div className="ad-category-top"><span><i style={{ background: category.color }} />{category.label}</span><strong style={{color: 'var(--ink)'}}>{category.value}</strong></div>
                <div className="ad-progress-track"><div className="ad-progress-fill" style={{ width: `${percentage}%`, background: category.color }} /></div>
                <span className="ad-category-percent">{percentage.toFixed(0)}%</span>
              </div>
            )
          })}
          {categories.length > 8 && <p className="ad-muted">Showing the eight most common categories out of {categories.length}.</p>}
        </div>
      )}
    </section>
  )
}

// Media Module directly connected to the Database
function MediaLibrary({ authenticatedFetch }: { authenticatedFetch: any }) {
  const [media, setMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    authenticatedFetch(MEDIA_ENDPOINT)
      .then((res: Response) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then((data: any) => setMedia(extractList(data)))
      .catch(() => {
        setError('Unable to load media from the database at this time.')
        setMedia([])
      })
      .finally(() => setLoading(false))
  }, [authenticatedFetch])

  return (
    <section className="ad-panel">
      <PanelHeading eyebrow="ASSET MANAGEMENT" title="Media Library" subtitle="Manage your uploaded images, audio, and document resources directly from the database." action={<button className="ad-button">＋ Upload Media</button>} />
      
      {error && <div className="ad-alert ad-alert-error" style={{marginTop: '15px'}}><p>{error}</p></div>}
      
      {loading ? (
        <div className="ad-inline-loading">Loading media files from database...</div>
      ) : media.length === 0 ? (
        <div className="ad-empty compact" style={{marginTop: '20px'}}>
          <p>No media files found in the database. Upload a file to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {media.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-alt)' }}>
              {item.type?.startsWith('image') || item.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                <img src={item.url} alt={item.title} style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--media-placeholder)', color: 'var(--ink)' }}>
                  <span style={{ fontSize: '32px' }}>{item.type?.includes('audio') ? '🎵' : '📄'}</span>
                  <span style={{ fontSize: '11px', marginTop: '10px', fontWeight: 600 }}>{(item.type || 'FILE').split('/')[1]?.toUpperCase() || 'FILE'}</span>
                </div>
              )}
              <div style={{ padding: '12px' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || `Media ${item.id}`}</strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--muted)' }}>
                  <span>{item.size || 'Unknown size'}</span>
                  <span>{formatDate(item.created_at || item.date)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// Comments Module directly connected to the Database
function CommentsModeration({ authenticatedFetch }: { authenticatedFetch: any }) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    authenticatedFetch(COMMENTS_ENDPOINT)
      .then((res: Response) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then((data: any) => setComments(extractList(data)))
      .catch((error: unknown) => {
        setError(error instanceof Error ? `Could not load comments: ${error.message}` : 'Could not load comments. Please try again.')
        setComments([])
      })
      .finally(() => setLoading(false))
  }, [authenticatedFetch])

  return (
    <section className="ad-panel">
      <PanelHeading eyebrow="AUDIENCE ENGAGEMENT" title="Comments Moderation" subtitle="Read comments on your blog posts." />
      
      {error && <div className="ad-alert ad-alert-error" style={{marginTop: '15px'}}><p>{error}</p></div>}
      
      {loading ? (
        <div className="ad-inline-loading">Loading comments…</div>
      ) : comments.length === 0 ? (
         <div className="ad-empty compact" style={{marginTop: '20px'}}>
           <p>No comments on your blog posts yet.</p>
         </div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Author & Comment</th>
                <th>Blog post</th>
              </tr>
            </thead>
            <tbody>
              {comments.map(c => (
                <tr key={c.id}>
                  <td style={{ maxWidth: '300px' }}>
                    <strong>{c.user_username || 'Anonymous'}</strong>
                    <p style={{ marginTop: '4px', color: 'var(--ink)' }}>"{c.text || c.content}"</p>
                    <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>{formatDate(c.created_at || c.date)}</span>
                  </td>
                  <td><strong style={{color: 'var(--muted)', fontSize: '11px'}}>{c.post_title || `Blog post #${c.post}`}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function AuthorDashboard() {
  const { theme, toggleTheme } = useDashboardTheme()
  const [tab, setTab] = useState<Tab>(getTabFromUrl)
  const [session, setSession] = useState<Session | null>(getSession)
  const [account, setAccount] = useState<Record<string, unknown> | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [profile, setProfile] = useState<AuthorProfile | null>(null)

  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState<AuthorProfile>({})
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveMessage, setProfileSaveMessage] = useState('')
  const [profileSaveError, setProfileSaveError] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const token = session?.access

  const logout = useCallback(() => { void signOut('/workspace') }, [])

  const handleUnauthorized = useCallback(() => {
    sessionStorage.removeItem('katibaUserSession')
    setSession(null)
    window.location.replace('/workspace')
  }, [])

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const currentSession = getSession()
      if (!currentSession?.access) {
        handleUnauthorized()
        throw new Error('Your session has expired. Please sign in again.')
      }
      const headers = new Headers(options.headers)
      headers.set('Authorization', `Bearer ${currentSession.access}`)

      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }

      const response = await fetch(url, { ...options, headers })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error('Your session has expired. Please sign in again.')
      }
      if (response.status === 403) throw new Error('You do not have permission to access this resource.')
      return response
    },
    [handleUnauthorized],
  )

  const changeTab = useCallback((nextTab: Tab | string) => {
    setTab(nextTab as Tab)
    setSearchQuery('')
    setError('')

    const url = new URL(window.location.href)
    if (nextTab === 'dashboard') {
      url.pathname = DASHBOARD_PATH
    } else {
      url.pathname = `${DASHBOARD_PATH}/${nextTab}`
    }
    url.searchParams.delete('tab')
    window.history.pushState({ tab: nextTab }, '', url.toString())
  }, [])

  const handleDashboardBackCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const control = target.closest('button, a, [role="button"]')
      if (!control) return
      const label = (control.textContent || '').replace(/[←→↩↪]/g, '').trim().toLowerCase()
      if (!label.includes('dashboard')) return
      event.preventDefault()
      event.stopPropagation()
      changeTab('dashboard')
    },
    [changeTab],
  )

  useEffect(() => {
    const onPopState = () => {
      setTab(getTabFromUrl())
      setSearchQuery('')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const currentSession = getSession()
    if (!currentSession) {
      logout()
      return
    }
  }, [logout])

  const fetchAccount = useCallback(async () => {
    const response = await authenticatedFetch(ACCOUNT_ENDPOINT)
    if (!response.ok) throw new Error(`Could not load account details (HTTP ${response.status}).`)
    setAccount(asObject(await response.json()))
  }, [authenticatedFetch])

  const fetchContent = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)
      setError('')

      try {
        const [articlesResponse, blogsResponse] = await Promise.all([
          authenticatedFetch(ARTICLES_ENDPOINT),
          authenticatedFetch(BLOGS_ENDPOINT),
        ])

        if (!articlesResponse.ok) throw new Error(`Could not load articles (HTTP ${articlesResponse.status}).`)
        if (!blogsResponse.ok) throw new Error(`Could not load blogs (HTTP ${blogsResponse.status}).`)

        const [articlesData, blogsData] = await Promise.all([
          articlesResponse.json(),
          blogsResponse.json(),
        ])

        setArticles(extractList<Article>(articlesData))
        setBlogs(extractList<Blog>(blogsData))

        void fetchAccount().catch((accountError: unknown) => {
          console.warn('Account details could not be refreshed:', accountError)
        })
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load dashboard information.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [authenticatedFetch, fetchAccount],
  )

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError('')
    setProfileSaveError('')
    setProfileSaveMessage('')

    try {
      const response = await authenticatedFetch(PROFILE_ENDPOINT)
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(getErrorMessage(data, `Could not load your author profile (HTTP ${response.status}).`))
      const object = asObject(data)
      const savedProfile = asObject(object.profile ?? object.author_profile ?? object.data ?? object) as AuthorProfile
      setProfile(savedProfile)
      if (!editingProfile) setProfileDraft({ ...savedProfile })
    } catch (profileFetchError) {
      setProfileError(profileFetchError instanceof Error ? profileFetchError.message : 'Could not load your author profile.')
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [authenticatedFetch, editingProfile])

  useEffect(() => {
    if (!token) return
    let active = true
    queueMicrotask(() => { if (active) void fetchContent() })
    return () => { active = false }
  }, [token, fetchContent])

  useEffect(() => {
    if (!token || tab !== 'profile') return
    let active = true
    queueMicrotask(() => { if (active) void fetchProfile() })
    return () => { active = false }
  }, [tab, token, fetchProfile])

  // Blogs Definition for safely mapping status metrics on Analytics Tab
  const blogsWithStatus = useMemo(() => blogs.filter((blog) => Boolean(blog.status?.trim())), [blogs])

  // Article Stats
  const publishedArticlesCount = useMemo(() => articles.filter(isPublished).length, [articles])
  const draftArticlesCount = useMemo(() => articles.filter(isDraft).length, [articles])
  const reviewArticlesCount = useMemo(() => articles.filter(isUnderReview).length, [articles])
  const totalArticleViews = useMemo(() => articles.reduce((sum, item) => sum + (Number(item.views_count) || 0), 0), [articles])

  // Blog Stats
  const publishedBlogsCount = useMemo(() => blogs.filter(isPublished).length, [blogs])
  const draftBlogsCount = useMemo(() => blogs.filter(isDraft).length, [blogs])
  const reviewBlogsCount = useMemo(() => blogs.filter(isUnderReview).length, [blogs])
  const totalBlogLikes = useMemo(() => blogs.reduce((sum, item) => sum + (Number(item.likes_count) || 0), 0), [blogs])

  // Queues
  const draftArticlesList = useMemo(() => 
    articles.filter(isDraft).sort((a,b) => new Date(getRecordDate(b)||0).getTime() - new Date(getRecordDate(a)||0).getTime()).slice(0, 5)
  , [articles])

  const reviewArticlesList = useMemo(() => 
    articles.filter(a => isUnderReview(a) || isRejected(a)).sort((a,b) => new Date(getRecordDate(b)||0).getTime() - new Date(getRecordDate(a)||0).getTime()).slice(0, 5)
  , [articles])

  const draftBlogsList = useMemo(() => 
    blogs.filter(isDraft).sort((a,b) => new Date(getRecordDate(b)||0).getTime() - new Date(getRecordDate(a)||0).getTime()).slice(0, 5)
  , [blogs])

  const reviewBlogsList = useMemo(() => 
    blogs.filter(a => isUnderReview(a) || isRejected(a)).sort((a,b) => new Date(getRecordDate(b)||0).getTime() - new Date(getRecordDate(a)||0).getTime()).slice(0, 5)
  , [blogs])

  const authorName = profile?.preferred_byline || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || [account?.first_name, account?.last_name].filter((part): part is string => typeof part === 'string' && Boolean(part)).join(' ') || (typeof account?.username === 'string' ? account.username : '') || session?.username || 'Author'
  const initials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')

  // Search Results
  const filteredArticles = useMemo(() => articles.filter((article) => (article.title || '').toLowerCase().includes(searchQuery.toLowerCase())), [articles, searchQuery])
  const filteredBlogs = useMemo(() => blogs.filter((blog) => (blog.title || '').toLowerCase().includes(searchQuery.toLowerCase())), [blogs, searchQuery])

  const weeklyData = useMemo(() => {
    const days = getLastSevenDays(); const today = new Date(); today.setHours(0, 0, 0, 0)
    const dates = days.map((_, index) => { const date = new Date(today); date.setDate(today.getDate() - (6 - index)); return getDateKey(date) })
    return {
      labels: days.map((day) => day.label),
      articleValues: dates.map((key) => articles.filter((article) => { const value = getCreatedDate(article); return value && getDateKey(new Date(value)) === key }).length),
      blogValues: dates.map((key) => blogs.filter((blog) => { const value = getCreatedDate(blog); return value && getDateKey(new Date(value)) === key }).length),
    }
  }, [articles, blogs])

  const monthlyData = useMemo(() => {
    const months = getLastTwelveMonths(); const now = new Date()
    const keys = months.map((_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` })
    return {
      labels: months.map((month) => month.label),
      articleValues: keys.map((key) => articles.filter((article) => { const value = getCreatedDate(article); if (!value) return false; const date = new Date(value); return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === key }).length),
      blogValues: keys.map((key) => blogs.filter((blog) => { const value = getCreatedDate(blog); if (!value) return false; const date = new Date(value); return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === key }).length),
    }
  }, [articles, blogs])

  const startProfileEditing = useCallback(() => { setProfileDraft({ ...(profile || {}) }); setProfileSaveMessage(''); setProfileSaveError(''); setEditingProfile(true) }, [profile])
  const cancelProfileEditing = useCallback(() => { setProfileDraft({ ...(profile || {}) }); setEditingProfile(false); setProfileSaveError(''); setProfileSaveMessage('') }, [profile])
  const updateProfileField = useCallback((field: keyof AuthorProfile, value: string) => { setProfileDraft((current) => ({ ...current, [field]: value })); setProfileSaveError(''); setProfileSaveMessage('') }, [])

  const saveProfileChanges = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (profileSaving) return
      setProfileSaving(true); setProfileSaveError(''); setProfileSaveMessage('')

      try {
        const response = await authenticatedFetch(PROFILE_ENDPOINT, { method: 'PUT', body: JSON.stringify(profileDraft) })
        const responseData: unknown = await response.json().catch(() => null)
        if (!response.ok) throw new Error(getErrorMessage(responseData, `Could not save your profile (HTTP ${response.status}).`))

        const responseObject = asObject(responseData)
        const returnedProfile = asObject(responseObject.profile ?? responseObject.author_profile ?? responseObject.data ?? responseObject)
        const savedProfile = (Object.keys(returnedProfile).length > 0 ? returnedProfile : profileDraft) as AuthorProfile

        setProfile(savedProfile)
        setProfileDraft({ ...savedProfile })
        setEditingProfile(false)
        setProfileSaveMessage('Your author profile has been saved successfully.')
      } catch (saveError) {
        setProfileSaveError(saveError instanceof Error ? saveError.message : 'Could not save your profile.')
      } finally {
        setProfileSaving(false)
      }
    },
    [authenticatedFetch, profileDraft, profileSaving],
  )

  function renderProfile() {
    if (profileLoading) return <div className="ad-state"><span className="ad-spinner" /><p>Loading your saved author profile…</p></div>
    if (profileError) return <div className="ad-alert ad-alert-error"><strong>Unable to load profile</strong><p>{profileError}</p><button className="ad-button" onClick={() => void fetchProfile()}>Try again</button></div>
    if (!profile) return <div className="ad-empty"><div className="ad-empty-icon">♙</div><h3>No saved profile was returned</h3><p>The server did not return an author profile.</p><button className="ad-button" onClick={() => void fetchProfile()}>Refresh profile</button></div>

    return (
      <div className="ad-profile-content">

        {profileSaveMessage && <div className="ad-alert ad-alert-success" role="status">{profileSaveMessage}</div>}
        {profileSaveError && <div className="ad-alert ad-alert-error" role="alert">{profileSaveError}</div>}

        <div className="ad-profile-hero">
          <ProfilePhoto initials={initials || 'A'} large />
          <div className="ad-profile-hero-copy">
            <span className="ad-eyebrow">AUTHOR PROFILE</span>
            <h2>{authorName}</h2>
            <p>{displayValue(profile.professional_title)} · {displayValue(profile.location)}</p>
          </div>
          <div className="ad-profile-hero-actions">
            <button className="ad-button" onClick={startProfileEditing}>✎ Edit profile</button>
            <button className="ad-button ad-button-light" onClick={() => void fetchProfile()} disabled={profileSaving}>↻ Refresh</button>
          </div>
        </div>

        {editingProfile ? (
          <form className="ad-profile-edit-form" onSubmit={saveProfileChanges}>
            {PROFILE_GROUPS.map((group) => (
              <section className="ad-profile-section" key={group.title}>
                <h3>{group.title}</h3>
                <div className="ad-profile-grid">
                  {group.fields.map((field) => {
                    const value = profileDraft[field]; const inputValue = typeof value === 'string' || typeof value === 'number' ? String(value) : ''; const label = PROFILE_LABELS[field] || String(field)
                    const inputType = field === 'email' ? 'email' : field === 'phone_number' ? 'tel' : field === 'portfolio_url' || field === 'linkedin_url' ? 'url' : field === 'years_of_experience' ? 'number' : 'text'
                    return (
                      <label className={`ad-profile-edit-field${LONG_TEXT_FIELDS.has(field) ? ' wide' : ''}`} key={field}>
                        <span className="ad-profile-edit-label">{label}</span>
                        {LONG_TEXT_FIELDS.has(field) ? (
                          <textarea className="ad-profile-input ad-profile-textarea" value={inputValue} onChange={(event) => updateProfileField(field, event.target.value)} placeholder={`Enter ${label.toLowerCase()}`} rows={4} />
                        ) : (
                          <input className="ad-profile-input" type={inputType} min={field === 'years_of_experience' ? 0 : undefined} value={inputValue} onChange={(event) => updateProfileField(field, event.target.value)} placeholder={`Enter ${label.toLowerCase()}`} />
                        )}
                      </label>
                    )
                  })}
                </div>
              </section>
            ))}
            <div className="ad-profile-edit-actions">
              <button type="button" className="ad-button ad-button-light" onClick={cancelProfileEditing} disabled={profileSaving}>Cancel</button>
              <button type="submit" className="ad-button" disabled={profileSaving}>{profileSaving ? 'Saving changes…' : 'Save changes'}</button>
            </div>
          </form>
        ) : (
          PROFILE_GROUPS.map((group) => {
            const fields = group.fields
            return (
              <section className="ad-profile-section" key={group.title}>
                <h3>{group.title}</h3>
                {fields.length === 0 ? <p className="ad-muted">No saved information in this section.</p> : (
                  <div className="ad-profile-grid">
                    {fields.map((field) => {
                      const savedValue = profile[field]; const value = field === 'email' && (savedValue === undefined || savedValue === null || savedValue === '') ? (account?.email || savedValue) : savedValue; const label = PROFILE_LABELS[field] || String(field)
                      return (
                        <div className={`ad-profile-field${LONG_TEXT_FIELDS.has(field) ? ' wide' : ''}`} key={field}>
                          <span>{label}</span>
                          {typeof value === 'string' && /^https?:\/\//i.test(value) ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : <p>{value === undefined || value === null || value === '' ? 'Not provided' : displayValue(value)}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>
    )
  }

  // Dashboard Unified Clickable Card Component
  const DashboardCard = ({ record, type }: { record: ContentRecord, type: 'Article' | 'Blog' }) => {
    const image = getCardImage(record);
    const excerpt = getCardExcerpt(record);
    const status = normalizeStatus(record.status);
    const displayImageUrl = image ? (image.startsWith('http') || image.startsWith('data:') || image.startsWith('/') ? image : `/${image}`) : null;

    return (
      <div className="ad-card" onClick={() => changeTab(type === 'Blog' ? 'blogs' : 'articles')}>
        <div className="ad-card-img-wrap">
          {displayImageUrl ? (
            <img src={displayImageUrl} alt={record.title || "Cover"} onError={(e) => e.currentTarget.style.display = 'none'} />
          ) : (
            <div className="ad-card-placeholder">
              {type === 'Blog' ? '✎' : '▤'}
            </div>
          )}
          <div className="ad-card-badges">
            <span className={`ad-status ad-status-${status}`}>{getStatusLabel(status)}</span>
          </div>
        </div>
        
        <div className="ad-card-body">
          <div className="ad-card-meta">
            <span className="ad-card-type">{type}</span>
            <span style={{ color: 'var(--green)' }}>{getRecordCategory(record)}</span>
            <span>•</span>
            <span>{formatDate(getRecordDate(record))}</span>
          </div>
          
          <h3 className="ad-card-title">{record.title || `Untitled ${type}`}</h3>
          <p className="ad-card-excerpt">{excerpt || "No summary or excerpt available."}</p>
          
          <div className="ad-card-footer">
            <div className="ad-card-actions">
              <span title="Views">👁 {formatNumber(record.views_count || 0)}</span>
              {type === 'Blog' ? (
                <span title="Likes">♡ {formatNumber((record as Blog).likes_count || 0)}</span>
              ) : (
                <span title="Comments">💬 {formatNumber(record.comments_count || 0)}</span>
              )}
            </div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
              {record.author_username || 'Author'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  function renderRecentArticles() {
    if (loading) return <div className="ad-inline-loading">Loading recent articles…</div>
    
    const recentContent = [...articles]
      .sort((a, b) => new Date(getRecordDate(b) || 0).getTime() - new Date(getRecordDate(a) || 0).getTime())
      .slice(0, 4)

    if (recentContent.length === 0) {
      return (
        <div className="ad-empty compact">
          <p>No article records returned.</p>
        </div>
      )
    }

    return (
      <div className="ad-card-grid">
        {recentContent.map(record => (
          <DashboardCard key={`recent-article-${record.id}`} record={record} type="Article" />
        ))}
      </div>
    )
  }

  function renderRecentBlogs() {
    if (loading) return <div className="ad-inline-loading">Loading recent blogs…</div>
    
    const recentContent = [...blogs]
      .sort((a, b) => new Date(getRecordDate(b) || 0).getTime() - new Date(getRecordDate(a) || 0).getTime())
      .slice(0, 4)

    if (recentContent.length === 0) {
      return (
        <div className="ad-empty compact">
          <p>No blog records returned.</p>
        </div>
      )
    }

    return (
      <div className="ad-card-grid">
        {recentContent.map(record => (
          <DashboardCard key={`recent-blog-${record.id}`} record={record} type="Blog" />
        ))}
      </div>
    )
  }

  function renderDashboard() {
    return (
      <>
        <section className="ad-welcome">
          <div>
            <span className="ad-eyebrow">THE EDITORIAL DESK</span>
            <h1>Welcome back, {authorName.split(' ')[0]}!</h1>
            <p>Review submissions, refine the reporting, and make your decision.</p>
          </div>
        </section>

        {error && (
          <div className="ad-alert ad-alert-error">
            <strong>CMS connection error</strong>
            <p>{error}</p>
            <button className="ad-button" onClick={() => void fetchContent(true)}>Reconnect</button>
          </div>
        )}

        {/* --- ARTICLES SECTION --- */}
        <div style={{ marginTop: '40px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Articles Overview</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>Professional journalism pieces and drafted news stories.</p>
        </div>

        <section className="ad-stats-grid ad-stats-grid-primary" style={{ marginBottom: '20px' }}>
           <StatCard 
             label="Article Drafts" 
             value={loading ? '…' : formatNumber(draftArticlesCount)} 
             icon="◷" 
             detail="View article drafts →" 
             accent="orange" 
             onClick={() => changeTab('articles')} 
           />
           <StatCard 
             label="In Review" 
             value={loading ? '…' : formatNumber(reviewArticlesCount)} 
             icon="◌" 
             detail="Review queue →" 
             accent="red" 
             onClick={() => changeTab('articles')} 
           />
           <StatCard 
             label="Approved" 
             value={loading ? '…' : formatNumber(articles.filter(a => normalizeStatus(a.status) === 'approved').length)} 
             icon="✓" 
             detail="Ready to publish →" 
             accent="teal" 
             onClick={() => changeTab('articles')} 
           />
           <StatCard 
             label="Published" 
             value={loading ? '…' : formatNumber(publishedArticlesCount)} 
             icon="▤" 
             detail="Live articles →" 
             accent="green" 
             onClick={() => changeTab('articles')} 
           />
           <StatCard 
             label="Total Views" 
             value={loading ? '…' : formatNumber(totalArticleViews)} 
             icon="👁" 
             detail="View analytics →" 
             accent="blue" 
             onClick={() => changeTab('analytics')} 
           />
        </section>

        <section className="ad-two-column" style={{ marginBottom: '40px' }}>
          <div className="ad-panel" style={{minHeight: '280px'}}>
            <PanelHeading 
               eyebrow="EDITORIAL OPERATIONS" 
               title="Articles waiting for review" 
               subtitle="Writers have submitted these for your approval." 
               action={<span style={{fontSize: '11px', color: 'var(--muted)'}}>{reviewArticlesList.length} waiting</span>}
            />
            {loading ? <p className="ad-muted">Loading queue...</p> : (
              <div className="ad-queue-list">
                {reviewArticlesList.map(a => (
                  <div className="ad-queue-item" key={`rev-art-${a.id}`} onClick={() => changeTab('articles')}>
                    <span className={`ad-status ad-status-${normalizeStatus(a.status)}`}>{getStatusLabel(a.status)}</span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{a.title || 'Untitled'}</strong>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span>{formatDate(a.updated_at || a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {reviewArticlesList.length === 0 && (
                  <div className="ad-empty compact" style={{marginTop: '20px'}}><p>No articles waiting for your review.</p></div>
                )}
              </div>
            )}
          </div>

          <div className="ad-panel" style={{minHeight: '280px'}}>
             <PanelHeading 
               eyebrow="THE EDITORIAL DESK" 
               title="Active Article Drafts" 
               subtitle="Articles currently being written." 
             />
             <div className="ad-queue-list" style={{marginTop: '10px'}}>
                {draftArticlesList.map(a => (
                  <div className="ad-queue-item" key={`draft-art-${a.id}`} onClick={() => changeTab('articles')}>
                    <span className="ad-status ad-status-draft">Draft</span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{a.title || 'Untitled'}</strong>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span>{formatDate(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {draftArticlesList.length === 0 && (
                  <div className="ad-empty compact" style={{marginTop: '20px'}}><p>No active drafts.</p></div>
                )}
              </div>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <PanelHeading 
            title="Recent Articles" 
            action={<button className="ad-text-button" onClick={() => changeTab('articles')}>View all articles →</button>} 
          />
          {renderRecentArticles()}
        </section>

        {/* --- BLOGS SECTION --- */}
        <div style={{ marginTop: '40px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Blogs Overview</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>Community pieces, opinions, and personal stories.</p>
        </div>

        <section className="ad-stats-grid ad-stats-grid-primary" style={{ marginBottom: '20px' }}>
           <StatCard 
             label="Blog Drafts" 
             value={loading ? '…' : formatNumber(draftBlogsCount)} 
             icon="◷" 
             detail="View blog drafts →" 
             accent="orange" 
             onClick={() => changeTab('blogs')} 
           />
           <StatCard 
             label="In Review" 
             value={loading ? '…' : formatNumber(reviewBlogsCount)} 
             icon="◌" 
             detail="Review queue →" 
             accent="red" 
             onClick={() => changeTab('blogs')} 
           />
           <StatCard 
             label="Approved" 
             value={loading ? '…' : formatNumber(blogs.filter(b => normalizeStatus(b.status) === 'approved').length)} 
             icon="✓" 
             detail="Ready to publish →" 
             accent="teal" 
             onClick={() => changeTab('blogs')} 
           />
           <StatCard 
             label="Published" 
             value={loading ? '…' : formatNumber(publishedBlogsCount)} 
             icon="✎" 
             detail="Live blogs →" 
             accent="green" 
             onClick={() => changeTab('blogs')} 
           />
           <StatCard 
             label="Total Likes" 
             value={loading ? '…' : formatNumber(totalBlogLikes)} 
             icon="♡" 
             detail="View analytics →" 
             accent="purple" 
             onClick={() => changeTab('analytics')} 
           />
        </section>

        <section className="ad-two-column" style={{ marginBottom: '40px' }}>
          <div className="ad-panel" style={{minHeight: '280px'}}>
            <PanelHeading 
               eyebrow="COMMUNITY OPERATIONS" 
               title="Blogs waiting for review" 
               subtitle="Community submissions pending approval." 
               action={<span style={{fontSize: '11px', color: 'var(--muted)'}}>{reviewBlogsList.length} waiting</span>}
            />
            {loading ? <p className="ad-muted">Loading queue...</p> : (
              <div className="ad-queue-list">
                {reviewBlogsList.map(b => (
                  <div className="ad-queue-item" key={`rev-blog-${b.id}`} onClick={() => changeTab('blogs')}>
                    <span className={`ad-status ad-status-${normalizeStatus(b.status)}`}>{getStatusLabel(b.status)}</span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{b.title || 'Untitled'}</strong>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span>{formatDate(b.updated_at || b.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {reviewBlogsList.length === 0 && (
                  <div className="ad-empty compact" style={{marginTop: '20px'}}><p>No blogs waiting for your review.</p></div>
                )}
              </div>
            )}
          </div>

          <div className="ad-panel" style={{minHeight: '280px'}}>
             <PanelHeading 
               eyebrow="COMMUNITY DRAFTS" 
               title="Active Blog Drafts" 
               subtitle="Blogs currently being written." 
             />
             <div className="ad-queue-list" style={{marginTop: '10px'}}>
                {draftBlogsList.map(b => (
                  <div className="ad-queue-item" key={`draft-blog-${b.id}`} onClick={() => changeTab('blogs')}>
                    <span className="ad-status ad-status-draft">Draft</span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{b.title || 'Untitled'}</strong>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span>{formatDate(b.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {draftBlogsList.length === 0 && (
                  <div className="ad-empty compact" style={{marginTop: '20px'}}><p>No active blog drafts.</p></div>
                )}
              </div>
          </div>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <PanelHeading 
            title="Recent Blogs" 
            action={<button className="ad-text-button" onClick={() => changeTab('blogs')}>View all blogs →</button>} 
          />
          {renderRecentBlogs()}
        </section>
      </>
    )
  }

  function renderAnalytics() {
    return (
      <>
        <section className="ad-page-heading">
          <div>
            <span className="ad-eyebrow">PERFORMANCE CENTRE</span>
            <h1>Publishing analytics</h1>
            <p>Weekly, monthly, status, and category breakdowns for your content.</p>
          </div>
          <button className="ad-button ad-button-light" onClick={() => void fetchContent(true)} disabled={refreshing}>
            ↻ {refreshing ? 'Refreshing…' : 'Refresh analytics'}
          </button>
        </section>

        {error && <div className="ad-alert ad-alert-error"><strong>Analytics could not be fully refreshed</strong><p>{error}</p></div>}

        {/* Global Stats for Analytics Header */}
        <section className="ad-stats-grid ad-stats-grid-primary" style={{ marginBottom: '40px', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
           <StatCard label="Total Articles" value={loading ? '…' : formatNumber(articles.length)} icon="▤" detail="Total lifetime articles" accent="green" />
           <StatCard label="Total Blogs" value={loading ? '…' : formatNumber(blogs.length)} icon="✎" detail="Total lifetime blogs" accent="purple" />
           <StatCard label="Article Views" value={loading ? '…' : formatNumber(totalArticleViews)} icon="👁" detail="Total article views" accent="blue" />
           <StatCard label="Blog Likes" value={loading ? '…' : formatNumber(totalBlogLikes)} icon="♡" detail="Total blog likes" accent="red" />
        </section>

        <div style={{ marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Articles Analytics</h2>
        </div>

        <section className="ad-chart-grid">
          <LineChart title="Weekly Article Activity" subtitle="Articles created each day over the last seven days" labels={weeklyData.labels} series={[{ name: 'Articles', values: weeklyData.articleValues, color: '#159b76' }]} />
          <PieChart title="Article Status Breakdown" subtitle="Counts and percentages" data={countByStatus(articles)} />
        </section>

        <section className="ad-chart-grid">
          <BarChart title="Monthly Article Growth" subtitle="Monthly article creation for the last 12 months" labels={monthlyData.labels} series={[{ name: 'Articles', values: monthlyData.articleValues, color: '#159b76' }]} />
          <CategoryChart title="Article Categories" subtitle="Category distribution across all articles" records={articles} />
        </section>

        <div style={{ marginTop: '40px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Blogs Analytics</h2>
        </div>

        <section className="ad-chart-grid">
          <LineChart title="Weekly Blog Activity" subtitle="Blogs created each day over the last seven days" labels={weeklyData.labels} series={[{ name: 'Blogs', values: weeklyData.blogValues, color: '#7770d6' }]} />
          <PieChart title="Blog Status Breakdown" subtitle={blogsWithStatus.length ? 'Counts and percentages' : 'No blog status values returned'} data={countByStatus(blogsWithStatus)} />
        </section>

        <section className="ad-chart-grid">
          <BarChart title="Monthly Blog Growth" subtitle="Monthly blog creation for the last 12 months" labels={monthlyData.labels} series={[{ name: 'Blogs', values: monthlyData.blogValues, color: '#7770d6' }]} />
          <CategoryChart title="Blog Categories" subtitle="Category distribution across all blogs" records={blogs} />
        </section>
      </>
    )
  }

  function renderContent() {
    if (tab === 'dashboard') return renderDashboard()
    if (tab === 'analytics') return renderAnalytics()
    if (tab === 'media') return <MediaLibrary authenticatedFetch={authenticatedFetch} />
    if (tab === 'comments') return <CommentsModeration authenticatedFetch={authenticatedFetch} />
    
    if (tab === 'articles') {
      return (
        <section className="ad-editor-panel">
          <div className="ad-page-heading">
            <div><span className="ad-eyebrow">EDITORIAL WORKSPACE</span><h1>Article editor</h1><p>Draft, revise, and manage SEO metadata for your articles.</p></div>
            <button className="ad-button ad-button-light" onClick={() => changeTab('dashboard')}>← Dashboard</button>
          </div>
          <Suspense fallback={<p className="ad-inline-loading" role="status">Loading tools…</p>}><ArticleEditor /></Suspense>
        </section>
      )
    }
    if (tab === 'blogs') {
      return (
        <section className="ad-panel">
          <div className="ad-page-heading"><div><span className="ad-eyebrow">COMMUNITY WRITING</span><h1>Blogs feed</h1><p>Explore blog content connected to your account.</p></div></div>
          <Suspense fallback={<p className="ad-inline-loading" role="status">Loading tools…</p>}><BlogView /></Suspense>
        </section>
      )
    }
    if (tab === 'profile') {
      return (
        <section className="ad-panel">
          <div className="ad-page-heading"><div><span className="ad-eyebrow">ACCOUNT INFORMATION</span><h1>My Profile</h1><p>Your public-facing journalism portfolio and contact details.</p></div></div>
          {renderProfile()}
        </section>
      )
    }

    if (tab === 'settings') return <AuthorSettings />

    return null
  }

  if (!session) {
    return (
      <div className="ad-auth-required">
        <h1>Sign in required</h1>
        <p>Please sign in to access the Katiba News Author CMS.</p>
        <button className="ad-button" onClick={logout}>Go to sign in</button>
      </div>
    )
  }

  const currentNavItem = navItems.find((item) => item.id === tab)

  return (
    <div className={`ad-shell ${theme}`}>
      <style>{`
        .ad-shell {
          /* Light Mode Defaults - Matching Image Reference */
          --ink: var(--workspace-text);
          --muted: var(--workspace-muted);
          --green: #087f68;
          --green-dark: #066650;
          --border: var(--workspace-border);
          --surface: var(--workspace-surface);
          --surface-alt: var(--workspace-soft);
          --bg: var(--workspace-bg);
          
          /* Fixed Dark Sidebar Theme - Detached from Light/Dark mode */
          --sidebar-bg: #142925;
          --sidebar-text: #c1d0ca;
          --sidebar-active-bg: #087f68;
          --sidebar-active-text: #ffffff;
          --sidebar-border: #213c34;
          
          --chart-grid: #e8efeb;
          --chart-text: #7f8d87;
          --chart-pie-bg: #edf2ef;
          --media-placeholder: #f0f3f1;
          
          min-height: 100vh; display: flex; background: var(--bg); color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          transition: background 0.2s, color 0.2s;
        }

        /* Dark Mode Overrides for Main Content */
        .ad-shell.dark {
          --ink: var(--workspace-text);
          --muted: var(--workspace-muted);
          --border: var(--workspace-border);
          --surface: var(--workspace-surface);
          --surface-alt: var(--workspace-soft);
          --bg: var(--workspace-bg);
          
          --chart-grid: #1a2f27;
          --chart-text: #5f756b;
          --chart-pie-bg: #162621;
          --media-placeholder: #162621;
        }

        .ad-shell * { box-sizing: border-box; }
        .ad-shell button, .ad-shell input, .ad-shell textarea { font: inherit; }
        .ad-shell button:focus-visible, .ad-shell a:focus-visible, .ad-shell input:focus-visible, .ad-shell textarea:focus-visible { outline: 3px solid #82d7bb; outline-offset: 3px; }
        
        .ad-sidebar { width: 250px; flex: 0 0 250px; background: var(--sidebar-bg); color: var(--sidebar-text); min-height: 100vh; padding: 22px 16px; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        .ad-brand { display: flex; align-items: center; gap: 11px; padding: 5px 10px 35px; }
        .ad-brand-mark { display: grid; place-items: center; width: 39px; height: 39px; border-radius: 12px; background: #6be0b5; color: #102923; font-weight: 900; font-size: 20px; }
        .ad-brand strong { display: block; color: #fff; font-size: 18px; font-weight: 800; letter-spacing: -.5px; }
        .ad-brand small { display: block; color: #8ba49c; font-size: 9px; margin-top: 4px; letter-spacing: 1.2px; text-transform: uppercase; }
        
        .ad-nav-label { padding: 0 12px 14px; color: #8ba49c; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
        .ad-nav { display: grid; gap: 4px; }
        .ad-nav-button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: var(--sidebar-text); cursor: pointer; text-align: left; font-size: 13px; font-weight: 500; transition: background .15s, color .15s; }
        .ad-nav-button:hover { background: #21413a; color: #ffffff; }
        .ad-nav-button.active { color: var(--sidebar-active-text); background: var(--sidebar-active-bg); font-weight: 600; }
        .ad-nav-icon { width: 20px; text-align: center; font-size: 17px; }
        .ad-nav-separator { height: 1px; margin: 16px 12px; background: var(--sidebar-border); }
        .ad-nav-button.ad-logout { color: #e68e8e; }
        .ad-nav-button.ad-logout:hover { background: #3d2424; color: #ffb5b5; }
        
        .ad-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .ad-topbar { min-height: 72px; display: flex; align-items: center; gap: 16px; padding: 12px 30px; background: var(--surface); border-bottom: 1px solid var(--border); transition: background 0.2s, border-color 0.2s; }
        
        .ad-breadcrumb { font-size: 13px; color: var(--muted); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ad-breadcrumb span { color: var(--green); font-weight: 600; }
        
        .ad-search { display: flex; align-items: center; gap: 9px; width: min(380px, 40%); padding: 0 14px; height: 42px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--muted); }
        .ad-search input { min-width: 0; width: 100%; border: 0; outline: none; background: transparent; color: var(--ink); font-size: 13px; }
        .ad-search-icon { font-size: 16px; cursor: pointer; }
        
        .ad-theme-toggle { display: flex; align-items: center; gap: 6px; background: var(--surface); color: var(--green); border: 1px solid var(--border); padding: 8px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; transition: transform 0.1s, background 0.15s; }
        .ad-theme-toggle:hover { background: var(--bg); }
        .ad-theme-toggle:active { transform: scale(0.95); }
        
        .ad-user-chip { display: flex; align-items: center; gap: 10px; padding-left: 12px; border-left: 1px solid var(--border); }
        .ad-avatar { display: grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 50%; background: #e8f7ef; color: #087f68; font-weight: 700; font-size: 13px; }
        .ad-user-name { font-size: 12px; font-weight: 600; color: var(--ink); }
        .ad-user-role { display: block; margin-top: 2px; color: var(--muted); font-size: 10px; }
        
        .ad-signout-btn { background: transparent; border: 1px solid var(--border); color: var(--ink); padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-left: 10px; }
        .ad-signout-btn:hover { background: var(--bg); }

        .ad-content { width: 100%; max-width: 1400px; padding: 32px 40px 48px; margin: 0 auto; flex: 1; }
        .ad-welcome { margin-bottom: 30px; }
        .ad-welcome h1, .ad-page-heading h1 { font-size: 26px; letter-spacing: -0.5px; margin: 8px 0; line-height: 1.2; font-weight: 700; color: var(--ink); }
        .ad-welcome p, .ad-page-heading p { color: var(--muted); font-size: 14px; margin: 0; line-height: 1.6; }
        .ad-eyebrow { display: block; color: var(--green); font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
        
        .ad-button { display: inline-flex; justify-content: center; align-items: center; gap: 8px; border: 0; border-radius: 8px; background: var(--green); color: #fff; padding: 11px 18px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .15s, transform .15s; }
        .ad-button:hover { background: var(--green-dark); transform: translateY(-1px); }
        .ad-button:disabled { opacity: .65; cursor: wait; transform: none; }
        .ad-button-light { background: transparent; color: var(--ink); border: 1px solid var(--border); }
        .ad-button-light:hover { background: var(--bg); }
        
        .ad-stats-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 20px; margin-bottom: 24px; }
        
        /* Redesigned Stat Cards from Reference Image */
        .ad-stat { position: relative; padding: 22px 24px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); transition: transform 0.2s, box-shadow 0.2s; border-top: 4px solid var(--border); display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; }
        .ad-stat-clickable { cursor: pointer; }
        .ad-stat-clickable:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
        
        .ad-stat-orange { border-top-color: #f5b041; }
        .ad-stat-green { border-top-color: #2ecc71; }
        .ad-stat-teal { border-top-color: #1abc9c; }
        .ad-stat-red { border-top-color: #e74c3c; }
        .ad-stat-purple { border-top-color: #9b59b6; }
        .ad-stat-blue { border-top-color: #3498db; }
        
        .ad-stat-inner { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
        .ad-stat-content { display: flex; flex-direction: column; }
        .ad-stat-label { color: var(--ink); font-size: 13px; font-weight: 600; margin-bottom: 12px; }
        .ad-stat-value { font-size: 34px; line-height: 1; letter-spacing: -1px; font-weight: 700; color: var(--ink); }
        
        .ad-stat-icon-wrap { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; flex-shrink: 0; }
        .ad-stat-orange .ad-stat-icon-wrap { background: #fef5e7; color: #f5b041; }
        .ad-stat-green .ad-stat-icon-wrap { background: #eafaf1; color: #2ecc71; }
        .ad-stat-teal .ad-stat-icon-wrap { background: #e8f8f5; color: #1abc9c; }
        .ad-stat-red .ad-stat-icon-wrap { background: #fdedec; color: #e74c3c; }
        .ad-stat-purple .ad-stat-icon-wrap { background: #f5eef8; color: #9b59b6; }
        .ad-stat-blue .ad-stat-icon-wrap { background: #ebf5fb; color: #3498db; }
        
        .ad-shell.dark .ad-stat-orange .ad-stat-icon-wrap { background: #382811; }
        .ad-shell.dark .ad-stat-green .ad-stat-icon-wrap { background: #133322; }
        .ad-shell.dark .ad-stat-teal .ad-stat-icon-wrap { background: #11332c; }
        .ad-shell.dark .ad-stat-red .ad-stat-icon-wrap { background: #3a1a19; }
        .ad-shell.dark .ad-stat-purple .ad-stat-icon-wrap { background: #2b1b33; }
        .ad-shell.dark .ad-stat-blue .ad-stat-icon-wrap { background: #11253a; }

        .ad-stat-link { margin-top: 18px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .ad-stat-orange .ad-stat-link { color: #f5b041; }
        .ad-stat-green .ad-stat-link { color: #2ecc71; }
        .ad-stat-teal .ad-stat-link { color: #1abc9c; }
        .ad-stat-red .ad-stat-link { color: #e74c3c; }
        .ad-stat-purple .ad-stat-link { color: #9b59b6; }
        .ad-stat-blue .ad-stat-link { color: #3498db; }

        /* Unified Card Grid matching modern Article Editor cards */
        .ad-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; margin-top: 16px; }
        .ad-card { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; min-height: 320px; }
        .ad-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: var(--green); }
        .ad-card-img-wrap { position: relative; height: 160px; background: var(--bg); border-bottom: 1px solid var(--border); overflow: hidden; }
        .ad-card-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
        .ad-card:hover .ad-card-img-wrap img { transform: scale(1.05); }
        .ad-card-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--surface-alt); color: var(--muted); font-size: 32px; }
        .ad-card-badges { position: absolute; top: 12px; left: 12px; display: flex; gap: 8px; }
        .ad-card-body { padding: 20px; display: flex; flex-direction: column; flex: 1; }
        .ad-card-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .ad-card-type { color: var(--surface); background: var(--sidebar-active-bg); padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
        .ad-card-title { font-size: 16px; font-weight: 800; color: var(--ink); line-height: 1.4; margin: 0 0 8px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .ad-card-excerpt { font-size: 13px; color: var(--muted); line-height: 1.6; margin: 0 0 16px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
        .ad-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid var(--border); font-size: 12px; color: var(--muted); font-weight: 600; }
        .ad-card-actions { display: flex; gap: 12px; }

        .ad-chart-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 20px; margin-bottom: 24px; }
        .ad-chart-card { min-width: 0; padding: 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
        .ad-chart-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .ad-chart-heading h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--ink); }
        .ad-chart-heading p { margin: 6px 0 0; color: var(--muted); font-size: 12px; }
        
        .ad-panel, .ad-editor-panel { margin-bottom: 24px; padding: 28px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; min-width: 0; box-shadow: 0 2px 10px rgba(0,0,0,0.01); }
        .ad-panel-heading, .ad-page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; margin-bottom: 24px; }
        .ad-panel-heading h2 { margin: 6px 0 0; font-size: 18px; font-weight: 700; color: var(--ink); }
        .ad-section-subtitle { margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        
        .ad-table-wrap { width: 100%; overflow-x: auto; }
        .ad-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 650px; }
        .ad-table th { padding: 14px 12px; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .ad-table td { padding: 16px 12px; border-bottom: 1px solid var(--border); color: var(--ink); font-size: 13px; vertical-align: top; }
        .ad-table tbody tr:last-child td { border-bottom: 0; }
        .ad-table td strong { display: block; color: var(--ink); font-size: 13px; font-weight: 600; }
        .ad-table td p { max-width: 440px; margin: 6px 0 0; line-height: 1.5; color: var(--muted); font-size: 12px; }
        
        .ad-status { display: inline-block; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 600; background: var(--border); color: var(--ink); white-space: nowrap; }
        .ad-status-published { background: #eafaf1; color: #27ae60; }
        .ad-status-approved { background: #e8f8f5; color: #1abc9c; }
        .ad-status-draft { background: #ebf5fb; color: #2980b9; }
        .ad-status-under-review, .ad-status-under_review, .ad-status-in_review, .ad-status-pending_review { background: #fef5e7; color: #d35400; }
        .ad-status-rejected { background: #fdedec; color: #c0392b; }
        .ad-shell.dark .ad-status-published { background: #123828; color: #4dc497; }
        .ad-shell.dark .ad-status-approved { background: #11332c; color: #48c9b0; }
        .ad-shell.dark .ad-status-draft { background: #11253a; color: #5a9ced; }
        .ad-shell.dark .ad-status-under-review { background: #3d2d14; color: #e2a94f; }
        .ad-shell.dark .ad-status-rejected { background: #3a1a19; color: #e67d7a; }
        
        .ad-two-column { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; }
        .ad-two-column .ad-panel { min-width: 0; margin-bottom: 0; }
        
        .ad-queue-list { display: grid; gap: 12px; }
        .ad-queue-item { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px; padding: 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: background 0.15s; }
        .ad-queue-item:hover { background: var(--surface-alt); }
        .ad-queue-item strong { font-size: 13px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
        .ad-queue-item span:last-child { font-size: 11px; color: var(--muted); }
        
        .ad-profile-hero { display: flex; align-items: center; gap: 20px; padding: 24px; margin-bottom: 24px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
        .ad-profile-hero-copy { flex: 1; min-width: 0; }
        .ad-avatar-large { width: 64px; height: 64px; font-size: 22px; }
        .ad-profile-hero h2 { margin: 4px 0; font-size: 22px; color: var(--ink); }
        .ad-profile-hero p { margin: 0; color: var(--muted); font-size: 13px; }
        .ad-profile-hero-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
        
        .ad-alert { padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
        .ad-alert p { line-height: 1.6; margin: 4px 0 0; }
        .ad-alert-error { color: #c0392b; background: #fdedec; border: 1px solid #f5b7b1; }
        .ad-alert-success { color: #27ae60; background: #eafaf1; border: 1px solid #abebc6; }
        .ad-shell.dark .ad-alert-error { color: #e67d7a; background: #2d1817; border-color: #4a2827; }
        .ad-shell.dark .ad-alert-success { color: #4dc497; background: #132b20; border-color: #1e4534; }
        
        @media(max-width: 1200px) { .ad-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ad-chart-grid, .ad-two-column { grid-template-columns: 1fr; } .ad-content { padding: 24px; } }
        @media(max-width: 768px) {
          .ad-shell { flex-direction: column; } .ad-sidebar { width: 100%; height: auto; min-height: 0; position: static; padding: 16px; border-right: none; border-bottom: 1px solid var(--border); }
          .ad-brand { padding-bottom: 20px; } .ad-nav { display: flex; overflow-x: auto; gap: 8px; padding-bottom: 8px; }
          .ad-nav-button { width: auto; white-space: nowrap; min-width: max-content; } .ad-nav-label, .ad-nav-separator { display: none; }
          .ad-topbar { padding: 16px; flex-wrap: wrap; } .ad-breadcrumb { display: none; }
          .ad-search { order: 3; width: 100%; max-width: none; margin-top: 12px; }
          .ad-user-chip { margin-left: auto; border-left: none; } .ad-signout-btn { display: none; }
          .ad-stats-grid { grid-template-columns: 1fr; } .ad-panel { padding: 20px; }
        }
      `}</style>

      <aside className="ad-sidebar">
        <div className="ad-brand">
          <div className="ad-brand-mark">K</div>
          <div>
            <strong>Katiba News</strong>
            <small>AUTHOR WORKSPACE</small>
          </div>
        </div>

        <div className="ad-nav-label">WORKSPACE</div>
        <nav className="ad-nav" aria-label="Author dashboard navigation">
          {navItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.id === 'articles' && (
                <a
                  className="ad-nav-button"
                  href="/news/dashboard/writer"
                  title="Create and manage news stories"
                  style={{ textDecoration: 'none' }}
                >
                  <span className="ad-nav-icon" aria-hidden="true"><NavigationIcon id="news" /></span>
                  <span>News Author</span>
                </a>
              )}
              {index === 7 && <div className="ad-nav-separator" />}
              <button
                type="button"
                className={`ad-nav-button ${tab === item.id ? 'active' : ''}`}
                onClick={() => changeTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                title={item.description}
              >
                <span className="ad-nav-icon" aria-hidden="true"><NavigationIcon id={item.id} /></span>
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
          <button type="button" className="ad-nav-button ad-logout" onClick={logout}>
            <span className="ad-nav-icon" aria-hidden="true"><NavigationIcon id="logout" /></span>
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <main className="ad-main">
        <header className="ad-topbar">
          <div className="ad-breadcrumb">
            Katiba News / <span>{currentNavItem?.label || 'Overview'}</span>
          </div>

          <label className="ad-search">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search your news, headlines, or topics..."
              aria-label="Search articles and blogs"
            />
            <span className="ad-search-icon" aria-hidden="true">⌕</span>
          </label>

          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

          <div className="ad-user-chip">
            <ProfilePhoto initials={initials || 'A'} />
            <div>
              <div className="ad-user-name">{authorName.split(' ')[0] || 'Author'}</div>
              <span className="ad-user-role">{session.role || 'Author'}</span>
            </div>
          </div>
          
          <button className="ad-signout-btn" onClick={logout}>Sign out</button>
        </header>

        <div className="ad-content" onClickCapture={handleDashboardBackCapture}>
          {searchQuery.trim() ? (
            <section className="ad-panel">
              <div className="ad-page-heading">
                <div>
                  <span className="ad-eyebrow">SEARCH RESULTS</span>
                  <h1>Search your content</h1>
                  <p>Matching articles and blogs returned by your APIs.</p>
                </div>
                <button className="ad-button ad-button-light" onClick={() => setSearchQuery('')}>
                  Clear search
                </button>
              </div>

              {loading ? (
                <div className="ad-state">
                  <span className="ad-spinner" />
                  <p>Searching your content…</p>
                </div>
              ) : (filteredArticles.length === 0 && filteredBlogs.length === 0) ? (
                <div className="ad-empty compact">
                  <p>No articles or blogs match your search.</p>
                </div>
              ) : (
                <>
                  <h3 style={{color: 'var(--ink)'}}>Articles ({filteredArticles.length})</h3>
                  {filteredArticles.length === 0 ? (
                    <p className="ad-muted">No matching articles.</p>
                  ) : (
                    <div className="ad-card-grid">
                      {filteredArticles.map((record) => (
                         <DashboardCard key={`search-article-${record.id}`} record={record} type="Article" />
                      ))}
                    </div>
                  )}

                  <h3 style={{ marginTop: 26, color: 'var(--ink)' }}>Blogs ({filteredBlogs.length})</h3>
                  {filteredBlogs.length === 0 ? (
                    <p className="ad-muted">No matching blogs.</p>
                  ) : (
                    <div className="ad-card-grid">
                      {filteredBlogs.map((record) => (
                         <DashboardCard key={`search-blog-${record.id}`} record={record} type="Blog" />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  )
}

export { AuthorDashboard }
export default AuthorDashboard
