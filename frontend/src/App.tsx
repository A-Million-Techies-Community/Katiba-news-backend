import LandingPage from './landing/LandingPage'
import { DashboardLayout, ThemeToggle } from './dashboard'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

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

function App() {
  const [mode, setMode] = useState<Mode>(() =>
  window.location.pathname === '/signup' ? 'signup' : 'signin',
)

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
  return <DashboardLayout workspace="AUTHOR WORKSPACE" items={[
    { id: 'overview', label: '⌂ Dashboard' },
    { id: 'news', label: 'Newsroom' },
    { id: 'profile', label: 'Author profile' },
  ]} activeItem="overview" onNavigate={id => {
    if (id === 'news') window.location.assign('/news/dashboard')
    if (id === 'profile') navigate('onboarding')
  }}>
    <header className="nd-top"><a href="/">Katiba News</a><div className="nd-account"><ThemeToggle /><b className="nd-avatar">{(signedInUser?.username || 'A').slice(0, 1).toUpperCase()}</b><span><strong>{signedInUser?.username || 'Author'}</strong><small>Author</small></span><button type="button" onClick={() => { sessionStorage.removeItem('katibaUserSession'); setSignedInUser(null); navigate('home') }}>Sign out</button></div></header>
    <div className="nd-heading"><div><p className="nd-eyebrow">YOUR WORDS, YOUR WORKSPACE</p><h1>Welcome back, {signedInUser?.username || 'Author'}!</h1><p>Prepare articles and contribute to the public conversation.</p></div></div>
    <section className="nd-panel"><h2>Your author workspace</h2><p>Your author profile is complete. Open the newsroom to write and follow your stories through review.</p><button className="nd-primary" type="button" onClick={() => window.location.assign('/news/dashboard')}>Open newsroom →</button></section>
  </DashboardLayout>
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

  return <LandingPage signedInUser={signedInUser} onHome={() => navigate('home', '/')} onOpenAuth={openAuth} onSignOut={() => {
    sessionStorage.removeItem('katibaUserSession')
    setSignedInUser(null)
  }} />
}

export default App
