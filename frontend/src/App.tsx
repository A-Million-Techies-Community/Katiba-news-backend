import { sessionFetch } from './auth/session'
import HomepageStories from './features/public/HomepageStories'
import PublicLayout from './features/public/PublicLayout'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { AuthorDashboard } from './features/dashboard/AuthorDashboard'

type Role = 'Author'
type View = 'home' | 'onboarding' | 'dashboard'

type Session = {
  username: string
  role: Role
  access: string
  refresh?: string
}

type Profile = {
  professional_title: string
  preferred_byline: string
  organisation: string
  location: string
  phone_number: string
  years_of_experience: string
  highest_education: string
  journalism_training: string
  previous_media_experience: string
  portfolio_url: string
  linkedin_url: string
  published_work: string
  primary_expertise: string
  secondary_expertise: string
  reporting_beats: string
  content_types: string
  languages: string
  geographic_coverage: string
  writing_experience: string
  investigative_experience: string
  fact_checking_experience: string
  source_verification_experience: string
  topics_of_interest: string
  motivation_to_join: string
  conflicts_of_interest: string
  editorial_standards_agreement: boolean
  additional_information: string
  areas_of_expertise: string
  biography: string
}

type ApiError = {
  detail?: string
  message?: string
  [key: string]: unknown
}

const emptyProfile: Profile = {
  professional_title: '',
  preferred_byline: '',
  organisation: '',
  location: '',
  phone_number: '',
  years_of_experience: '',
  highest_education: '',
  journalism_training: '',
  previous_media_experience: '',
  portfolio_url: '',
  linkedin_url: '',
  published_work: '',
  primary_expertise: '',
  secondary_expertise: '',
  reporting_beats: '',
  content_types: '',
  languages: '',
  geographic_coverage: '',
  writing_experience: '',
  investigative_experience: '',
  fact_checking_experience: '',
  source_verification_experience: '',
  topics_of_interest: '',
  motivation_to_join: '',
  conflicts_of_interest: '',
  editorial_standards_agreement: false,
  additional_information: '',
  areas_of_expertise: '',
  biography: '',
}

const profileSteps = [
  { title: 'Your author identity', name: 'Identity' },
  { title: 'Your experience', name: 'Experience' },
  { title: 'Your portfolio', name: 'Portfolio' },
  { title: 'Your expertise', name: 'Expertise' },
  { title: 'Your journalism practice', name: 'Practice' },
  { title: 'Your editorial alignment', name: 'Editorial fit' },
]

