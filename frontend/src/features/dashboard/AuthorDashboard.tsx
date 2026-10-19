import { sessionFetch } from '../../auth/session'
import WorkspaceTools from './WorkspaceTools'
import { signOut } from '../../auth/session'
import AuthorSettings from './AuthorSettings'
import { DashboardLayout, ThemeToggle } from '../../dashboard'
import './author-workspace.css'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArticleEditor } from '../articles/components/ArticleEditor'
import { BlogView } from '../blogs/components/BlogView'

type Tab =
  | 'dashboard'
  | 'articles'
  | 'blogs'
  | 'news'
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
  { id: 'news', label: 'News', icon: '▧', description: 'News workspace' },
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
    fields: [
      'professional_title',
      'preferred_byline',
      'organisation',
      'location',
      'phone_number',
      'email',
      'biography',
    ],
  },
  {
    title: 'Experience and education',
    fields: [
      'years_of_experience',
      'highest_education',
      'journalism_training',
      'previous_media_experience',
      'writing_experience',
    ],
  },
  {
    title: 'Portfolio and professional links',
    fields: ['portfolio_url', 'linkedin_url', 'published_work'],
  },
  {
    title: 'Expertise and reporting',
    fields: [
      'areas_of_expertise',
      'primary_expertise',
      'secondary_expertise',
      'reporting_beats',
      'content_types',
      'languages',
      'geographic_coverage',
      'topics_of_interest',
    ],
  },
  {
    title: 'Journalism practice',
    fields: [
      'investigative_experience',
      'fact_checking_experience',
      'source_verification_experience',
      'motivation_to_join',
      'conflicts_of_interest',
      'additional_information',
    ],
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
  'biography',
  'published_work',
  'journalism_training',
  'previous_media_experience',
  'writing_experience',
  'areas_of_expertise',
  'primary_expertise',
  'secondary_expertise',
  'reporting_beats',
  'content_types',
  'languages',
  'geographic_coverage',
  'topics_of_interest',
  'investigative_experience',
  'fact_checking_experience',
  'source_verification_experience',
  'motivation_to_join',
  'conflicts_of_interest',
  'additional_information',
])

function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem('katibaUserSession')
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<Session>

    if (
      typeof parsed.access !== 'string' ||
      !parsed.access ||
      typeof parsed.username !== 'string'
    ) {
      return null
    }

    return {
      username: parsed.username,
      role: parsed.role || 'Author',
      access: parsed.access,
    }
  } catch {
    return null
  }
}

function getTabFromUrl(): Tab {
  const segment = window.location.pathname.replace(/\/+$/, '').split('/').pop()
  const requested = new URLSearchParams(window.location.search).get('tab') || (segment === 'article' ? 'articles' : segment)
  return requested && validTabs.has(requested as Tab)
    ? (requested as Tab)
    : 'dashboard'
}

function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]

  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { results?: unknown[] }).results)
  ) {
    return (data as { results: T[] }).results
  }

  return []
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function getErrorMessage(data: unknown, fallback: string): string {
  const object = asObject(data)

  if (typeof object.detail === 'string') return object.detail
  if (typeof object.message === 'string') return object.message

  const firstError = Object.values(object).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string',
  )

  if (Array.isArray(firstError)) return String(firstError[0])
  return fallback
}

function displayValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || 'Not provided'
  }

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

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value?: string): string {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeStatus(status?: string): string {
  return (status || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function getStatusLabel(status?: string): string {
  const normalized = normalizeStatus(status)

  if (normalized === 'under_review' || normalized === 'in_review') {
    return 'Under review'
  }

  if (normalized === 'pending_review') return 'Pending review'
  if (normalized === 'unknown') return 'Not provided'

  return normalized
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isPublished(record: ContentRecord): boolean {
  return normalizeStatus(record.status) === 'published'
}

function isDraft(record: ContentRecord): boolean {
  return normalizeStatus(record.status) === 'draft'
}

function isUnderReview(record: ContentRecord): boolean {
  return ['under_review', 'in_review', 'pending_review'].includes(
    normalizeStatus(record.status),
  )
}

function getRecordDate(record: ContentRecord): string | undefined {
  return record.published_at || record.created_at || record.updated_at
}

function getCreatedDate(record: ContentRecord): string | undefined {
  return record.created_at || record.updated_at
}

function getDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getLastSevenDays(): ChartPoint[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))

    return {
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      value: 0,
    }
  })
}

function getLastTwelveMonths(): ChartPoint[] {
  const today = new Date()

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 11 + index, 1)

    return {
      label: date.toLocaleDateString('en-GB', { month: 'short' }),
      value: 0,
      secondary: 0,
    }
  })
}

function getRecordCategory(record: ContentRecord): string {
  const category =
    record.category_name ||
    record.category ||
    (record as Record<string, unknown>).category_title

  return typeof category === 'string' && category.trim()
    ? category.trim()
    : 'Uncategorized'
}

