import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { ArticleReader } from './features/articles/components/ArticleReader'
import { ArticleEditor } from './features/articles/components/ArticleEditor'
import { BlogView } from './features/blogs/components/BlogView'

type Role = 'Author'
type Mode = 'signin' | 'signup'
type View = 'home' | 'auth' | 'onboarding' | 'dashboard'

const pathToView = (path: string): View => {
  switch (path) {
    case '/signup':
    case '/signin':
      return 'auth'
    case '/author/complete-profile':
      return 'onboarding'
    case '/author/dashboard':
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

const featuredStories = [
  {
    category: 'CONSTITUTION',
    title: 'The Constitution in everyday life',
    description: 'Clear guides to the rights, duties, and institutions that shape Kenya.',
    art: 'art-feature-one',
  },
  {
    category: 'PUBLIC FINANCE',
    title: 'Following public money from plan to service',
    description: 'Understand budgets, spending, and the services they are meant to support.',
    art: 'art-feature-two',
  },
  {
    category: 'COUNTIES',
    title: 'How residents can shape local priorities',
    description: 'A practical guide to taking part in county decisions.',
    art: 'art-feature-three',
  },
]

const newsletters = [
  { date: 'WEEKLY BRIEF', title: 'The Constitution in focus', art: 'art-newsletter-one' },
  { date: 'WEEKLY BRIEF', title: 'Inside public finance', art: 'art-newsletter-two' },
  { date: 'WEEKLY BRIEF', title: 'County decisions that matter', art: 'art-newsletter-three' },
  { date: 'WEEKLY BRIEF', title: 'Rights, courts, and communities', art: 'art-newsletter-four' },
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
    title: 'What public participation can teach us about better policy',
    description: 'A perspective on listening to communities before decisions are made.',
    art: 'art-guest-one',
  },
  {
    author: 'David Otieno',
    initials: 'DO',
    title: 'Why access to information matters',
    description: 'Public information helps people understand and question decisions.',
    art: 'art-guest-two',
  },
  {
    author: 'Amina Hassan',
    initials: 'AH',
    title: 'Building trust through local accountability',
    description: 'Strong institutions grow when the public can see how they work.',
    art: 'art-guest-three',
  },
  {
    author: 'Peter Mwangi',
    initials: 'PM',
    title: 'A fairer future starts with informed citizens',
    description: 'Knowledge helps turn rights into meaningful participation.',
    art: 'art-guest-four',
  },
]

const events = [
  {
    title: 'Constitution and Community Forum',
    description: 'A public conversation about civic participation and local priorities.',
    date: '18 OCT 2026',
    place: 'Nairobi',
    art: 'art-event-one',
  },
  {
    title: 'Public Finance, Explained',
    description: 'A practical session on budgets, oversight, and public services.',
    date: '04 NOV 2026',
    place: 'Online',
    art: 'art-event-two',
  },
]

const shows = [
  { title: 'The Civic Brief', description: 'A short guide to the issues in the news.', art: 'art-show-one' },
  { title: 'In Depth', description: 'Long-form conversations about policy and public life.', art: 'art-show-two' },
  { title: 'People & Power', description: 'Stories about communities shaping change.', art: 'art-show-three' },
  { title: 'The Explainer', description: 'Complex public questions, made easier to understand.', art: 'art-show-four' },
]

const latestStories = [
  { time: '2 hours ago', title: 'What the Constitution says about public spending' },
  { time: '4 hours ago', title: 'Counties prepare for a new round of public forums' },
  { time: '6 hours ago', title: 'Court ruling renews debate on access to public records' },
  { time: 'Yesterday', title: 'Why local services matter in the budget debate' },
]

function scrollRow(id: string, direction: 'left' | 'right') {
  const row = document.getElementById(id)
  row?.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' })
}

function CarouselControls({ target }: { target: string }) {
  return (
    <div className="carousel-controls">
      <button type="button" aria-label="Scroll left" onClick={() => scrollRow(target, 'left')}>
        ←
      </button>
      <button type="button" aria-label="Scroll right" onClick={() => scrollRow(target, 'right')}>
        →
      </button>
    </div>
  )
}

function App() {
  const [view, setView] = useState<View>(() =>
  pathToView(window.location.pathname),
)
const navigate = (nextView: View, path?: string) => {
  const nextPath = path ?? viewToPath[nextView]

  window.history.pushState({}, '', nextPath)
  setView(nextView)

  if (nextPath === '/signup') {
    setMode('signup')
  } else if (nextPath === '/signin') {
    setMode('signin')
  }
}
useEffect(() => {
  const handlePopState = () => {
    const path = window.location.pathname

    setView(pathToView(path))
    setMode(path === '/signup' ? 'signup' : 'signin')
  }

  window.addEventListener('popstate', handlePopState)

  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}, [])
  const [mode, setMode] = useState<Mode>(() =>
  window.location.pathname === '/signup' ? 'signup' : 'signin',
)
  const [role, setRole] = useState<Role>('Author')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [professionalTitle, setProfessionalTitle] = useState('')
const [organisation, setOrganisation] = useState('')
const [location, setLocation] = useState('')
const [areasOfExpertise, setAreasOfExpertise] = useState('')
const [biography, setBiography] = useState('')
const [preferredByline, setPreferredByline] = useState('')
const [phoneNumber, setPhoneNumber] = useState('')
const [yearsOfExperience, setYearsOfExperience] = useState('')
const [highestEducation, setHighestEducation] = useState('')
const [journalismTraining, setJournalismTraining] = useState('')
const [previousMediaExperience, setPreviousMediaExperience] = useState('')

const [portfolioUrl, setPortfolioUrl] = useState('')
const [linkedinUrl, setLinkedinUrl] = useState('')
const [publishedWork, setPublishedWork] = useState('')

const [primaryExpertise, setPrimaryExpertise] = useState('')
const [secondaryExpertise, setSecondaryExpertise] = useState('')
const [reportingBeats, setReportingBeats] = useState('')
const [contentTypes, setContentTypes] = useState('')
const [languages, setLanguages] = useState('')
const [geographicCoverage, setGeographicCoverage] = useState('')

const [writingExperience, setWritingExperience] = useState('')
const [investigativeExperience, setInvestigativeExperience] = useState('')
const [factCheckingExperience, setFactCheckingExperience] = useState('')
const [sourceVerificationExperience, setSourceVerificationExperience] = useState('')

const [topicsOfInterest, setTopicsOfInterest] = useState('')
const [motivationToJoin, setMotivationToJoin] = useState('')

const [conflictsOfInterest, setConflictsOfInterest] = useState('')
const [editorialStandardsAgreement, setEditorialStandardsAgreement] = useState(false)
const [additionalInformation, setAdditionalInformation] = useState('')
const [onboardingStep, setOnboardingStep] = useState(1)
const totalOnboardingSteps = 6

const nextOnboardingStep = () => {
  setOnboardingStep((step) =>
    Math.min(step + 1, totalOnboardingSteps),
  )
}

const previousOnboardingStep = () => {
  setOnboardingStep((step) =>
    Math.max(step - 1, 1),
  )
}
const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [showCookieNotice, setShowCookieNotice] = useState(true)
  const [signedInUser, setSignedInUser] = useState<{ username: string; role: Role } | null>(() => {
    const savedSession = sessionStorage.getItem('katibaUserSession')
    if (!savedSession) return null

    try {
      const savedUser = JSON.parse(savedSession) as {
        username?: string
        role?: string
      }

      if (
        savedUser.username &&
        ['Author'].includes(savedUser.role ?? '')
      ) {
        return {
          username: savedUser.username,
          role: savedUser.role as Role,
        }
      }
    } catch {
      return null
    }

    return null
  })
  const [darkMode, setDarkMode] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setMessage('')
  setBusy(true)

  try {
    if (mode === 'signup') {
      const response = await fetch('/api/users/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          username,
          password,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        setMessage(JSON.stringify(result))
        return
      }

      setMessage('Author account created. Sign in to complete your profile.')
      setMode('signin')
      setRole('Author')
      setPassword('')
      return
    }

    const loginResponse = await fetch('/api/users/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const login = await loginResponse.json()

    if (!loginResponse.ok || !login.access) {
      setMessage(login.detail || 'Login failed. Check your username and password.')
      return
    }

    const meResponse = await fetch('/api/users/me/', {
      headers: { Authorization: `Bearer ${login.access}` },
    })
    const account = await meResponse.json()

    if (!meResponse.ok) {
      setMessage(account.detail || 'Could not load your author account.')
      return
    }

    sessionStorage.setItem(
      'katibaUserSession',
      JSON.stringify({
        username: account.username,
        role: 'Author',
        access: login.access,
      }),
    )

    setSignedInUser({
      username: account.username,
      role: 'Author',
    })
    setPassword('')
navigate(
  account.profile_complete ? 'dashboard' : 'onboarding',
  account.profile_complete
    ? '/author/dashboard'
    : '/author/complete-profile',
)  } catch {
    setMessage('Could not reach the server. Check that Django is running.')
  } finally {
    setBusy(false)
  }
}

async function handleAuthorProfileSubmit(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault()
  setMessage('')
  setBusy(true)

  try {
    const savedSession = sessionStorage.getItem('katibaUserSession')

if (!savedSession) {
  setMessage('Your session has expired. Please sign in again.')
  navigate('auth', '/signin')
  return
}

    const session = JSON.parse(savedSession) as {
      access?: string
    }

    if (!session.access) {
  setMessage('Your session has expired. Please sign in again.')
  navigate('auth', '/signin')
  return
}

    const response = await fetch('/api/users/author/profile/', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access}`,
      },
      body: JSON.stringify({
  professional_title: professionalTitle,
  preferred_byline: preferredByline,
  organisation,
  location,
  phone_number: phoneNumber,

  years_of_experience: yearsOfExperience,
  highest_education: highestEducation,
  journalism_training: journalismTraining,
  previous_media_experience: previousMediaExperience,

  portfolio_url: portfolioUrl,
  linkedin_url: linkedinUrl,
  published_work: publishedWork,

  primary_expertise: primaryExpertise,
  secondary_expertise: secondaryExpertise,
  reporting_beats: reportingBeats,
  content_types: contentTypes,
  languages,
  geographic_coverage: geographicCoverage,

  writing_experience: writingExperience,
  investigative_experience: investigativeExperience,
  fact_checking_experience: factCheckingExperience,
  source_verification_experience: sourceVerificationExperience,

  topics_of_interest: topicsOfInterest,
  motivation_to_join: motivationToJoin,

  conflicts_of_interest: conflictsOfInterest,
  editorial_standards_agreement: editorialStandardsAgreement,
  additional_information: additionalInformation,

  areas_of_expertise: areasOfExpertise,
  biography,
}),
    })
    const result = await response.json()

    if (!response.ok) {
      setMessage(JSON.stringify(result))
      return
    }

    setMessage('')
   navigate('dashboard', '/author/dashboard')
  } catch {
    setMessage('Could not save your profile. Check that Django is running.')
  } finally {
    setBusy(false)
  }
}

  function openAuth(nextMode: Mode = 'signin') {
  setMode(nextMode)
  setMessage('')

  if (nextMode === 'signup') {
    navigate('auth', '/signup')
  } else {
    navigate('auth', '/signin')
  }
}

  if (view === 'onboarding') {
  return (
    <main className="auth-page">
      <header className="site-header">
        <button
          className="brand"
          type="button"
          onClick={() => navigate('home', '/')}
        >
          Katiba News
        </button>
        <button
          className="back-home"
          type="button"
          onClick={() => navigate('home', '/')}
        >
          Back to news
        </button>
      </header>

      <section className="welcome">
        <div className="intro">
          <p className="eyebrow">AUTHOR REGISTRATION</p>
          <h1>
            Tell us about
            <br />
            your <em>work.</em>
          </h1>
          <p className="intro-copy">
            Complete this short profile to access your Author dashboard.
          </p>
        </div>

        <form className="login-card" onSubmit={handleAuthorProfileSubmit}>
  <p className="eyebrow">YOUR AUTHOR PROFILE</p>
  <h2>Complete registration</h2>
  <p className="hint">
    These details help us understand your writing experience and interests.
  </p>

  <div className="onboarding-progress">
    <span>
      Page {onboardingStep} of {totalOnboardingSteps}
    </span>

    <div className="progress-track">
      <div
        className="progress-bar"
        style={{
          width: `${(onboardingStep / totalOnboardingSteps) * 100}%`,
        }}
      />
    </div>
  </div>
{onboardingStep === 1 && (
  <>
          <label htmlFor="professionalTitle">Professional title</label>
          <input
            id="professionalTitle"
            value={professionalTitle}
            onChange={(event) => setProfessionalTitle(event.target.value)}
            placeholder="For example: Freelance journalist"
            required
          />

          <label htmlFor="organisation">Organisation</label>
          <input
            id="organisation"
            value={organisation}
            onChange={(event) => setOrganisation(event.target.value)}
            placeholder="Optional"
          />

          <label htmlFor="location">Location</label>
          <input
            id="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="For example: Nairobi, Kenya"
            required
          />

          <label htmlFor="areasOfExpertise">Areas of expertise</label>
          <input
            id="areasOfExpertise"
            value={areasOfExpertise}
            onChange={(event) => setAreasOfExpertise(event.target.value)}
            placeholder="For example: Governance, public finance"
            required
          />

          <label htmlFor="biography">Short biography</label>
          <textarea
            id="biography"
            value={biography}
            onChange={(event) => setBiography(event.target.value)}
            placeholder="Tell us about your writing experience and interests."
            rows={5}
            required
          />
          <label htmlFor="preferredByline">Preferred author/byline name</label>
<input
  id="preferredByline"
  value={preferredByline}
  onChange={(event) => setPreferredByline(event.target.value)}
  placeholder="How should your name appear on published articles?"
/>

<label htmlFor="phoneNumber">Phone number</label>
<input
  id="phoneNumber"
  value={phoneNumber}
  onChange={(event) => setPhoneNumber(event.target.value)}
  placeholder="For example: +254 7XX XXX XXX"
/>
    </>
)}
{onboardingStep === 2 && (
  <>
<label htmlFor="yearsOfExperience">Years of writing or journalism experience</label>
<input
  id="yearsOfExperience"
  value={yearsOfExperience}
  onChange={(event) => setYearsOfExperience(event.target.value)}
  placeholder="For example: 5 years"
/>

<label htmlFor="highestEducation">Highest level of education</label>
<input
  id="highestEducation"
  value={highestEducation}
  onChange={(event) => setHighestEducation(event.target.value)}
  placeholder="For example: Bachelor's degree in Journalism"
/>

<label htmlFor="journalismTraining">Journalism or media training</label>
<textarea
  id="journalismTraining"
  value={journalismTraining}
  onChange={(event) => setJournalismTraining(event.target.value)}
  placeholder="Describe any journalism, media, or communication training."
  rows={4}
/>

<label htmlFor="previousMediaExperience">
  Previous newsroom or media experience
</label>
<textarea
  id="previousMediaExperience"
  value={previousMediaExperience}
  onChange={(event) => setPreviousMediaExperience(event.target.value)}
  placeholder="Describe organizations, publications, stations, or platforms you have worked with."
  rows={4}
/>
  </>
)}

{onboardingStep === 3 && (
  <>
    <label htmlFor="portfolioUrl">
      Portfolio / personal website
    </label>
    <input
      id="portfolioUrl"
      type="url"
      value={portfolioUrl}
      onChange={(event) => setPortfolioUrl(event.target.value)}
      placeholder="https://example.com"
    />

    <label htmlFor="linkedinUrl">
      LinkedIn or professional profile
    </label>
    <input
      id="linkedinUrl"
      type="url"
      value={linkedinUrl}
      onChange={(event) => setLinkedinUrl(event.target.value)}
      placeholder="https://linkedin.com/in/yourname"
    />

    <label htmlFor="publishedWork">
      Published work / writing samples
    </label>
    <textarea
      id="publishedWork"
      value={publishedWork}
      onChange={(event) => setPublishedWork(event.target.value)}
      placeholder="Paste links to your published articles or writing samples."
      rows={7}
    />
  </>
)}

{onboardingStep === 4 && (
  <>
    <label htmlFor="areasOfExpertise">
      Areas of expertise
    </label>
    <input
      id="areasOfExpertise"
      value={areasOfExpertise}
      onChange={(event) => setAreasOfExpertise(event.target.value)}
      placeholder="For example: Governance, public finance"
      required
    />

    <label htmlFor="primaryExpertise">
      Primary area of expertise
    </label>
    <input
      id="primaryExpertise"
      value={primaryExpertise}
      onChange={(event) => setPrimaryExpertise(event.target.value)}
      placeholder="For example: Governance"
      required
    />

    <label htmlFor="secondaryExpertise">
      Secondary areas of expertise
    </label>
    <input
      id="secondaryExpertise"
      value={secondaryExpertise}
      onChange={(event) => setSecondaryExpertise(event.target.value)}
      placeholder="For example: Public finance, elections, law"
    />

    <label htmlFor="reportingBeats">
      Main reporting beats
    </label>
    <input
      id="reportingBeats"
      value={reportingBeats}
      onChange={(event) => setReportingBeats(event.target.value)}
      placeholder="For example: Politics, business, health"
      required
    />

    <label htmlFor="contentTypes">
      Types of content you produce
    </label>
    <input
      id="contentTypes"
      value={contentTypes}
      onChange={(event) => setContentTypes(event.target.value)}
      placeholder="For example: News, analysis, interviews"
    />

    <label htmlFor="languages">
      Languages you write or report in
    </label>
    <input
      id="languages"
      value={languages}
      onChange={(event) => setLanguages(event.target.value)}
      placeholder="For example: English, Kiswahili"
      required
    />

    <label htmlFor="geographicCoverage">
      Geographic areas you cover
    </label>
    <input
      id="geographicCoverage"
      value={geographicCoverage}
      onChange={(event) => setGeographicCoverage(event.target.value)}
      placeholder="For example: Kenya, East Africa"
    />
  </>
)}

{onboardingStep === 5 && (
  <>
    <label htmlFor="writingExperience">
      Describe your writing experience
    </label>
    <textarea
      id="writingExperience"
      value={writingExperience}
      onChange={(event) => setWritingExperience(event.target.value)}
      placeholder="Tell us about your writing style, experience, and areas of work."
      rows={6}
      required
    />

    <label htmlFor="investigativeExperience">
      Investigative journalism experience
    </label>
    <textarea
      id="investigativeExperience"
      value={investigativeExperience}
      onChange={(event) =>
        setInvestigativeExperience(event.target.value)
      }
      placeholder="Describe any investigative reporting experience."
      rows={5}
    />

    <label htmlFor="factCheckingExperience">
      Fact-checking experience
    </label>
    <textarea
      id="factCheckingExperience"
      value={factCheckingExperience}
      onChange={(event) =>
        setFactCheckingExperience(event.target.value)
      }
      placeholder="Describe your experience checking facts and claims."
      rows={5}
    />

    <label htmlFor="sourceVerificationExperience">
      Source verification experience
    </label>
    <textarea
      id="sourceVerificationExperience"
      value={sourceVerificationExperience}
      onChange={(event) =>
        setSourceVerificationExperience(event.target.value)
      }
      placeholder="How do you verify sources, documents, quotations, and information?"
      rows={5}
    />
  </>
)}

{onboardingStep === 6 && (
  <>
    <label htmlFor="topicsOfInterest">
      Topics you would like to cover for Katiba News
    </label>
    <textarea
      id="topicsOfInterest"
      value={topicsOfInterest}
      onChange={(event) => setTopicsOfInterest(event.target.value)}
      placeholder="Tell us the subjects and issues you would like to report on."
      rows={6}
      required
    />

    <label htmlFor="motivationToJoin">
      Why would you like to write for Katiba News?
    </label>
    <textarea
      id="motivationToJoin"
      value={motivationToJoin}
      onChange={(event) => setMotivationToJoin(event.target.value)}
      placeholder="Tell us why you want to contribute to Katiba News."
      rows={6}
      required
    />

    <label htmlFor="conflictsOfInterest">
      Professional conflicts of interest
    </label>
    <textarea
      id="conflictsOfInterest"
      value={conflictsOfInterest}
      onChange={(event) => setConflictsOfInterest(event.target.value)}
      placeholder="Tell us about any professional, financial, organizational, or other conflicts. Write 'None' where applicable."
      rows={5}
    />

    <label className="checkbox-row">
      <input
        type="checkbox"
        checked={editorialStandardsAgreement}
        onChange={(event) =>
          setEditorialStandardsAgreement(event.target.checked)
        }
        required
      />
      <span>
        I agree to follow Katiba News editorial, accuracy, and
        fact-checking standards.
      </span>
    </label>

    <label htmlFor="additionalInformation">
      Anything else you would like the editorial team to know?
    </label>
    <textarea
      id="additionalInformation"
      value={additionalInformation}
      onChange={(event) =>
        setAdditionalInformation(event.target.value)
      }
      placeholder="Add any other information that may help the editorial team."
      rows={5}
    />
  </>
)}

 <div className="onboarding-actions">
  {onboardingStep > 1 && (
    <button
      type="button"
      className="secondary-action"
      onClick={previousOnboardingStep}
    >
      ← Back
    </button>
  )}

  {onboardingStep < totalOnboardingSteps ? (
    <button
      type="button"
      className="submit"
      onClick={nextOnboardingStep}
    >
      Next →
    </button>
  ) : (
    <button
      className="submit"
      type="submit"
      disabled={busy}
    >
      {busy ? 'Saving…' : 'Complete registration'}
    </button>
  )}
</div>

          {message && <p className="message" role="status">{message}</p>}
        </form>
      </section>

      <footer className="auth-footer">Katiba News Authors</footer>
    </main>
  )
}

if (view === 'dashboard') {
  return (
    <main className="auth-page">
      <header className="site-header">
        <button
          className="brand"
          type="button"
          onClick={() => navigate('home', '/')}
        >
          Katiba News
        </button>
        <button
          className="back-home"
          type="button"
          onClick={() => navigate('home', '/')}
        >
          Back to news
        </button>
      </header>

      <section className="welcome">
        <div className="intro">
          <p className="eyebrow">AUTHOR DASHBOARD</p>
          <h1>
            Your voice
            <br />
            matters <em>here.</em>
          </h1>
          <p className="intro-copy">
            Use your author space to prepare articles and contribute to the public conversation.
          </p>
        </div>

        <section className="login-card">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>{signedInUser?.username || 'Author'}</h2>
          <p className="hint">Your author profile is complete.</p>

          <div className="dashboard-summary">
            <div>
              <strong>Profile</strong>
              <span>Complete</span>
            </div>
            <div>
              <strong>Workspace</strong>
              <span>Ready for your next article</span>
            </div>
          </div>

          <button
            className="submit"
            type="button"
            onClick={() => navigate('home', '/')}
          >
            Go to author tools
          </button>
        </section>
      </section>

      <footer className="auth-footer">Katiba News Authors</footer>
    </main>
  )
}
  if (view === 'auth') {
    return (
      <main className="auth-page">
        <header className="site-header">
          <button className="brand" type="button" onClick={() => navigate('home', '/')}>
            Katiba News
          </button>
          <button className="back-home" type="button" onClick={() => navigate('home', '/')}>
            Back to news
          </button>
        </header>

        <section className="welcome">
          <div className="intro">
            <p className="eyebrow">THE NEWSROOM, CONNECTED</p>
            <h1>Stories that shape<br />our <em>future.</em></h1>
            <p className="intro-copy">
              Thoughtful reporting on the ideas, people, and decisions shaping Kenya.
            </p>
          </div>

          <form className="login-card" onSubmit={handleSubmit}>
            <p className="eyebrow">YOUR NEWSROOM</p>
            <h2>{mode === 'signin' ? 'Welcome back' : 'Create an account'}</h2>
            <p className="hint">
              {mode === 'signin'
                ? 'Sign in to complete your author profile or open your dashboard.'
                : 'Create your Author account to get started.'}
            </p>

            <div className="role-options" aria-label="Choose sign-in or sign-up">
              <button
                type="button"
                className={mode === 'signin' ? 'role selected' : 'role'}
                onClick={() => {
                  setMode('signin')
                  setMessage('')
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === 'signup' ? 'role selected' : 'role'}
                onClick={() => {
                  setMode('signup')
                  setMessage('')
                }}
              >
                Sign up
              </button>
            </div>



            {mode === 'signup' && (
              <>
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  required
                />
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  required
                />
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </>
            )}

            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
            />

            <button className="submit" type="submit" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'signin'
                  ? `Sign in as ${role}`
                  : 'Create Author account'}
            </button>

            {message && <p className="message" role="status">{message}</p>}
          </form>
        </section>

        <footer className="auth-footer">Authors</footer>
      </main>
    )
  }

  const filteredLatest = latestStories.filter((story) =>
    story.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <main className={`news-home ${darkMode ? 'dark-mode' : ''}`} id="top">
      <header className="news-header">
        <div className="masthead">
          <button className="news-logo" type="button" onClick={() => navigate('home', '/')}>
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
              onChange={(event) => setSearch(event.target.value)}
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
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? '☀' : '☾'}
            </button>

            {signedInUser ? (
  <button
    className="header-signin"
    type="button"
   onClick={() => {
  sessionStorage.removeItem('katibaUserSession')
  setSignedInUser(null)
}}
  >
    Sign out
  </button>
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
        <nav className="news-nav" aria-label="Main navigation">
          <a href="#top">Home</a>
          <a href="#your-news">Your News</a>
          <a href="#guest-analysis">Guest Analysis</a>
          <a href="#events">Events</a>
          <a href="#shows">Shows</a>
          <a href="#business-intelligence">Business Intelligence</a>
          {!signedInUser && (
  <button type="button" onClick={() => openAuth('signup')}>
  Become an author?
</button>
)}
        </nav>
      </header>

      <div className="page-content">
                <section className="lead-latest" id="latest">
          <article className="lead-story">
            <div className="lead-art" aria-hidden="true" />
            <div className="lead-copy">
              <span className="story-category">GOVERNANCE</span>
              <h1>Understanding the decisions that shape Kenya</h1>
              <p>
                The latest reporting and clear explanations on public life,
                policy, and the Constitution.
              </p>
              <a href="#your-news">Explore the story →</a>
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
              {filteredLatest.length === 0 && <p>No headlines match your search.</p>}
            </div>
          </aside>
        </section>

        <section className="content-section" id="featured">
          <div className="section-heading">
            <div>
              <span className="section-kicker">KATIBA NEWS</span>
              <h2>Featured</h2>
            </div>
            <CarouselControls target="featured-row" />
          </div>

          <div className="featured-row horizontal-row" id="featured-row">
            <article className="featured-promo">
              <span className="story-category">KATIBA EXPLAINER</span>
              <h3>Understand the decisions that shape your community</h3>
              <p>Clear guides to the Constitution, public services, and your rights.</p>
              <a href="#your-news">Explore the news <span>→</span></a>
            </article>

            {featuredStories.map((story) => (
              <article className="feature-card" key={story.title}>
                <div className={`image-panel ${story.art}`}>
                  <span>{story.category}</span>
                </div>
                <div className="feature-card-copy">
                  <span className="story-category">{story.category}</span>
                  <h3>{story.title}</h3>
                  <p>{story.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section" id="newsletters">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FROM OUR DESK</span>
              <h2>Newsletters</h2>
              <a className="view-all" href="#footer">View all newsletters →</a>
            </div>
            <CarouselControls target="newsletter-row" />
          </div>

          <div className="newsletter-row horizontal-row" id="newsletter-row">
            {newsletters.map((item) => (
              <article className="newsletter-card" key={item.title}>
                <div className={`newsletter-cover ${item.art}`}>
                  <span className="cover-date">{item.date}</span>
                  <strong>{item.title}</strong>
                  <span className="cover-mark">K</span>
                </div>
                <h3>{item.title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section" id="your-news">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FOLLOW THE ISSUES</span>
              <h2>Your News</h2>
            </div>
            <CarouselControls target="your-news-row" />
          </div>

          <div className="category-row horizontal-row" id="your-news-row">
            {newsCategories.map((category, index) => (
              <article className="category-column" key={category.name}>
                <h3>{category.name}</h3>
                {category.stories.map((title, storyIndex) => (
                  <a className="category-story" href="#latest" key={title}>
                    <div className={`mini-art mini-art-${index}-${storyIndex}`} />
                    <strong>{title}</strong>
                  </a>
                ))}
              </article>
            ))}
          </div>

          <div className="latest-block" id="latest">
            <h3>Latest updates</h3>
            <div className="latest-list">
              {filteredLatest.map((story) => (
                <article key={story.title}>
                  <time>{story.time}</time>
                  <a href="#latest">{story.title}</a>
                </article>
              ))}
              {filteredLatest.length === 0 && <p>No headlines match your search.</p>}
            </div>
          </div>
          <section className="max-w-6xl mx-auto px-4 py-12 space-y-16 border-t border-slate-100 mt-12">
            <ArticleReader />
            <ArticleEditor />
            <BlogView />
          </section>
        </section>

        <section className="content-section" id="guest-analysis">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PERSPECTIVES</span>
              <h2>Guest Analysis</h2>
            </div>
            <CarouselControls target="analysis-row" />
          </div>

          <div className="analysis-row horizontal-row" id="analysis-row">
            {guestArticles.map((article) => (
              <article className="analysis-card" key={article.title}>
                <div className={`analysis-art ${article.art}`} />
                <div className="analysis-copy">
                  <div className="author-line">
                    <span className="author-avatar">{article.initials}</span>
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

        <section className="content-section events-section" id="events">
          <div className="section-heading">
            <div>
              <span className="section-kicker">JOIN THE CONVERSATION</span>
              <h2>Events</h2>
            </div>
            <CarouselControls target="events-row" />
          </div>

          <div className="events-layout">
            <div className="events-intro">
              <h3>Upcoming events</h3>
              <p>Join public conversations, practical workshops, and community forums.</p>
            </div>
            <div className="events-row horizontal-row" id="events-row">
              {events.map((event) => (
                <article className="event-card" key={event.title}>
                  <div className={`event-art ${event.art}`} />
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

        <section className="content-section" id="shows">
          <div className="section-heading">
            <div>
              <span className="section-kicker">WATCH & LISTEN</span>
              <h2>Shows</h2>
            </div>
            <CarouselControls target="shows-row" />
          </div>

          <div className="shows-row horizontal-row" id="shows-row">
            {shows.map((show) => (
              <article className="show-card" key={show.title}>
                <div className={`show-art ${show.art}`}>
                  <span>KATIBA NEWS</span>
                  <strong>{show.title}</strong>
                </div>
                <h3>{show.title}</h3>
                <p>{show.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="business-section" id="business-intelligence">
          <div className="business-heading">
            <div>
              <span className="section-kicker">DATA FOR DECISIONS</span>
              <h2>Katiba News Business Intelligence</h2>
              <p>Useful context and tools for understanding Kenya’s economy and public sector.</p>
            </div>
            <button className="orange-button" type="button" onClick={() => openAuth('signup')}>
              Sign up <span>→</span>
            </button>
          </div>

          <div className="business-content">
            <div className="business-features">
              <article>
                <h3>Economic indicators</h3>
                <p>Follow key figures and understand what they mean.</p>
              </article>
              <article>
                <h3>Local and global insights</h3>
                <p>Explore analysis connecting Kenyan markets with wider trends.</p>
              </article>
              <article>
                <h3>Public finance</h3>
                <p>Get clearer context on budgets, revenue, and public spending.</p>
              </article>
              <article>
                <h3>Interactive data</h3>
                <p>Compare information through simple charts and visual guides.</p>
              </article>
            </div>

            <div className="business-preview">
              <span>BUSINESS INTELLIGENCE</span>
              <strong>Data. Context. Better decisions.</strong>
              <div className="preview-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer" id="footer">
        <div className="footer-brand">
          <strong>Katiba News</strong>
          <small>THE PEOPLE. THE LAW. THE FUTURE.</small>
          <p>Independent reporting and useful context for public life in Kenya.</p>
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
          <a href="mailto:hello@katibanews.example">Media and partnerships</a>
          <a href="#footer">Contact the newsroom →</a>
        </div>

        <div>
          <h3>About Katiba News</h3>
          <p>News and explanations focused on the Constitution, governance, rights, and public services.</p>
        </div>
      </footer>

      {showCookieNotice && (
        <div className="cookie-notice">
          <p>
            We use essential site storage to keep this demonstration working.
            Read our <a href="#footer">privacy information</a>.
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