const profileFields: {
  step: number
  key: keyof Profile
  label: string
  placeholder: string
  multiline?: boolean
  required?: boolean
  type?: string
}[] = [
  {
    step: 1,
    key: 'professional_title',
    label: 'Professional title',
    placeholder: 'Freelance journalist',
    required: true,
  },
  {
    step: 1,
    key: 'organisation',
    label: 'Organisation',
    placeholder: 'Your organisation (optional)',
  },
  {
    step: 1,
    key: 'location',
    label: 'Location',
    placeholder: 'Marsabit, Kenya',
    required: true,
  },
  {
    step: 1,
    key: 'areas_of_expertise',
    label: 'Areas of expertise',
    placeholder: 'Governance, public finance',
    required: true,
  },
  {
    step: 1,
    key: 'biography',
    label: 'Short biography',
    placeholder: 'Tell us about your work and interests.',
    multiline: true,
    required: true,
  },
  {
    step: 1,
    key: 'preferred_byline',
    label: 'Preferred byline name',
    placeholder: 'Your published author name',
  },
  {
    step: 1,
    key: 'phone_number',
    label: 'Phone number',
    placeholder: '+254 7XX XXX XXX',
  },
  {
    step: 2,
    key: 'years_of_experience',
    label: 'Years of experience',
    placeholder: 'e.g. 5 years',
  },
  {
    step: 2,
    key: 'highest_education',
    label: 'Highest education',
    placeholder: "Bachelor's degree in Journalism",
  },
  {
    step: 2,
    key: 'journalism_training',
    label: 'Journalism or media training',
    placeholder: 'Describe your training.',
    multiline: true,
  },
  {
    step: 2,
    key: 'previous_media_experience',
    label: 'Previous media experience',
    placeholder: 'Describe previous newsroom or media work.',
    multiline: true,
  },
  {
    step: 3,
    key: 'portfolio_url',
    label: 'Portfolio / website',
    placeholder: 'https://example.com',
    type: 'url',
  },
  {
    step: 3,
    key: 'linkedin_url',
    label: 'LinkedIn profile',
    placeholder: 'https://linkedin.com/in/yourname',
    type: 'url',
  },
  {
    step: 3,
    key: 'published_work',
    label: 'Published work / writing samples',
    placeholder: 'Paste links to your articles.',
    multiline: true,
  },
  {
    step: 4,
    key: 'primary_expertise',
    label: 'Primary expertise',
    placeholder: 'Governance',
    required: true,
  },
  {
    step: 4,
    key: 'secondary_expertise',
    label: 'Secondary expertise',
    placeholder: 'Public finance, elections',
  },
  {
    step: 4,
    key: 'reporting_beats',
    label: 'Main reporting beats',
    placeholder: 'Politics, business, health',
    required: true,
  },
  {
    step: 4,
    key: 'content_types',
    label: 'Types of content',
    placeholder: 'News, interviews, analysis',
  },
  {
    step: 4,
    key: 'languages',
    label: 'Languages',
    placeholder: 'English, Kiswahili',
    required: true,
  },
  {
    step: 4,
    key: 'geographic_coverage',
    label: 'Geographic coverage',
    placeholder: 'Marsabit, Kenya, East Africa',
  },
  {
    step: 5,
    key: 'writing_experience',
    label: 'Writing experience',
    placeholder: 'Describe your writing style and experience.',
    multiline: true,
    required: true,
  },
  {
    step: 5,
    key: 'investigative_experience',
    label: 'Investigative journalism',
    placeholder: 'Describe your investigative work.',
    multiline: true,
  },
  {
    step: 5,
    key: 'fact_checking_experience',
    label: 'Fact-checking experience',
    placeholder: 'How do you verify facts?',
    multiline: true,
  },
  {
    step: 5,
    key: 'source_verification_experience',
    label: 'Source verification',
    placeholder: 'How do you verify sources and documents?',
    multiline: true,
  },
  {
    step: 6,
    key: 'topics_of_interest',
    label: 'Topics you want to cover',
    placeholder: 'What would you like to report on?',
    multiline: true,
    required: true,
  },
  {
    step: 6,
    key: 'motivation_to_join',
    label: 'Why write for Katiba News?',
    placeholder: 'Tell us about your writing and reporting interests.',
    multiline: true,
    required: true,
  },
  {
    step: 6,
    key: 'conflicts_of_interest',
    label: 'Conflicts of interest',
    placeholder: "Describe any conflicts or write 'None'.",
    multiline: true,
  },
  {
    step: 6,
    key: 'additional_information',
    label: 'Additional information',
    placeholder: 'Anything else the editorial team should know?',
    multiline: true,
  },
]

/* -------------------------------------------------------------------------- */
/* Session and routing helpers                                                */
/* -------------------------------------------------------------------------- */

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem('katibaUserSession')

    if (!raw) return null

    const session = JSON.parse(raw) as Partial<Session>

    if (
      typeof session.username === 'string' &&
      session.username.trim().length > 0 &&
      session.role === 'Author' &&
      typeof session.access === 'string' &&
      session.access.length > 0
    ) {
      return session as Session
    }
  } catch (error) {
    console.error('Could not read saved session:', error)
  }

  return null
}

function pathToView(path: string): View {
  const normalizedPath = path.replace(/\/+$/, '') || '/'

  switch (normalizedPath) {
    case '/':
      return 'home'


    case '/author/complete-profile':
      return 'onboarding'

    case '/author/dashboard':
    case '/author/dashboard/article':
    case '/author/dashboard/articles':
    case '/author/dashboard/blogs':
    case '/author/dashboard/news':
    case '/author/dashboard/analytics':
    case '/author/dashboard/media':
    case '/author/dashboard/comments':
    case '/author/dashboard/settings':
    case '/author/dashboard/profile':
    case '/features/dashboard/AuthorDashboard':
    case '/features/dashboard/authorDashboard':
      return 'dashboard'

    default:
      return 'home'
  }
}

