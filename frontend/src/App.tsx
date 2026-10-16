import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { AuthorDashboard } from './features/dashboard/AuthorDashboard'

type Role = 'Author'
type Mode = 'signin' | 'signup'
type View = 'home' | 'auth' | 'onboarding' | 'dashboard'

type Session = {
  username: string
  role: Role
  access: string
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
    placeholder: 'Tell us why you want to contribute.',
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

const featuredStories = [
  {
    category: 'CONSTITUTION',
    title: 'The Constitution in everyday life',
    description:
      'Clear guides to the rights, duties, and institutions that shape Kenya.',
    art: 'art-feature-one',
  },
  {
    category: 'PUBLIC FINANCE',
    title: 'Following public money from plan to service',
    description:
      'Understand budgets, spending, and the services they are meant to support.',
    art: 'art-feature-two',
  },
  {
    category: 'COUNTIES',
    title: 'How residents can shape local priorities',
    description:
      'A practical guide to taking part in county decisions.',
    art: 'art-feature-three',
  },
]

const newsletters = [
  {
    date: 'WEEKLY BRIEF',
    title: 'The Constitution in focus',
    art: 'art-newsletter-one',
  },
  {
    date: 'WEEKLY BRIEF',
    title: 'Inside public finance',
    art: 'art-newsletter-two',
  },
  {
    date: 'WEEKLY BRIEF',
    title: 'County decisions that matter',
    art: 'art-newsletter-three',
  },
  {
    date: 'WEEKLY BRIEF',
    title: 'Rights, courts, and communities',
    art: 'art-newsletter-four',
  },
]

const newsCategories = [
  {
    name: 'Governance',
    stories: [
      'What public participation means in practice',
      'How county assemblies make decisions',
      'A guide to accessing public information',
    ],
  },
  {
    name: 'Constitution',
    stories: [
      'Understanding the Bill of Rights',
      'How the three arms of government work',
      'The role of independent commissions',
    ],
  },
  {
    name: 'Business & Economy',
    stories: [
      'Reading the national budget simply',
      'What economic indicators tell us',
      'How policy affects local businesses',
    ],
  },
]

const guestArticles = [
  {
    author: 'Wanjiku Njoroge',
    initials: 'WN',
    title:
      'What public participation can teach us about better policy',
    description:
      'A perspective on listening to communities before decisions are made.',
    art: 'art-guest-one',
  },
  {
    author: 'David Otieno',
    initials: 'DO',
    title: 'Why access to information matters',
    description:
      'Public information helps people understand and question decisions.',
    art: 'art-guest-two',
  },
  {
    author: 'Amina Hassan',
    initials: 'AH',
    title: 'Building trust through local accountability',
    description:
      'Strong institutions grow when the public can see how they work.',
    art: 'art-guest-three',
  },
  {
    author: 'Peter Mwangi',
    initials: 'PM',
    title: 'A fairer future starts with informed citizens',
    description:
      'Knowledge helps turn rights into meaningful participation.',
    art: 'art-guest-four',
  },
]

const events = [
  {
    title: 'Constitution and Community Forum',
    description:
      'A public conversation about civic participation and local priorities.',
    date: '18 OCT 2026',
    place: 'Nairobi',
    art: 'art-event-one',
  },
  {
    title: 'Public Finance, Explained',
    description:
      'A practical session on budgets, oversight, and public services.',
    date: '04 NOV 2026',
    place: 'Online',
    art: 'art-event-two',
  },
]

const shows = [
  {
    title: 'The Civic Brief',
    description: 'A short guide to the issues in the news.',
    art: 'art-show-one',
  },
  {
    title: 'In Depth',
    description:
      'Long-form conversations about policy and public life.',
    art: 'art-show-two',
  },
  {
    title: 'People & Power',
    description: 'Stories about communities shaping change.',
    art: 'art-show-three',
  },
  {
    title: 'The Explainer',
    description:
      'Complex public questions, made easier to understand.',
    art: 'art-show-four',
  },
]

const latestStories = [
  {
    time: '2 hours ago',
    title: 'What the Constitution says about public spending',
  },
  {
    time: '4 hours ago',
    title: 'Counties prepare for a new round of public forums',
  },
  {
    time: '6 hours ago',
    title: 'Court ruling renews debate on access to public records',
  },
  {
    time: 'Yesterday',
    title: 'Why local services matter in the budget debate',
  },
]

/* -------------------------------------------------------------------------- */
/* Session and routing helpers                                                 */
/* -------------------------------------------------------------------------- */

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem('katibaUserSession')

    if (!raw) return null

    const session = JSON.parse(raw) as Partial<Session>

    if (
      typeof session.username === 'string' &&
      session.username.length > 0 &&
      session.role === 'Author' &&
      typeof session.access === 'string' &&
      session.access.length > 0
    ) {
      return session as Session
    }
  } catch {
    // Invalid session data should never be treated as authenticated.
  }

  return null
}