function countByStatus(records: ContentRecord[]) {
  const counts = new Map<string, number>()

  records.forEach((record) => {
    const key = normalizeStatus(record.status)
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([key, value]) => ({
      label: getStatusLabel(key),
      key,
      value,
      color: STATUS_COLORS[key] || STATUS_COLORS.other,
    }))
    .sort((a, b) => b.value - a.value)
}

function getCategoryCounts(records: ContentRecord[]) {
  const counts = new Map<string, number>()

  records.forEach((record) => {
    const category = getRecordCategory(record)
    counts.set(category, (counts.get(category) || 0) + 1)
  })

  const colors = [
    '#159b76',
    '#7770d6',
    '#3984d6',
    '#e6a23c',
    '#dc6464',
    '#2097a6',
    '#8b6dc1',
    '#82958c',
  ]

  return Array.from(counts.entries())
    .map(([label, value], index) => ({
      label,
      value,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value)
}

function StatCard({
  label,
  value,
  icon,
  detail,
  accent = 'green',
}: {
  label: string
  value: string | number
  icon: string
  detail: string
  accent?: string
}) {
  return (
    <article className={`ad-stat ad-stat-${accent}`}>
      <div className="ad-stat-top">
        <span className="ad-stat-label">{label}</span>
        <span className="ad-stat-icon" aria-hidden="true">{icon}</span>
      </div>
      <strong className="ad-stat-value">{value}</strong>
      <div className="ad-stat-foot">{detail}</div>
    </article>
  )
}

function PanelHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
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

function LineChart({
  title,
  subtitle,
  labels,
  series,
  legend,
}: {
  title: string
  subtitle: string
  labels: string[]
  series: { name: string; values: number[]; color: string }[]
  legend?: boolean
}) {
  const width = 650
  const height = 255
  const left = 38
  const right = 20
  const top = 24
  const bottom = 36
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values))
  const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4)

  const pointsFor = (values: number[]) =>
    values.map((value, index) => ({
      x: left + (index / Math.max(1, labels.length - 1)) * plotWidth,
      y: top + plotHeight - (value / yMax) * plotHeight,
      value,
    }))

  return (
    <section className="ad-chart-card">
      <div className="ad-chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="ad-chart-scroll">
        <svg
          className="ad-svg-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        >
          {[0, 1, 2, 3, 4].map((step) => {
            const value = (yMax / 4) * step
            const y = top + plotHeight - (step / 4) * plotHeight

            return (
              <g key={step}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke="#e8efeb"
                  strokeDasharray="4 5"
                />
                <text
                  x={left - 9}
                  y={y + 4}
                  textAnchor="end"
                  fill="#8a9892"
                  fontSize="10"
                >
                  {Math.round(value)}
                </text>
              </g>
            )
          })}

          {series.map((item) => {
            const points = pointsFor(item.values)
            const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

            return (
              <g key={item.name}>
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((point, index) => (
                  <g key={`${item.name}-${index}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#fff"
                      stroke={item.color}
                      strokeWidth="2.5"
                    />
                    <title>{`${labels[index]}: ${point.value} ${item.name}`}</title>
                  </g>
                ))}
              </g>
            )
          })}

          {labels.map((label, index) => {
            const x = left + (index / Math.max(1, labels.length - 1)) * plotWidth
            return (
              <text
                key={`${label}-${index}`}
                x={x}
                y={height - 12}
                textAnchor="middle"
                fill="#7f8d87"
                fontSize="10"
              >
                {label}
              </text>
            )
          })}
        </svg>
      </div>

      {legend !== false && (
        <div className="ad-chart-legend">
          {series.map((item) => (
            <span key={item.name}>
              <i style={{ background: item.color }} />
              {item.name}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function BarChart({
  title,
  subtitle,
  labels,
  series,
}: {
  title: string
  subtitle: string
  labels: string[]
  series: { name: string; values: number[]; color: string }[]
}) {
  const width = 650
  const height = 255
  const left = 38
  const right = 16
  const top = 25
  const bottom = 39
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values))
  const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4)
  const groupWidth = plotWidth / Math.max(1, labels.length)
  const groupGap = groupWidth * 0.12
  const barGap = 3
  const barWidth = Math.max(
    3,
    (groupWidth - groupGap - barGap * Math.max(0, series.length - 1)) /
      Math.max(1, series.length),
  )

  return (
    <section className="ad-chart-card">
      <div className="ad-chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="ad-chart-scroll">
        <svg
          className="ad-svg-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        >
          {[0, 1, 2, 3, 4].map((step) => {
            const value = (yMax / 4) * step
            const y = top + plotHeight - (step / 4) * plotHeight

            return (
              <g key={step}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke="#e8efeb"
                  strokeDasharray="4 5"
                />
                <text
                  x={left - 9}
                  y={y + 4}
                  textAnchor="end"
                  fill="#8a9892"
                  fontSize="10"
                >
                  {Math.round(value)}
                </text>
              </g>
            )
          })}

          {labels.map((label, index) => {
            const groupStart = left + index * groupWidth + groupGap / 2

            return (
              <g key={`${label}-${index}`}>
                {series.map((item, seriesIndex) => {
                  const value = item.values[index] || 0
                  const barHeight = (value / yMax) * plotHeight
                  const x = groupStart + seriesIndex * (barWidth + barGap)
                  const y = top + plotHeight - barHeight

                  return (
                    <g key={item.name}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(0, barHeight)}
                        rx="3"
                        fill={item.color}
                      />
                      <title>{`${label}: ${value} ${item.name}`}</title>
                    </g>
                  )
                })}

                <text
                  x={left + index * groupWidth + groupWidth / 2}
                  y={height - 12}
                  textAnchor="middle"
                  fill="#7f8d87"
                  fontSize="10"
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="ad-chart-legend">
        {series.map((item) => (
          <span key={item.name}>
            <i style={{ background: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
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

  return (
    <section className="ad-chart-card">
      <div className="ad-chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="ad-chart-empty">
          <div className="ad-pie-empty">0</div>
          <p>No records available for this chart.</p>
        </div>
      ) : (
        <div className="ad-pie-layout">
          <div className="ad-pie-graphic">
            <svg viewBox="0 0 190 190" role="img" aria-label={title}>
              <circle
                cx="95"
                cy="95"
                r={radius}
                fill="none"
                stroke="#edf2ef"
                strokeWidth="25"
              />
              <g transform="rotate(-90 95 95)">
                {data.filter((item) => item.value > 0).map((item, index, visible) => {
                  const length = (item.value / total) * circumference
                  const offset = visible.slice(0, index).reduce((sum, segment) => sum + (segment.value / total) * circumference, 0)

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
              <text
                x="95"
                y="90"
                textAnchor="middle"
                fill="#1d332c"
                fontSize="27"
                fontWeight="800"
              >
                {total}
              </text>
              <text
                x="95"
                y="109"
                textAnchor="middle"
                fill="#7c8b84"
                fontSize="10"
              >
                TOTAL
              </text>
            </svg>
          </div>

          <div className="ad-pie-legend">
            {data.map((item) => (
              <div className="ad-pie-legend-row" key={item.label}>
                <span className="ad-pie-legend-name">
                  <i style={{ background: item.color }} />
                  <span>{item.label}</span>
                </span>
                <strong>{item.value}</strong>
                <span className="ad-pie-percent">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function CategoryChart({
  title,
  subtitle,
  records,
}: {
  title: string
  subtitle: string
  records: ContentRecord[]
}) {
  const categories = getCategoryCounts(records)
  const total = records.length

  return (
    <section className="ad-chart-card">
      <div className="ad-chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="ad-chart-total">
          <strong>{total}</strong>
          <span>Records</span>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="ad-chart-empty">
          <p>No content records available.</p>
        </div>
      ) : (
        <div className="ad-category-list">
          {categories.slice(0, 8).map((category) => {
            const percentage = total ? (category.value / total) * 100 : 0

            return (
              <div className="ad-category-row" key={category.label}>
                <div className="ad-category-top">
                  <span>
                    <i style={{ background: category.color }} />
                    {category.label}
                  </span>
                  <strong>{category.value}</strong>
                </div>
                <div className="ad-progress-track">
                  <div
                    className="ad-progress-fill"
                    style={{
                      width: `${percentage}%`,
                      background: category.color,
                    }}
                  />
                </div>
                <span className="ad-category-percent">{percentage.toFixed(0)}%</span>
              </div>
            )
          })}
          {categories.length > 8 && (
            <p className="ad-muted">
              Showing the eight most common categories out of {categories.length}.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function AuthorDashboard() {
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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

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

      const response = await sessionFetch(url, { ...options, headers })

      if (response.status === 401) {
        handleUnauthorized()
        throw new Error('Your session has expired. Please sign in again.')
      }

      if (response.status === 403) {
        throw new Error('You do not have permission to access this resource.')
      }

      return response
    },
    [handleUnauthorized],
  )

  const changeTab = useCallback((nextTab: Tab) => {
    if (nextTab === 'news') {
      window.location.assign('/news/dashboard')
      return
    }

    setTab(nextTab)
    setSearchQuery('')
    setError('')

    const url = new URL(window.location.href)
    url.pathname = DASHBOARD_PATH

    if (nextTab === 'dashboard') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', nextTab)
    }

    window.history.pushState(
      { tab: nextTab },
      '',
      `${url.pathname}${url.search}`,
    )
  }, [])

  const handleDashboardBackCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const control = target.closest('button, a, [role="button"]')
      if (!control) return

      const label = (control.textContent || '')
        .replace(/[←→↩↪]/g, '')
        .trim()
        .toLowerCase()

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

    if (!response.ok) {
      throw new Error(`Could not load account details (HTTP ${response.status}).`)
    }

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

        if (!articlesResponse.ok) {
          throw new Error(`Could not load articles (HTTP ${articlesResponse.status}).`)
        }

        if (!blogsResponse.ok) {
          throw new Error(`Could not load blogs (HTTP ${blogsResponse.status}).`)
        }

        const [articlesData, blogsData] = await Promise.all([
          articlesResponse.json(),
          blogsResponse.json(),
        ])

        setArticles(extractList<Article>(articlesData))
        setBlogs(extractList<Blog>(blogsData))
        setLastUpdated(new Date().toISOString())

        void fetchAccount().catch((accountError: unknown) => {
          console.warn('Account details could not be refreshed:', accountError)
        })
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Could not load dashboard information.',
        )
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

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Could not load your author profile (HTTP ${response.status}).`,
          ),
        )
      }

      const object = asObject(data)
      const savedProfile = asObject(
        object.profile ?? object.author_profile ?? object.data ?? object,
      ) as AuthorProfile

      setProfile(savedProfile)

      if (!editingProfile) {
        setProfileDraft({ ...savedProfile })
      }
    } catch (profileFetchError) {
      setProfileError(
        profileFetchError instanceof Error
          ? profileFetchError.message
          : 'Could not load your author profile.',
      )
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

  const allContent = useMemo<ContentRecord[]>(
    () => [...articles, ...blogs],
    [articles, blogs],
  )

  const publishedArticles = useMemo(
    () => articles.filter(isPublished).length,
    [articles],
  )
  const draftArticles = useMemo(
    () => articles.filter(isDraft).length,
    [articles],
  )
  const reviewArticles = useMemo(
    () => articles.filter(isUnderReview).length,
    [articles],
  )

  const blogsWithStatus = useMemo(
    () => blogs.filter((blog) => Boolean(blog.status?.trim())),
    [blogs],
  )
  const publishedBlogs = useMemo(
    () => blogs.filter(isPublished).length,
    [blogs],
  )
  const draftBlogs = useMemo(
    () => blogs.filter(isDraft).length,
    [blogs],
  )
  const reviewBlogs = useMemo(
    () => blogs.filter(isUnderReview).length,
    [blogs],
  )

  const totalBlogLikes = useMemo(
    () => blogs.reduce((sum, blog) => sum + (Number(blog.likes_count) || 0), 0),
    [blogs],
  )
  const totalArticleViews = useMemo(
    () => articles.reduce((sum, article) => sum + (Number(article.views_count) || 0), 0),
    [articles],
  )
  const totalBlogViews = useMemo(
    () => blogs.reduce((sum, blog) => sum + (Number(blog.views_count) || 0), 0),
    [blogs],
  )

  const authorName =
    profile?.preferred_byline ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    [account?.first_name, account?.last_name]
      .filter((part): part is string => typeof part === 'string' && Boolean(part))
      .join(' ') ||
    (typeof account?.username === 'string' ? account.username : '') ||
    session?.username ||
    'Author'

  const initials = authorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  const filteredArticles = useMemo(
    () =>
      articles.filter((article) =>
        (article.title || '').toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [articles, searchQuery],
  )

  const filteredBlogs = useMemo(
    () =>
      blogs.filter((blog) =>
        (blog.title || '').toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [blogs, searchQuery],
  )

  const weeklyData = useMemo(() => {
    const days = getLastSevenDays()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dates = days.map((_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      return getDateKey(date)
    })

    return {
      labels: days.map((day) => day.label),
      articleValues: dates.map((key) =>
        articles.filter((article) => {
          const value = getCreatedDate(article)
          return value && getDateKey(new Date(value)) === key
        }).length,
      ),
      blogValues: dates.map((key) =>
        blogs.filter((blog) => {
          const value = getCreatedDate(blog)
          return value && getDateKey(new Date(value)) === key
        }).length,
      ),
    }
  }, [articles, blogs])

  const monthlyData = useMemo(() => {
    const months = getLastTwelveMonths()
    const now = new Date()
    const keys = months.map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    })

    return {
      labels: months.map((month) => month.label),
      articleValues: keys.map((key) =>
        articles.filter((article) => {
          const value = getCreatedDate(article)
          if (!value) return false
          const date = new Date(value)
          return !Number.isNaN(date.getTime()) &&
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === key
        }).length,
      ),
      blogValues: keys.map((key) =>
        blogs.filter((blog) => {
          const value = getCreatedDate(blog)
          if (!value) return false
          const date = new Date(value)
          return !Number.isNaN(date.getTime()) &&
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === key
        }).length,
      ),
    }
  }, [articles, blogs])

  const recentArticles = useMemo(
    () =>
      [...articles]
        .sort(
          (a, b) =>
            new Date(getRecordDate(b) || 0).getTime() -
            new Date(getRecordDate(a) || 0).getTime(),
        )
        .slice(0, 6),
    [articles],
  )

  const recentBlogs = useMemo(
    () =>
      [...blogs]
        .sort(
          (a, b) =>
            new Date(getRecordDate(b) || 0).getTime() -
            new Date(getRecordDate(a) || 0).getTime(),
        )
        .slice(0, 5),
    [blogs],
  )

  const recentActivity = useMemo(() => {
    const articleItems = articles.map((article) => ({
      id: `article-${article.id}`,
      title: article.title || 'Untitled article',
      type: 'Article',
      date: getRecordDate(article) || '',
      detail: getStatusLabel(article.status),
    }))

    const blogItems = blogs.map((blog) => ({
      id: `blog-${blog.id}`,
      title: blog.title || 'Untitled blog',
      type: 'Blog',
      date: getRecordDate(blog) || '',
      detail: blog.status
        ? getStatusLabel(blog.status)
        : `${blog.likes_count ?? 0} likes`,
    }))

    return [...articleItems, ...blogItems]
      .filter((item) => item.date && !Number.isNaN(new Date(item.date).getTime()))
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 8)
  }, [articles, blogs])

  const startProfileEditing = useCallback(() => {
    setProfileDraft({ ...(profile || {}) })
    setProfileSaveMessage('')
    setProfileSaveError('')
    setEditingProfile(true)
  }, [profile])

  const cancelProfileEditing = useCallback(() => {
    setProfileDraft({ ...(profile || {}) })
    setEditingProfile(false)
    setProfileSaveError('')
    setProfileSaveMessage('')
  }, [profile])

  const updateProfileField = useCallback(
    (field: keyof AuthorProfile, value: string) => {
      setProfileDraft((current) => ({ ...current, [field]: value }))
      setProfileSaveError('')
      setProfileSaveMessage('')
    },
    [],
  )

  const saveProfileChanges = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (profileSaving) return

      setProfileSaving(true)
      setProfileSaveError('')
      setProfileSaveMessage('')

      try {
        const response = await authenticatedFetch(PROFILE_ENDPOINT, {
          method: 'PUT',
          body: JSON.stringify(profileDraft),
        })
        const responseData: unknown = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              responseData,
              `Could not save your profile (HTTP ${response.status}).`,
            ),
          )
        }

        const responseObject = asObject(responseData)
        const returnedProfile = asObject(
          responseObject.profile ??
            responseObject.author_profile ??
            responseObject.data ??
            responseObject,
        )

        const savedProfile = (
          Object.keys(returnedProfile).length > 0
            ? returnedProfile
            : profileDraft
        ) as AuthorProfile

        setProfile(savedProfile)
        setProfileDraft({ ...savedProfile })
        setEditingProfile(false)
        setProfileSaveMessage('Your author profile has been saved successfully.')
      } catch (saveError) {
        setProfileSaveError(
          saveError instanceof Error
            ? saveError.message
            : 'Could not save your profile.',
        )
      } finally {
        setProfileSaving(false)
      }
    },
    [authenticatedFetch, profileDraft, profileSaving],
  )

  function renderProfile() {
    if (profileLoading) {
      return (
        <div className="ad-state">
          <span className="ad-spinner" />
          <p>Loading your saved author profile…</p>
        </div>
      )
    }

    if (profileError) {
      return (
        <div className="ad-alert ad-alert-error">
          <strong>Unable to load profile</strong>
          <p>{profileError}</p>
          <button className="ad-button" onClick={() => void fetchProfile()}>
            Try again
          </button>
        </div>
      )
    }

    if (!profile) {
      return (
        <div className="ad-empty">
          <div className="ad-empty-icon">♙</div>
          <h3>No saved profile was returned</h3>
          <p>The server did not return an author profile.</p>
          <button className="ad-button" onClick={() => void fetchProfile()}>
            Refresh profile
          </button>
        </div>
      )
    }

    return (
      <div className="ad-profile-content">
        {profileSaveMessage && (
          <div className="ad-alert ad-alert-success" role="status">
            {profileSaveMessage}
          </div>
        )}
        {profileSaveError && (
          <div className="ad-alert ad-alert-error" role="alert">
            {profileSaveError}
          </div>
        )}

        <div className="ad-profile-hero">
          <div className="ad-avatar ad-avatar-large">{initials || 'A'}</div>
          <div className="ad-profile-hero-copy">
            <span className="ad-eyebrow">AUTHOR PROFILE</span>
            <h2>{authorName}</h2>
            <p>
              {displayValue(profile.professional_title)} · {displayValue(profile.location)}
            </p>
          </div>
          <div className="ad-profile-hero-actions">
            <button className="ad-button" onClick={startProfileEditing}>
              ✎ Edit profile
            </button>
            <button
              className="ad-button ad-button-light"
              onClick={() => void fetchProfile()}
              disabled={profileSaving}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {editingProfile ? (
          <form className="ad-profile-edit-form" onSubmit={saveProfileChanges}>
            {PROFILE_GROUPS.map((group) => (
              <section className="ad-profile-section" key={group.title}>
                <h3>{group.title}</h3>
                <div className="ad-profile-grid">
                  {group.fields.map((field) => {
                    const value = profileDraft[field]
                    const inputValue =
                      typeof value === 'string' || typeof value === 'number'
                        ? String(value)
                        : ''
                    const label = PROFILE_LABELS[field] || String(field)
                    const inputType =
                      field === 'email'
                        ? 'email'
                        : field === 'phone_number'
                          ? 'tel'
                          : field === 'portfolio_url' || field === 'linkedin_url'
                            ? 'url'
                            : field === 'years_of_experience'
                              ? 'number'
                              : 'text'

                    return (
                      <label className="ad-profile-edit-field" key={field}>
                        <span className="ad-profile-edit-label">{label}</span>
                        {LONG_TEXT_FIELDS.has(field) ? (
                          <textarea
                            className="ad-profile-input ad-profile-textarea"
                            value={inputValue}
                            onChange={(event) =>
                              updateProfileField(field, event.target.value)
                            }
                            placeholder={`Enter ${label.toLowerCase()}`}
                            rows={4}
                          />
                        ) : (
                          <input
                            className="ad-profile-input"
                            type={inputType}
                            min={field === 'years_of_experience' ? 0 : undefined}
                            value={inputValue}
                            onChange={(event) =>
                              updateProfileField(field, event.target.value)
                            }
                            placeholder={`Enter ${label.toLowerCase()}`}
                          />
                        )}
                      </label>
                    )
                  })}
                </div>
              </section>
            ))}

            <div className="ad-profile-edit-actions">
              <button
                type="button"
                className="ad-button ad-button-light"
                onClick={cancelProfileEditing}
                disabled={profileSaving}
              >
                Cancel
              </button>
              <button type="submit" className="ad-button" disabled={profileSaving}>
                {profileSaving ? 'Saving changes…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          PROFILE_GROUPS.map((group) => {
            const fields = group.fields.filter((field) => {
              const value = profile[field]
              return value !== undefined && value !== null && value !== ''
            })

            return (
              <section className="ad-profile-section" key={group.title}>
                <h3>{group.title}</h3>
                {fields.length === 0 ? (
                  <p className="ad-muted">No saved information in this section.</p>
                ) : (
                  <div className="ad-profile-grid">
                    {fields.map((field) => {
                      const value = profile[field]
                      const label = PROFILE_LABELS[field] || String(field)

                      return (
                        <div className="ad-profile-field" key={field}>
                          <span>{label}</span>
                          {typeof value === 'string' && /^https?:\/\//i.test(value) ? (
                            <a href={value} target="_blank" rel="noreferrer">
                              {value}
                            </a>
                          ) : (
                            <p>{displayValue(value)}</p>
                          )}
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

  function renderRecentArticles() {
    if (loading) return <div className="ad-inline-loading">Loading article records…</div>

    if (recentArticles.length === 0) {
      return (
        <div className="ad-empty compact">
          <h3>No articles returned</h3>
          <p>Create an article or check your API permissions.</p>
          <button className="ad-button" onClick={() => changeTab('articles')}>
            Create article
          </button>
        </div>
      )
    }

    return (
      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentArticles.map((article) => (
              <tr key={article.id}>
                <td>
                  <strong>{article.title || 'Untitled article'}</strong>
                  <p>{(article.content || '').replace(/<[^>]*>/g, ' ').slice(0, 100)}</p>
                </td>
                <td>{getRecordCategory(article)}</td>
                <td>
                  <span className={`ad-status ad-status-${normalizeStatus(article.status)}`}>
                    {getStatusLabel(article.status)}
                  </span>
                </td>
                <td>{formatDate(getRecordDate(article))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderRecentBlogs() {
    if (loading) return <div className="ad-inline-loading">Loading blog records…</div>

    if (recentBlogs.length === 0) {
      return (
        <div className="ad-empty compact">
          <h3>No blogs returned</h3>
          <p>The blogs API did not return any records.</p>
        </div>
      )
    }

    return (
      <div className="ad-blog-list">
        {recentBlogs.map((blog) => (
          <article className="ad-blog-row" key={blog.id}>
            <div className="ad-blog-icon">✎</div>
            <div className="ad-blog-main">
              <strong>{blog.title || 'Untitled blog'}</strong>
              <p>
                {blog.author_username || 'Author'} · {formatDate(getRecordDate(blog))}
                {' · '}{getRecordCategory(blog)}
              </p>
            </div>
            <span className="ad-blog-likes">♡ {blog.likes_count ?? 0}</span>
          </article>
        ))}
      </div>
    )
  }

  function renderDashboard() {
    return (
      <>
        <section className="ad-welcome">
          <div>
            <span className="ad-eyebrow">KATIBA NEWS · AUTHOR WORKSPACE</span>
            <h1>Welcome back, {authorName.split(' ')[0]}.</h1>
            <p>Your content, publishing activity, and performance at a glance.</p>
            {lastUpdated && (
              <span className="ad-last-updated">
                <i /> Last refreshed {formatDateTime(lastUpdated)}
              </span>
            )}
          </div>
          <div className="ad-welcome-actions">
            <button
              className="ad-button ad-button-light"
              onClick={() => void fetchContent(true)}
              disabled={refreshing}
            >
              <span className={refreshing ? 'ad-refreshing' : ''}>↻</span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="ad-button" onClick={() => changeTab('articles')}>
              ＋ New article
            </button>
          </div>
        </section>

        {error && (
          <div className="ad-alert ad-alert-error">
            <strong>Dashboard data could not be fully loaded</strong>
            <p>{error}</p>
            <button className="ad-button" onClick={() => void fetchContent(true)}>
              Try again
            </button>
          </div>
        )}

        <section className="ad-stats-grid">
          <StatCard
            label="Total articles"
            value={loading ? '…' : formatNumber(articles.length)}
            icon="▤"
            detail="Article records returned by the API"
            accent="green"
          />
          <StatCard
            label="Total blogs"
            value={loading ? '…' : formatNumber(blogs.length)}
            icon="✎"
            detail="Blog records returned by the API"
            accent="blue"
          />
          <StatCard
            label="Published articles"
            value={loading ? '…' : formatNumber(publishedArticles)}
            icon="✓"
            detail="Articles marked published"
            accent="green"
          />
          <StatCard
            label="Draft articles"
            value={loading ? '…' : formatNumber(draftArticles)}
            icon="◷"
            detail="Articles marked draft"
            accent="purple"
          />
          <StatCard
            label="Under review"
            value={loading ? '…' : formatNumber(reviewArticles)}
            icon="◌"
            detail="Articles awaiting review"
            accent="orange"
          />
          <StatCard
            label="All content"
            value={loading ? '…' : formatNumber(allContent.length)}
            icon="▦"
            detail="Articles and blogs combined"
            accent="blue"
          />
        </section>

        <section className="ad-chart-grid">
          {loading ? (
            <div className="ad-chart-card ad-chart-loading">
              <span className="ad-spinner" />
              <p>Loading weekly publishing data…</p>
            </div>
          ) : (
            <LineChart
              title="Weekly publishing activity"
              subtitle="Content created each day over the last seven days"
              labels={weeklyData.labels}
              series={[
                { name: 'Articles', values: weeklyData.articleValues, color: '#159b76' },
                { name: 'Blogs', values: weeklyData.blogValues, color: '#7770d6' },
              ]}
            />
          )}

          <PieChart
            title="Article status"
            subtitle="Status distribution from returned article records"
            data={countByStatus(articles)}
          />
        </section>

        <section className="ad-chart-grid">
          <BarChart
            title="Monthly publishing"
            subtitle="New article and blog records over the last 12 months"
            labels={monthlyData.labels}
            series={[
              { name: 'Articles', values: monthlyData.articleValues, color: '#159b76' },
              { name: 'Blogs', values: monthlyData.blogValues, color: '#7770d6' },
            ]}
          />

          <PieChart
            title="Blog status"
            subtitle={
              blogsWithStatus.length
                ? `${blogsWithStatus.length} of ${blogs.length} blogs have a status`
                : 'Your current blogs response does not include status values'
            }
            data={countByStatus(blogsWithStatus)}
          />
        </section>

        <section className="ad-stats-grid ad-stats-grid-secondary">
          <StatCard
            label="Published blogs"
            value={loading ? '…' : blogsWithStatus.length ? publishedBlogs : '—'}
            icon="✓"
            detail={blogsWithStatus.length ? 'Blogs marked published' : 'Status not provided by the API'}
          />
          <StatCard
            label="Blog drafts"
            value={loading ? '…' : blogsWithStatus.length ? draftBlogs : '—'}
            icon="✎"
            detail={blogsWithStatus.length ? 'Blogs marked draft' : 'Status not provided by the API'}
            accent="purple"
          />
          <StatCard
            label="Blogs under review"
            value={loading ? '…' : blogsWithStatus.length ? reviewBlogs : '—'}
            icon="◷"
            detail={blogsWithStatus.length ? 'Blogs awaiting review' : 'Status not provided by the API'}
            accent="orange"
          />
          <StatCard
            label="Total blog likes"
            value={loading ? '…' : formatNumber(totalBlogLikes)}
            icon="♡"
            detail="Likes reported by the blogs API"
            accent="purple"
          />
        </section>

        <section className="ad-chart-grid">
          <CategoryChart
            title="Article categories"
            subtitle="Distribution based on category fields returned by the API"
            records={articles}
          />
          <CategoryChart
            title="Blog categories"
            subtitle="Distribution based on category fields returned by the API"
            records={blogs}
          />
        </section>

        <section className="ad-stats-grid ad-stats-grid-secondary">
          <StatCard
            label="Article views"
            value={loading ? '…' : formatNumber(totalArticleViews)}
            icon="◉"
            detail="Only available if the API returns view counts"
            accent="blue"
          />
          <StatCard
            label="Blog views"
            value={loading ? '…' : formatNumber(totalBlogViews)}
            icon="↗"
            detail="Only available if the API returns view counts"
            accent="blue"
          />
          <StatCard
            label="Articles this week"
            value={loading ? '…' : formatNumber(weeklyData.articleValues.reduce((a, b) => a + b, 0))}
            icon="▦"
            detail="Based on article creation dates"
          />
          <StatCard
            label="Blogs this week"
            value={loading ? '…' : formatNumber(weeklyData.blogValues.reduce((a, b) => a + b, 0))}
            icon="▧"
            detail="Based on blog creation dates"
            accent="purple"
          />
        </section>

        <section className="ad-panel">
          <PanelHeading
            eyebrow="YOUR WORK"
            title="Recent articles"
            subtitle="The latest article records returned by your API."
            action={
              <button className="ad-text-button" onClick={() => changeTab('articles')}>
                Open editor →
              </button>
            }
          />
          {renderRecentArticles()}
        </section>

        <section className="ad-two-column">
          <div className="ad-panel">
            <PanelHeading
              eyebrow="BLOG CONTENT"
              title="Recent blogs"
              action={
                <button className="ad-text-button" onClick={() => changeTab('blogs')}>
                  View blogs →
                </button>
              }
            />
            {renderRecentBlogs()}
          </div>

          <div className="ad-panel">
            <PanelHeading
              eyebrow="CONTENT TIMELINE"
              title="Recent activity"
              subtitle="Activity inferred from available content records."
            />
            {loading ? (
              <p className="ad-muted">Loading recent activity…</p>
            ) : recentActivity.length === 0 ? (
              <div className="ad-empty compact">
                <h3>No dated activity available</h3>
                <p>The APIs have not returned records with usable dates.</p>
              </div>
            ) : (
              <div className="ad-activity-list">
                {recentActivity.slice(0, 7).map((activity) => (
                  <div className="ad-activity-row" key={activity.id}>
                    <div className={`ad-activity-marker ${activity.type === 'Blog' ? 'blog-marker' : ''}`}>
                      {activity.type === 'Article' ? '▤' : '✎'}
                    </div>
                    <div className="ad-activity-copy">
                      <strong>{activity.title}</strong>
                      <p>{activity.type} · {activity.detail}</p>
                      <span>{formatDateTime(activity.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="ad-activity-note">
              This is not a complete audit log. It is built from dates and fields
              returned by the article and blog APIs.
            </p>
          </div>
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
          <button
            className="ad-button ad-button-light"
            onClick={() => void fetchContent(true)}
            disabled={refreshing}
          >
            ↻ {refreshing ? 'Refreshing…' : 'Refresh analytics'}
          </button>
        </section>

        {error && (
          <div className="ad-alert ad-alert-error">
            <strong>Analytics could not be fully refreshed</strong>
            <p>{error}</p>
          </div>
        )}

        <section className="ad-stats-grid">
          <StatCard label="Articles" value={loading ? '…' : articles.length} icon="▤" detail="Loaded article records" />
          <StatCard label="Blogs" value={loading ? '…' : blogs.length} icon="✎" detail="Loaded blog records" accent="purple" />
          <StatCard label="Published articles" value={loading ? '…' : publishedArticles} icon="✓" detail="Published article status" />
          <StatCard label="Draft articles" value={loading ? '…' : draftArticles} icon="◷" detail="Draft article status" accent="purple" />
          <StatCard label="Under review" value={loading ? '…' : reviewArticles} icon="◌" detail="Review article status" accent="orange" />
          <StatCard label="Blog likes" value={loading ? '…' : formatNumber(totalBlogLikes)} icon="♡" detail="Backend-reported likes" accent="blue" />
        </section>

        <section className="ad-chart-grid">
          <LineChart
            title="Weekly activity"
            subtitle="Content created each day over the last seven days"
            labels={weeklyData.labels}
            series={[
              { name: 'Articles', values: weeklyData.articleValues, color: '#159b76' },
              { name: 'Blogs', values: weeklyData.blogValues, color: '#7770d6' },
            ]}
          />
          <PieChart
            title="Article status breakdown"
            subtitle="Counts and percentages"
            data={countByStatus(articles)}
          />
        </section>

        <section className="ad-chart-grid">
          <BarChart
            title="Monthly content comparison"
            subtitle="Monthly article and blog creation for the last 12 months"
            labels={monthlyData.labels}
            series={[
              { name: 'Articles', values: monthlyData.articleValues, color: '#159b76' },
              { name: 'Blogs', values: monthlyData.blogValues, color: '#7770d6' },
            ]}
          />
          <PieChart
            title="Blog status breakdown"
            subtitle={
              blogsWithStatus.length
                ? 'Counts from blogs that have a status field'
                : 'No blog status values were returned by the API'
            }
            data={countByStatus(blogsWithStatus)}
          />
        </section>

        <section className="ad-chart-grid">
          <CategoryChart
            title="Article categories"
            subtitle="Content categories returned by the API"
            records={articles}
          />
          <CategoryChart
            title="Blog categories"
            subtitle="Content categories returned by the API"
            records={blogs}
          />
        </section>

        <section className="ad-panel">
          <PanelHeading
            eyebrow="MONTHLY REPORT"
            title="Monthly publishing totals"
            subtitle="Creation counts based on the records currently loaded."
          />
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Articles</th>
                  <th>Blogs</th>
                  <th>Combined total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.labels.map((month, index) => (
                  <tr key={`${month}-${index}`}>
                    <td><strong>{month}</strong></td>
                    <td>{monthlyData.articleValues[index]}</td>
                    <td>{monthlyData.blogValues[index]}</td>
                    <td>
                      <strong>
                        {monthlyData.articleValues[index] + monthlyData.blogValues[index]}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    )
  }

  function renderContent() {
    if (tab === 'dashboard') return renderDashboard()
    if (tab === 'analytics') return renderAnalytics()

    if (tab === 'articles') {
      return (
        <section className="ad-editor-panel">
          <div className="ad-page-heading">
            <div>
              <span className="ad-eyebrow">EDITORIAL WORKSPACE</span>
              <h1>Article editor</h1>
              <p>Create and manage your articles.</p>
            </div>
            <button className="ad-button ad-button-light" onClick={() => changeTab('dashboard')}>
              ← Dashboard
            </button>
          </div>
          <ArticleEditor />
        </section>
      )
    }

    if (tab === 'blogs') {
      return (
        <section className="ad-panel">
          <div className="ad-page-heading">
            <div>
              <span className="ad-eyebrow">COMMUNITY WRITING</span>
              <h1>Blogs feed</h1>
              <p>Explore blog content connected to your account.</p>
            </div>
          </div>
          <BlogView />
        </section>
      )
    }

    if (tab === 'profile') {
      return (
        <section className="ad-panel">
          <div className="ad-page-heading">
            <div>
              <span className="ad-eyebrow">ACCOUNT INFORMATION</span>
              <h1>My profile</h1>
              <p>Your author information retrieved from the server.</p>
            </div>
          </div>
          {renderProfile()}
        </section>
      )
    }

    if (tab === 'settings') return <AuthorSettings />
    if (tab === 'media' || tab === 'comments') return <WorkspaceTools key={tab} tool={tab} />
    return <section className="ad-panel"><h1>News workspace</h1><p>Your news reporting tools use the same author navigation.</p><a href="/news/dashboard">Open News →</a></section>
  }

  if (!session) {
    return (
      <div className="ad-auth-required">
        <h1>Sign in required</h1>
        <p>Please sign in to access your author dashboard.</p>
        <button className="ad-button" onClick={logout}>Go to sign in</button>
      </div>
    )
  }

  const currentNavItem = navItems.find((item) => item.id === tab)

  return (
    <DashboardLayout className="author-workspace" workspace="AUTHOR WORKSPACE"
      items={[...navItems.map(item => ({ id: item.id, label: `${item.icon} ${item.label}` })), { id: 'logout', label: '↪ Sign out' }]}
      activeItem={tab} onNavigate={id => id === 'logout' ? logout() : changeTab(id as Tab)}>


      <div className="ad-main">
        <header className="ad-topbar">
          <div>
            <div className="ad-topbar-title">{currentNavItem?.label || 'Overview'}</div>
            <span className="ad-topbar-subtitle">
              Katiba News · {currentNavItem?.description || 'Author workspace'}
            </span>
          </div>

          <label className="ad-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search articles and blogs…"
              aria-label="Search articles and blogs"
            />
          </label>

          <ThemeToggle />
          <button type="button" className="ad-user-chip" onClick={() => changeTab('profile')} aria-label="View your profile">
            <div className="ad-avatar">{initials || 'A'}</div>
            <div>
              <div className="ad-user-name">{authorName}</div>
              <span className="ad-user-role">{session.role || 'Author'}</span>
            </div>
          </button>
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
              ) : (
                <>
                  <h3>Articles ({filteredArticles.length})</h3>
                  {filteredArticles.length === 0 ? (
                    <p className="ad-muted">No matching articles.</p>
                  ) : (
                    <div className="ad-blog-list">
                      {filteredArticles.map((article) => (
                        <article className="ad-blog-row" key={article.id}>
                          <div className="ad-blog-icon">▤</div>
                          <div className="ad-blog-main">
                            <strong>{article.title || 'Untitled article'}</strong>
                            <p>{getStatusLabel(article.status)} · {formatDate(getRecordDate(article))}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <h3 style={{ marginTop: 26 }}>Blogs ({filteredBlogs.length})</h3>
                  {filteredBlogs.length === 0 ? (
                    <p className="ad-muted">No matching blogs.</p>
                  ) : (
                    <div className="ad-blog-list">
                      {filteredBlogs.map((blog) => (
                        <article className="ad-blog-row" key={blog.id}>
                          <div className="ad-blog-icon">✎</div>
                          <div className="ad-blog-main">
                            <strong>{blog.title || 'Untitled blog'}</strong>
                            <p>{blog.author_username || 'Author'} · {formatDate(getRecordDate(blog))}</p>
                          </div>
                        </article>
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
      </div>
    </DashboardLayout>
  )
}

export { AuthorDashboard }
export default AuthorDashboard