const viewToPath: Record<View, string> = {
  home: '/',
  onboarding: '/author/complete-profile',
  dashboard: '/author/dashboard',
}

/* -------------------------------------------------------------------------- */
/* Main application                                                           */
/* -------------------------------------------------------------------------- */

function App() {
  const [view, setView] = useState<View>(() =>
    pathToView(window.location.pathname),
  )

  const [profile, setProfile] = useState<Profile>(() => ({
    ...emptyProfile,
  }))

  const [onboardingStep, setOnboardingStep] = useState(1)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')

  function navigate(nextView: View, path?: string) {
    const nextPath = path ?? viewToPath[nextView]

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setView(nextView)
    setMessage('')

    if (nextPath === '/author/complete-profile') {
      setOnboardingStep(1)
    }
  }

  /* Browser Back and Forward support. */
  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname
      const nextView = pathToView(path)

      if (
        nextView === 'dashboard' ||
        nextView === 'onboarding'
      ) {
        const session = readSession()

        if (!session) {
          sessionStorage.removeItem('katibaUserSession')


          window.location.replace('/workspace')
          setMessage(
            'Please sign in through your staff workspace.',
          )

          return
        }

      }

      setView(nextView)


      setMessage('')

      if (nextView === 'onboarding') {
        setOnboardingStep(1)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  /* Synchronize protected navigation with the session stored by sign-in. */
  useEffect(() => {
    if (view !== 'dashboard' && view !== 'onboarding') return
    let active = true
    queueMicrotask(() => {
      if (!active) return
      const session = readSession()
      if (!session || session.role !== 'Author') {
        sessionStorage.removeItem('katibaUserSession')

        window.location.replace('/workspace')
        setMessage('Please sign in through your staff workspace.')
      }
    })
    return () => { active = false }
  }, [view])

  async function handleAuthorProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setMessage('')

    const session = readSession()

    if (!session) {
      sessionStorage.removeItem('katibaUserSession')


      setMessage('Your session has expired. Please sign in again.')
      window.location.assign('/workspace')

      return
    }

    if (!profile.editorial_standards_agreement) {
      setMessage(
        'Please agree to the editorial standards before submitting.',
      )

      setOnboardingStep(6)
      return
    }

    setBusy(true)

    try {
      const response = await sessionFetch('/api/users/author/profile/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access}`,
        },
        body: JSON.stringify(profile),
      })

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiError

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem('katibaUserSession')
        window.location.replace('/workspace')
        return
      }

      if (!response.ok) {
        setMessage(
          typeof result.detail === 'string'
            ? result.detail
            : typeof result.message === 'string'
              ? result.message
              : `Could not save your profile: ${JSON.stringify(result)}`,
        )
        return
      }

      setMessage('')
      window.location.assign('/author/dashboard')
    } catch (error) {
      console.error('Profile submission error:', error)

      setMessage(
        'Could not save your profile. Check that Django is running.',
      )
    } finally {
      setBusy(false)
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Sign out                                                                 */
  /* ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------ */
  /* Author dashboard                                                         */
  /* ------------------------------------------------------------------------ */

  if (view === 'dashboard') {
    const session = readSession()

    if (!session) {
      return (
        <main className="author-journey-page">
          <section className="journey-body">
            <h1>Please sign in</h1>

            <p>
              Your session may have expired. Sign in to access
              your author dashboard.
            </p>

            <button
              type="button"
              className="account-submit"
              onClick={() => window.location.assign('/workspace')}
            >
              Sign in
            </button>
          </section>
        </main>
      )
    }

    return <AuthorDashboard />
  }

  /* ------------------------------------------------------------------------ */
  /* Six-step author onboarding                                               */
  /* ------------------------------------------------------------------------ */

  if (view === 'onboarding') {
    const currentFields = profileFields.filter(
      (field) => field.step === onboardingStep,
    )

    function updateProfile(
      key: keyof Profile,
      value: string | boolean,
    ) {
      setProfile((current) => ({
        ...current,
        [key]: value,
      }))
    }

    function goToNextStep() {
      const requiredFields = currentFields.filter(
        (field) => field.required,
      )

      const missingField = requiredFields.find((field) => {
        const value = profile[field.key]

        return (
          typeof value !== 'string' ||
          value.trim().length === 0
        )
      })

      if (missingField) {
        setMessage(`Please complete: ${missingField.label}.`)
        return
      }

      setMessage('')
      setOnboardingStep((step) => Math.min(step + 1, 6))
    }

    return (
      <main className="author-journey-page">
        <header className="journey-header">
          <button
            className="journey-logo"
            type="button"
            onClick={() => navigate('home', '/')}
          >
            <strong>Katiba News</strong>
            <span>Real Stories. Stronger Democracy.</span>
          </button>

          <div className="journey-header-copy">
            <span />
            <strong>Complete Your Profile</strong>
            <small>
              Tell us about yourself and your reporting experience.
            </small>
          </div>

          <button
            className="journey-back"
            type="button"
            onClick={() => navigate('home', '/')}
          >
            Back to news
          </button>
        </header>

        <section className="journey-body">
          <div className="journey-progress">
            <div className="journey-progress-label">
              <span>Step 2 of 2</span>
              <strong>02 · Complete Profile</strong>
            </div>

            <div
              className="journey-progress-track"
              aria-hidden="true"
            >
              <span
                className="journey-progress-fill"
                style={{
                  width: `${(onboardingStep / 6) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="profile-layout">
            <aside className="profile-sidebar">
              <span className="stage-kicker">YOUR PROFILE</span>

              <h1>
                Tell us about
                <br />
                your <em>work.</em>
              </h1>

              <p>
                A complete author profile helps the newsroom
                understand your expertise, interests, and experience.
              </p>

              <div className="profile-substeps">
                {profileSteps.map((step, index) => (
                  <button
                    key={step.name}
                    type="button"
                    className={
                      onboardingStep === index + 1 ? 'active' : ''
                    }
                    onClick={() => {
                      setOnboardingStep(index + 1)
                      setMessage('')
                    }}
                  >
                    <span>{index + 1}</span>
                    <strong>{step.name}</strong>
                  </button>
                ))}
              </div>
            </aside>

            <form
              className="profile-form"
              onSubmit={handleAuthorProfileSubmit}
            >
              <div className="profile-form-heading">
                <span>PROFILE {onboardingStep} / 6</span>
                <h2>{profileSteps[onboardingStep - 1].title}</h2>
              </div>

              {currentFields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={field.key}>{field.label}</label>

                  {field.multiline ? (
                    <textarea
                      id={field.key}
                      value={String(profile[field.key])}
                      onChange={(event) =>
                        updateProfile(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      rows={5}
                      required={field.required}
                    />
                  ) : (
                    <input
                      id={field.key}
                      type={field.type ?? 'text'}
                      value={String(profile[field.key])}
                      onChange={(event) =>
                        updateProfile(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}
                </div>
              ))}

              {onboardingStep === 6 && (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={profile.editorial_standards_agreement}
                    onChange={(event) =>
                      updateProfile(
                        'editorial_standards_agreement',
                        event.target.checked,
                      )
                    }
                    required
                  />

                  <span>
                    I agree to follow Katiba News editorial,
                    accuracy, and fact-checking standards.
                  </span>
                </label>
              )}

              <div className="profile-actions">
                {onboardingStep > 1 && (
                  <button
                    type="button"
                    className="profile-back"
                    onClick={() => {
                      setMessage('')
                      setOnboardingStep((step) => Math.max(step - 1, 1))
                    }}
                  >
                    ← Back
                  </button>
                )}

                {onboardingStep < 6 ? (
                  <button
                    type="button"
                    className="account-submit"
                    onClick={goToNextStep}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    className="account-submit"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? 'Saving…' : 'Submit profile →'}
                  </button>
                )}
              </div>

              {message && (
                <p className="account-message" role="status">
                  {message}
                </p>
              )}
            </form>
          </div>
        </section>

        <footer className="journey-footer">
          <strong>Katiba News</strong>
          <span>Real Stories. Stronger Democracy.</span>

          <div className="journey-footer-steps">
            <span>01 Account</span>
            <span className="active">02 Profile</span>
          </div>
        </footer>
      </main>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Landing page                                                             */
  /* ------------------------------------------------------------------------ */

  return <PublicLayout active="home" search={search} onSearch={setSearch}><HomepageStories search={search} /></PublicLayout>
}

export default App