function pathToView(path: string): View {
  switch (path.replace(/\/+$/, '') || '/') {
    case '/signup':
    case '/signin':
      return 'auth'

    case '/author/complete-profile':
      return 'onboarding'

    case '/author/dashboard':
    case '/features/dashboard/AuthorDashboard':
    case '/features/dashboard/authorDashboard':
      return 'dashboard'

    default:
      return 'home'
  }
}

const viewToPath: Record<View, string> = {
  home: '/',
  auth: '/signin',
  onboarding: '/author/complete-profile',
  dashboard: '/author/dashboard',
}

function scrollRow(id: string, direction: 'left' | 'right') {
  document.getElementById(id)?.scrollBy({
    left: direction === 'left' ? -320 : 320,
    behavior: 'smooth',
  })
}

function CarouselControls({ target }: { target: string }) {
  return (
    <div className="carousel-controls">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollRow(target, 'left')}
      >
        ←
      </button>

      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollRow(target, 'right')}
      >
        →
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Main application                                                            */
/* -------------------------------------------------------------------------- */

function App() {
  const [view, setView] = useState<View>(() =>
    pathToView(window.location.pathname),
  )

  const [mode, setMode] = useState<Mode>(() =>
    window.location.pathname === '/signup' ? 'signup' : 'signin',
  )

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [profile, setProfile] = useState<Profile>(() => ({
    ...emptyProfile,
  }))

  const [onboardingStep, setOnboardingStep] = useState(1)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [showCookieNotice, setShowCookieNotice] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [signedInUser, setSignedInUser] = useState<Session | null>(
    readSession,
  )

  /**
   * Replace the current route and view together.
   *
   * This application uses a small custom router rather than React Router.
   * Therefore, updating window.history alone is not enough: setView must
   * also be called to render the correct page.
   */
  function navigate(nextView: View, path?: string) {
    const nextPath = path ?? viewToPath[nextView]

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setView(nextView)
    setMessage('')

    if (nextPath === '/signup') {
      setMode('signup')
      setOnboardingStep(1)
    } else if (nextPath === '/signin') {
      setMode('signin')
    } else if (nextPath === '/author/complete-profile') {
      setOnboardingStep(1)
    }
  }

  /**
   * Enter the dashboard after saving the authenticated session.
   *
   * Use replaceState so that pressing Back does not immediately return
   * to the sign-in form after a successful login.
   */
  function enterDashboard(session: Session) {
    sessionStorage.setItem(
      'katibaUserSession',
      JSON.stringify(session),
    )

    setSignedInUser(session)
    setPassword('')
    setMessage('')

    window.history.replaceState({}, '', '/author/dashboard')
    setView('dashboard')
  }

  /**
   * Open profile onboarding for accounts that explicitly need it.
   */
  function enterOnboarding(session: Session) {
    sessionStorage.setItem(
      'katibaUserSession',
      JSON.stringify(session),
    )

    setSignedInUser(session)
    setPassword('')
    setMessage('')
    setOnboardingStep(1)

    window.history.replaceState(
      {},
      '',
      '/author/complete-profile',
    )

    setView('onboarding')
  }

  /* Browser Back and Forward support. */
  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname
      const nextView = pathToView(path)

      if (nextView === 'dashboard' || nextView === 'onboarding') {
        const session = readSession()

        if (!session) {
          sessionStorage.removeItem('katibaUserSession')
          setSignedInUser(null)

          window.history.replaceState({}, '', '/signin')
          setView('auth')
          setMode('signin')
          setMessage(
            'Please sign in to access your author account.',
          )

          return
        }

        setSignedInUser(session)
      }

      setView(nextView)
      setMode(path === '/signup' ? 'signup' : 'signin')
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

  /* Protect the dashboard and onboarding routes. */
  useEffect(() => {
    if (view !== 'dashboard' && view !== 'onboarding') {
      return
    }

    const session = readSession()

    if (!session) {
      sessionStorage.removeItem('katibaUserSession')
      setSignedInUser(null)

      window.history.replaceState({}, '', '/signin')
      setView('auth')
      setMode('signin')
      setMessage(
        'Please sign in to access your author account.',
      )

      return
    }

    setSignedInUser(session)
  }, [view])

  function openAuth(nextMode: Mode = 'signin') {
    setMode(nextMode)
    setMessage('')

    navigate(
      'auth',
      nextMode === 'signup' ? '/signup' : '/signin',
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Sign up and sign in                                                       */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setMessage('')
    setBusy(true)

    try {
      /* ------------------------------- SIGN UP ------------------------------ */

      if (mode === 'signup') {
        const response = await fetch('/api/users/register/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            username,
            password,
          }),
        })

        const result = (await response
          .json()
          .catch(() => ({}))) as ApiError

        if (!response.ok) {
          setMessage(
            typeof result.detail === 'string'
              ? result.detail
              : typeof result.message === 'string'
                ? result.message
                : JSON.stringify(result),
          )

          return
        }

        setMessage(
          'Account created successfully. Please sign in to continue.',
        )

        setMode('signin')
        setPassword('')

        window.history.replaceState({}, '', '/signin')
        setView('auth')

        return
      }

      /* ------------------------------- SIGN IN ------------------------------ */

      const loginResponse = await fetch('/api/users/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const login = (await loginResponse
        .json()
        .catch(() => ({}))) as {
        access?: unknown
        refresh?: unknown
        detail?: unknown
        message?: unknown
      }

      if (
        !loginResponse.ok ||
        typeof login.access !== 'string' ||
        login.access.length === 0
      ) {
        setMessage(
          typeof login.detail === 'string'
            ? login.detail
            : typeof login.message === 'string'
              ? login.message
              : 'Login failed. Check your username and password.',
        )

        return
      }

      /* ------------------------- FETCH ACCOUNT DETAILS ---------------------- */

      const meResponse = await fetch('/api/users/me/', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${login.access}`,
        },
      })

      const account = (await meResponse
        .json()
        .catch(() => ({}))) as {
        username?: unknown
        role?: unknown
        is_author?: unknown
        profile_complete?: unknown
        detail?: unknown
        message?: unknown
      }

      if (!meResponse.ok) {
        setMessage(
          typeof account.detail === 'string'
            ? account.detail
            : typeof account.message === 'string'
              ? account.message
              : 'Could not load your account. Please try again.',
        )

        return
      }

      /*
       * Accept "Author", "author", and other case variations.
       * Some APIs do not return a role property, so a missing role is
       * not automatically treated as an authorization failure.
       *
       * Explicitly non-author accounts are still rejected.
       */
      const normalizedRole =
        typeof account.role === 'string'
          ? account.role.trim().toLowerCase()
          : ''

      if (
        account.is_author === false ||
        (normalizedRole !== '' && normalizedRole !== 'author')
      ) {
        setMessage(
          'This account is not authorised to access the author dashboard.',
        )

        return
      }

      /* --------------------------- CREATE SESSION --------------------------- */

      const session: Session = {
        username:
          typeof account.username === 'string' &&
          account.username.trim().length > 0
            ? account.username
            : username,
        role: 'Author',
        access: login.access,
      }

      /*
       * Important:
       * Do not require profile_complete === true to open the dashboard.
       *
       * Some Django /api/users/me/ implementations omit this property.
       * An omitted property should not automatically send a user away
       * from the dashboard.
       *
       * Only an explicit false value opens profile onboarding.
       */
      if (account.profile_complete === false) {
        enterOnboarding(session)
      } else {
        enterDashboard(session)
      }
    } catch (error) {
      console.error('Authentication error:', error)

      setMessage(
        'Could not reach the server. Check that Django is running and your API URL is correct.',
      )
    } finally {
      setBusy(false)
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Author profile submission                                                 */
  /* ------------------------------------------------------------------------ */

  async function handleAuthorProfileSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setMessage('')

    const session = readSession()

    if (!session) {
      sessionStorage.removeItem('katibaUserSession')
      setSignedInUser(null)

      setMessage(
        'Your session has expired. Please sign in again.',
      )

      navigate('auth', '/signin')

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
      const response = await fetch(
        '/api/users/author/profile/',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access}`,
          },
          body: JSON.stringify(profile),
        },
      )

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiError

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem('katibaUserSession')
        setSignedInUser(null)

        window.history.replaceState({}, '', '/signin')
        setView('auth')
        setMode('signin')

        setMessage(
          'Your session has expired or you are not authorised. Please sign in again.',
        )

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

      /*
       * Keep the authenticated session and navigate to the dashboard
       * after the backend confirms that the profile was saved.
       */
      window.history.replaceState(
        {},
        '',
        '/author/dashboard',
      )

      setSignedInUser(session)
      setMessage('')
      setView('dashboard')
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
  /* Sign out                                                                  */
  /* ------------------------------------------------------------------------ */

  function signOut() {
    sessionStorage.removeItem('katibaUserSession')

    setSignedInUser(null)
    setPassword('')
    setProfile({ ...emptyProfile })
    setOnboardingStep(1)

    window.history.replaceState({}, '', '/signin')

    setView('auth')
    setMode('signin')
    setMessage('You have signed out successfully.')
  }

  /* ------------------------------------------------------------------------ */
  /* Author dashboard                                                          */
  /* ------------------------------------------------------------------------ */

  if (view === 'dashboard') {
    const session = readSession()

    if (!session) {
      return (
        <main className="author-journey-page">
          <section className="journey-body">
            <h1>Please sign in</h1>

            <p>
              You must sign in to access your author dashboard.
            </p>

            <button
              type="button"
              className="account-submit"
              onClick={() => navigate('auth', '/signin')}
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
  /* Sign-in and sign-up page                                                   */
  /* ------------------------------------------------------------------------ */

  if (view === 'auth') {
    const isSignup = mode === 'signup'

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
            <strong>
              {isSignup ? 'Create Your Account' : 'Welcome Back'}
            </strong>
            <small>
              Start your journey from sign up to publication.
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
              <span>Step 1 of 2</span>
              <strong>01 · Create Account</strong>
            </div>

            <div
              className="journey-progress-track"
              aria-hidden="true"
            >
              <span
                className="journey-progress-fill"
                style={{ width: '20%' }}
              />
            </div>
          </div>

          <div className="account-stage">
            <div className="account-stage-copy">
              <span className="stage-kicker">
                STEP 1 · CREATE ACCOUNT
              </span>

              <h1>
                Join Katiba News
                <br />
                as an <em>Author.</em>
              </h1>

              <p>
                Create your account to begin your author journey.
                Your profile, work samples, and future pitches will
                live in one place.
              </p>

              <div className="journey-mini-flow">
                <span className="active">Create account</span>
                <i>→</i>
                <span>Complete profile</span>
              </div>
            </div>

            <form
              className="account-form"
              onSubmit={handleSubmit}
            >
              <div className="account-form-heading">
                <span>KATIBA NEWS</span>

                <h2>
                  {isSignup
                    ? 'Create your account'
                    : 'Welcome back'}
                </h2>

                <p>
                  {isSignup
                    ? 'Join Katiba News as an author.'
                    : 'Sign in to continue your author journey.'}
                </p>
              </div>

              <div className="account-mode">
                <button
                  type="button"
                  className={isSignup ? 'active' : ''}
                  onClick={() => openAuth('signup')}
                >
                  Create account
                </button>

                <button
                  type="button"
                  className={!isSignup ? 'active' : ''}
                  onClick={() => openAuth('signin')}
                >
                  Sign in
                </button>
              </div>

              {isSignup && (
                <>
                  <label htmlFor="firstName">
                    First name
                  </label>

                  <input
                    id="firstName"
                    value={firstName}
                    onChange={(event) =>
                      setFirstName(event.target.value)
                    }
                    autoComplete="given-name"
                    required
                  />

                  <label htmlFor="lastName">
                    Last name
                  </label>

                  <input
                    id="lastName"
                    value={lastName}
                    onChange={(event) =>
                      setLastName(event.target.value)
                    }
                    autoComplete="family-name"
                    required
                  />

                  <label htmlFor="email">Email</label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    required
                  />
                </>
              )}

              <label htmlFor="username">Username</label>

              <input
                id="username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                autoComplete="username"
                required
              />

              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete={
                  isSignup ? 'new-password' : 'current-password'
                }
                required
              />

              <button
                className="account-submit"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? 'Please wait…'
                  : isSignup
                    ? 'Join as Author →'
                    : 'Sign in to continue →'}
              </button>

              {message && (
                <p
                  className="account-message"
                  role="status"
                >
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
            <span className="active">01 Account</span>
            <span>02 Profile</span>
          </div>
        </footer>
      </main>
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Six-step author onboarding                                                */
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
        setMessage(
          `Please complete: ${missingField.label}.`,
        )

        return
      }

      setMessage('')

      setOnboardingStep((step) =>
        Math.min(step + 1, 6),
      )
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
              <span className="stage-kicker">
                YOUR PROFILE
              </span>

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
                      onboardingStep === index + 1
                        ? 'active'
                        : ''
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
                <span>
                  PROFILE {onboardingStep} / 6
                </span>

                <h2>
                  {profileSteps[onboardingStep - 1].title}
                </h2>
              </div>

              {currentFields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={field.key}>
                    {field.label}
                  </label>

                  {field.multiline ? (
                    <textarea
                      id={field.key}
                      value={String(profile[field.key])}
                      onChange={(event) =>
                        updateProfile(
                          field.key,
                          event.target.value,
                        )
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
                        updateProfile(
                          field.key,
                          event.target.value,
                        )
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
                    checked={
                      profile.editorial_standards_agreement
                    }
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

                      setOnboardingStep((step) =>
                        Math.max(step - 1, 1),
                      )
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
                <p
                  className="account-message"
                  role="status"
                >
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
  /* Landing page                                                              */
  /* ------------------------------------------------------------------------ */

  const filteredLatest = latestStories.filter((story) =>
    story.title
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  return (
    <main
      className={`news-home ${darkMode ? 'dark-mode' : ''}`}
      id="top"
    >
      <header className="news-header">
        <div className="masthead">
          <button
            className="news-logo"
            type="button"
            onClick={() => navigate('home', '/')}
          >
            Katiba News
            <small>THE PEOPLE. THE LAW. THE FUTURE.</small>
          </button>

          <span className="today">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>

          <label className="search-box">
            <span aria-hidden="true">⌕</span>

            <input
              aria-label="Search news"
              placeholder="Search news"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <div className="header-actions">
            {signedInUser && (
              <span className="signed-in-label">
                {signedInUser.username} · {signedInUser.role}
              </span>
            )}

            <button
              className="theme-toggle"
              type="button"
              aria-label={
                darkMode
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              title={
                darkMode
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              onClick={() =>
                setDarkMode((current) => !current)
              }
            >
              {darkMode ? '☀' : '☾'}
            </button>

            {signedInUser ? (
              <>
                <button
                  className="header-signin"
                  type="button"
                  onClick={() =>
                    navigate('dashboard', '/author/dashboard')
                  }
                >
                  Author dashboard
                </button>

                <button
                  className="header-signin"
                  type="button"
                  onClick={signOut}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                className="header-signin"
                type="button"
                onClick={() => openAuth('signin')}
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <nav
          className="news-nav"
          aria-label="Main navigation"
        >
          <a href="#top">Home</a>
          <a href="#your-news">Your News</a>
          <a href="#guest-analysis">Guest Analysis</a>
          <a href="#events">Events</a>
          <a href="#shows">Shows</a>
          <a href="#business-intelligence">
            Business Intelligence
          </a>

          {!signedInUser && (
            <button
              type="button"
              onClick={() => openAuth('signup')}
            >
              Become an author?
            </button>
          )}
        </nav>
      </header>

      <div className="page-content">
        {/* Lead story and latest headlines */}

        <section
          className="lead-latest"
          id="latest"
        >
          <article className="lead-story">
            <div
              className="lead-art"
              aria-hidden="true"
            />

            <div className="lead-copy">
              <span className="story-category">
                GOVERNANCE
              </span>

              <h1>
                Understanding the decisions that shape Kenya
              </h1>

              <p>
                The latest reporting and clear explanations on
                public life, policy, and the Constitution.
              </p>

              <a href="#your-news">
                Explore the story →
              </a>
            </div>
          </article>

          <aside className="latest-panel">
            <div className="latest-panel-heading">
              <h2>Latest</h2>
            </div>

            <div className="latest-list">
              {filteredLatest.map((story) => (
                <article key={story.title}>
                  <time>{story.time}</time>
                  <a href="#latest">{story.title}</a>
                </article>
              ))}

              {filteredLatest.length === 0 && (
                <p>No headlines match your search.</p>
              )}
            </div>
          </aside>
        </section>

        {/* Featured stories */}

        <section
          className="content-section"
          id="featured"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                KATIBA NEWS
              </span>
              <h2>Featured</h2>
            </div>

            <CarouselControls target="featured-row" />
          </div>

          <div
            className="featured-row horizontal-row"
            id="featured-row"
          >
            <article className="featured-promo">
              <span className="story-category">
                KATIBA EXPLAINER
              </span>

              <h3>
                Understand the decisions that shape your
                community
              </h3>

              <p>
                Clear guides to the Constitution, public
                services, and your rights.
              </p>

              <a href="#your-news">
                Explore the news <span>→</span>
              </a>
            </article>

            {featuredStories.map((story) => (
              <article
                className="feature-card"
                key={story.title}
              >
                <div
                  className={`image-panel ${story.art}`}
                >
                  <span>{story.category}</span>
                </div>

                <div className="feature-card-copy">
                  <span className="story-category">
                    {story.category}
                  </span>

                  <h3>{story.title}</h3>
                  <p>{story.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Newsletters */}

        <section
          className="content-section"
          id="newsletters"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                FROM OUR DESK
              </span>

              <h2>Newsletters</h2>

              <a
                className="view-all"
                href="#footer"
              >
                View all newsletters →
              </a>
            </div>

            <CarouselControls target="newsletter-row" />
          </div>

          <div
            className="newsletter-row horizontal-row"
            id="newsletter-row"
          >
            {newsletters.map((item) => (
              <article
                className="newsletter-card"
                key={item.title}
              >
                <div
                  className={`newsletter-cover ${item.art}`}
                >
                  <span className="cover-date">
                    {item.date}
                  </span>

                  <strong>{item.title}</strong>

                  <span className="cover-mark">K</span>
                </div>

                <h3>{item.title}</h3>
              </article>
            ))}
          </div>
        </section>

        {/* Your News */}

        <section
          className="content-section"
          id="your-news"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                FOLLOW THE ISSUES
              </span>

              <h2>Your News</h2>
            </div>

            <CarouselControls target="your-news-row" />
          </div>

          <div
            className="category-row horizontal-row"
            id="your-news-row"
          >
            {newsCategories.map((category, index) => (
              <article
                className="category-column"
                key={category.name}
              >
                <h3>{category.name}</h3>

                {category.stories.map(
                  (title, storyIndex) => (
                    <a
                      className="category-story"
                      href="#latest"
                      key={title}
                    >
                      <div
                        className={`mini-art mini-art-${index}-${storyIndex}`}
                      />

                      <strong>{title}</strong>
                    </a>
                  ),
                )}
              </article>
            ))}
          </div>

          <div className="latest-block">
            <h3>Latest updates</h3>

            <div className="latest-list">
              {filteredLatest.map((story) => (
                <article key={story.title}>
                  <time>{story.time}</time>
                  <a href="#latest">{story.title}</a>
                </article>
              ))}

              {filteredLatest.length === 0 && (
                <p>No headlines match your search.</p>
              )}
            </div>
          </div>
        </section>

        {/* Guest Analysis */}

        <section
          className="content-section"
          id="guest-analysis"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                PERSPECTIVES
              </span>

              <h2>Guest Analysis</h2>
            </div>

            <CarouselControls target="analysis-row" />
          </div>

          <div
            className="analysis-row horizontal-row"
            id="analysis-row"
          >
            {guestArticles.map((article) => (
              <article
                className="analysis-card"
                key={article.title}
              >
                <div
                  className={`analysis-art ${article.art}`}
                />

                <div className="analysis-copy">
                  <div className="author-line">
                    <span className="author-avatar">
                      {article.initials}
                    </span>

                    <span>{article.author}</span>

                    <time>Guest contributor</time>
                  </div>

                  <h3>{article.title}</h3>
                  <p>{article.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Events */}

        <section
          className="content-section events-section"
          id="events"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                JOIN THE CONVERSATION
              </span>

              <h2>Events</h2>
            </div>

            <CarouselControls target="events-row" />
          </div>

          <div className="events-layout">
            <div className="events-intro">
              <h3>Upcoming events</h3>

              <p>
                Join public conversations, practical workshops,
                and community forums.
              </p>
            </div>

            <div
              className="events-row horizontal-row"
              id="events-row"
            >
              {events.map((event) => (
                <article
                  className="event-card"
                  key={event.title}
                >
                  <div
                    className={`event-art ${event.art}`}
                  />

                  <div className="event-copy">
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>

                    <div className="event-meta">
                      <span>◷ {event.date}</span>
                      <span>⌖ {event.place}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Shows */}

        <section
          className="content-section"
          id="shows"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                WATCH &amp; LISTEN
              </span>

              <h2>Shows</h2>
            </div>

            <CarouselControls target="shows-row" />
          </div>

          <div
            className="shows-row horizontal-row"
            id="shows-row"
          >
            {shows.map((show) => (
              <article
                className="show-card"
                key={show.title}
              >
                <div
                  className={`show-art ${show.art}`}
                >
                  <span>KATIBA NEWS</span>
                  <strong>{show.title}</strong>
                </div>

                <h3>{show.title}</h3>
                <p>{show.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Business Intelligence */}

        <section
          className="business-section"
          id="business-intelligence"
        >
          <div className="business-heading">
            <div>
              <span className="section-kicker">
                DATA FOR DECISIONS
              </span>

              <h2>
                Katiba News Business Intelligence
              </h2>

              <p>
                Useful context and tools for understanding
                Kenya’s economy and public sector.
              </p>
            </div>

            <button
              className="orange-button"
              type="button"
              onClick={() =>
                signedInUser
                  ? navigate(
                      'dashboard',
                      '/author/dashboard',
                    )
                  : openAuth('signup')
              }
            >
              {signedInUser
                ? 'Author dashboard'
                : 'Sign up'}{' '}
              <span>→</span>
            </button>
          </div>

          <div className="business-content">
            <div className="business-features">
              <article>
                <h3>Economic indicators</h3>
                <p>
                  Follow key figures and understand what they
                  mean.
                </p>
              </article>

              <article>
                <h3>Local and global insights</h3>
                <p>
                  Explore analysis connecting Kenyan markets
                  with wider trends.
                </p>
              </article>

              <article>
                <h3>Public finance</h3>
                <p>
                  Get clearer context on budgets, revenue,
                  and public spending.
                </p>
              </article>

              <article>
                <h3>Interactive data</h3>
                <p>
                  Compare information through simple charts
                  and visual guides.
                </p>
              </article>
            </div>

            <div className="business-preview">
              <span>BUSINESS INTELLIGENCE</span>

              <strong>
                Data. Context. Better decisions.
              </strong>

              <div
                className="preview-bars"
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}

      <footer
        className="site-footer"
        id="footer"
      >
        <div className="footer-brand">
          <strong>Katiba News</strong>

          <small>
            THE PEOPLE. THE LAW. THE FUTURE.
          </small>

          <p>
            Independent reporting and useful context for
            public life in Kenya.
          </p>
        </div>

        <div>
          <h3>Quick links</h3>
          <a href="#your-news">Your News</a>
          <a href="#guest-analysis">Guest Analysis</a>
          <a href="#events">Events</a>
          <a href="#shows">Shows</a>
        </div>

        <div>
          <h3>Contact</h3>

          <a href="mailto:hello@katibanews.example">
            Media and partnerships
          </a>

          <a href="#footer">
            Contact the newsroom →
          </a>
        </div>

        <div>
          <h3>About Katiba News</h3>

          <p>
            News and explanations focused on the Constitution,
            governance, rights, and public services.
          </p>
        </div>
      </footer>

      {/* Cookie notice */}

      {showCookieNotice && (
        <div className="cookie-notice">
          <p>
            We use essential site storage to keep this
            demonstration working. Read our{' '}
            <a href="#footer">privacy information</a>.
          </p>

          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setShowCookieNotice(false)}
          >
            ×
          </button>
        </div>
      )}
    </main>
  )
}

export default App