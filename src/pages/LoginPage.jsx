import { useEffect, useId, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import StudioFigureStage from '../features/home3d/StudioFigureStage.jsx'
import { getZoneLabel } from '../features/home3d/studioZoneMapping.js'
import { useAuthStore } from '../features/auth/useAuthStore.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'

export default function LoginPage({ initialMode = 'login' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const {
    user,
    loading,
    error,
    signIn,
    register,
    clearError,
  } = useAuthStore()

  const mode =
    location.pathname === '/register' || searchParams.get('mode') === 'register'
      ? 'register'
      : initialMode

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')
  const [previewZone, setPreviewZone] = useState('chest')

  useDocumentTitle(user ? 'My Profile' : mode === 'register' ? 'Create account' : 'Sign in')

  const displayNameId = useId()
  const emailId = useId()
  const passwordId = useId()

  useEffect(() => () => clearError(), [clearError])

  function switchMode(nextMode) {
    setLocalError('')
    clearError()
    navigate(nextMode === 'register' ? '/register' : '/login', { replace: true })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLocalError('')
    clearError()

    const trimmedEmail = email.trim()
    if (mode === 'register' && displayName.trim().length < 2) {
      setLocalError('Display name must be at least 2 characters.')
      return
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setLocalError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }

    const result =
      mode === 'register'
        ? await register({ displayName: displayName.trim(), email: trimmedEmail, password })
        : await signIn({ email: trimmedEmail, password })

    if (result?.user) {
      setPassword('')
      navigate('/profile', { replace: true })
    }
  }

  const displayedError = localError || error

  if (user) {
    return <Navigate to="/profile" replace />
  }

  return (
    <div className="login-page">
      <div className="login-split-layout">
        <section className="login-panel" aria-labelledby="login-heading">
          <div className="login-panel__top">
            <p className="eyebrow">MEMBER ACCESS</p>
            <h1 id="login-heading" className="display">
              {mode === 'login' ? (
                <>Sign <em>in.</em></>
              ) : (
                <>Create <em>account.</em></>
              )}
            </h1>
            <p className="muted">
              {mode === 'login'
                ? 'Access your Fitness Explorer profile, body metrics, and synced workout plans.'
                : 'Create your training profile to save favorites, workout plans, and metrics across sessions.'}
            </p>
          </div>

          <div className="login-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'login-mode-tab is-active' : 'login-mode-tab'}
              onClick={() => switchMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'login-mode-tab is-active' : 'login-mode-tab'}
              onClick={() => switchMode('register')}
            >
              Create account
            </button>
          </div>

          {displayedError && (
            <p className="login-alert login-alert--error" role="alert">
              {displayedError}
            </p>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <div className="login-field">
                <label htmlFor={displayNameId}>Display name</label>
                <input
                  id={displayNameId}
                  type="text"
                  className="input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Alex Mercer"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
            )}

            <div className="login-field">
              <label htmlFor={emailId}>Email address</label>
              <input
                id={emailId}
                type="email"
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="athlete@fitnessexplorer.app"
                autoComplete="email"
                required
                maxLength={254}
              />
            </div>

            <div className="login-field">
              <label htmlFor={passwordId}>Password</label>
              <div className="login-password-wrap">
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="login-form__actions">
              <button type="submit" className="btn btn--primary glint" disabled={loading}>
                <span className="glint__label">
                  {loading
                    ? mode === 'login'
                      ? 'Signing in...'
                      : 'Creating account...'
                    : mode === 'login'
                      ? 'Sign in'
                      : 'Create account'}
                </span>
              </button>
              <Link to="/explore" className="btn btn--ghost">
                Browse as guest
              </Link>
            </div>
          </form>
        </section>

        <div className="login-stage-rail">
          <StudioFigureStage
            eyebrow="STUDIO PREVIEW"
            title={<>Train with <em>focus.</em></>}
            subtitle={`Inspect ${getZoneLabel(previewZone)} anatomy or select any muscle zone to jump straight into exercises.`}
            selectedZone={previewZone}
            cameraFocusZone={previewZone}
            onSelectZone={(zoneId) => setPreviewZone(zoneId)}
            onClearSelection={() => setPreviewZone('chest')}
            sticky={false}
            compactHeight
            footer={
              <div className="studio-stage__footer-row">
                <p className="studio-stage__footer-note">
                  Sessions issue short-lived bearer tokens paired with rotating auth_sessions refresh hashes.
                </p>
                <Link to="/explore" className="studio-stage__footer-link">
                  Explore {getZoneLabel(previewZone)} →
                </Link>
              </div>
            }
          />
        </div>
      </div>
    </div>
  )
}
