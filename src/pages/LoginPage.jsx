import { useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StudioFigureStage from '../features/home3d/StudioFigureStage.jsx'
import { getZoneLabel } from '../features/home3d/studioZoneMapping.js'
import { useAuthStore } from '../features/auth/useAuthStore.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'

function formatTimestamp(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortId(uuid) {
  if (!uuid) return '—'
  return `${String(uuid).slice(0, 8)}...`
}

function SessionStatusBadge({ status }) {
  const normalized = status || 'active'
  const labels = {
    active: 'Active',
    rotated: 'Rotated',
    revoked: 'Revoked',
    expired: 'Expired',
  }
  return (
    <span className={`auth-session-status auth-session-status--${normalized}`}>
      {labels[normalized] || normalized}
    </span>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const {
    user,
    session,
    sessions,
    schemaMetadata,
    loading,
    error,
    signIn,
    register,
    rotateSession,
    revokeSession,
    signOut,
    signOutAll,
    fetchSessions,
    clearError,
  } = useAuthStore()

  useDocumentTitle(user ? 'Account' : 'Sign in')

  const [mode, setMode] = useState('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')
  const [statusNotice, setStatusNotice] = useState('')
  const [previewZone, setPreviewZone] = useState('chest')

  const displayNameId = useId()
  const emailId = useId()
  const passwordId = useId()

  useEffect(() => {
    if (user && sessions.length === 0) {
      fetchSessions()
    }
  }, [user, sessions.length, fetchSessions])

  function switchMode(nextMode) {
    setMode(nextMode)
    setLocalError('')
    setStatusNotice('')
    clearError()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLocalError('')
    setStatusNotice('')
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
      setStatusNotice(
        mode === 'register'
          ? 'Account created and AuthSession initialized.'
          : 'Signed in. Session active in memory.',
      )
    }
  }

  async function handleRotate() {
    setStatusNotice('')
    const rotated = await rotateSession()
    if (rotated?.session) {
      setStatusNotice(`Session rotated into family ${shortId(rotated.session.tokenFamilyId)}.`)
    }
  }

  const displayedError = localError || error

  if (user) {
    return (
      <div className="login-page">
        <header className="page-heading login-hero">
          <div className="login-hero__copy">
            <div className="login-hero__top">
              <p className="eyebrow">AUTHENTICATED MEMBER</p>
              <span className="login-hero__sep" aria-hidden="true">/</span>
              <span className="login-hero__context">AuthSession Active</span>
            </div>
            <h1 className="display">Welcome, <em>{user.displayName}.</em></h1>
            <p className="muted">
              Signed in as {user.email}. Your active token family and rotated session ledger are backed by the auth_sessions schema.
            </p>
            <div className="login-hero__actions">
              <button type="button" className="btn btn--primary glint" onClick={() => navigate('/')}>
                <span className="glint__label">Open dashboard</span>
              </button>
              <button type="button" className="btn btn--ghost" onClick={handleRotate} disabled={loading}>
                Rotate refresh token
              </button>
              <button type="button" className="btn btn--ghost" onClick={signOut} disabled={loading}>
                Sign out
              </button>
            </div>
          </div>

          <dl className="login-hero__metrics" aria-label="Account targets and session summary">
            <div className="login-metric">
              <dt>Weekly Goal</dt>
              <dd>{user.weeklyWorkoutGoal}<span>/wk</span></dd>
            </div>
            <div className="login-metric">
              <dt>Monthly Goal</dt>
              <dd>{user.monthlyWorkoutGoal}<span>/mo</span></dd>
            </div>
            <div className="login-metric">
              <dt>Sessions</dt>
              <dd>{sessions.length}</dd>
            </div>
          </dl>
        </header>

        {(statusNotice || displayedError) && (
          <p className={displayedError ? 'login-alert login-alert--error' : 'login-alert login-alert--ok'} role={displayedError ? 'alert' : 'status'}>
            {displayedError || statusNotice}
          </p>
        )}

        <div className="login-account-grid">
          <section className="login-sessions-panel" aria-labelledby="sessions-heading">
            <div className="login-panel__head">
              <div>
                <p className="eyebrow">SESSION LEDGER</p>
                <h2 id="sessions-heading" className="display">Active <em>sessions</em></h2>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={signOutAll} disabled={loading}>
                Revoke all sessions
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="muted">No session records found.</p>
            ) : (
              <ul className="auth-session-list">
                {sessions.map((item) => {
                  const isCurrent = session?.id === item.id
                  const isRevocable = item.status === 'active'
                  return (
                    <li
                      key={item.id}
                      className={`auth-session-item${isCurrent ? ' is-current' : ''}`}
                    >
                      <div className="auth-session-item__main">
                        <div className="auth-session-item__title">
                          <span className="auth-session-item__id">{shortId(item.id)}</span>
                          {isCurrent && <span className="auth-session-current-tag">Current</span>}
                          <SessionStatusBadge status={item.status} />
                        </div>
                        <dl className="auth-session-item__meta">
                          <div>
                            <dt>Family</dt>
                            <dd>{shortId(item.tokenFamilyId)}</dd>
                          </div>
                          <div>
                            <dt>Last used</dt>
                            <dd>{formatTimestamp(item.lastUsedAt)}</dd>
                          </div>
                          <div>
                            <dt>Expires</dt>
                            <dd>{formatTimestamp(item.expiresAt)}</dd>
                          </div>
                          {item.replacedBySessionId && (
                            <div>
                              <dt>Replaced by</dt>
                              <dd>{shortId(item.replacedBySessionId)}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                      {isRevocable && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => revokeSession(item.id)}
                          disabled={loading}
                        >
                          {isCurrent ? 'Sign out' : 'Revoke'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {schemaMetadata && (
            <section className="login-schema-panel" aria-labelledby="schema-heading">
              <div className="login-panel__head">
                <div>
                  <p className="eyebrow">TABLE SCHEMA</p>
                  <h2 id="schema-heading" className="display"><em>{schemaMetadata.tableName}</em> columns</h2>
                </div>
                <span className="login-schema-count">{schemaMetadata.columns.length} columns</span>
              </div>
              <div className="login-schema-table-wrap">
                <table className="login-schema-table">
                  <thead>
                    <tr>
                      <th scope="col">Column</th>
                      <th scope="col">Type</th>
                      <th scope="col">Constraint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schemaMetadata.columns.map((col) => (
                      <tr key={col.name}>
                        <td className="login-schema-col">{col.name}</td>
                        <td className="login-schema-type">{col.type}</td>
                        <td className="login-schema-constraint">
                          {col.primaryKey
                            ? 'PRIMARY KEY'
                            : col.unique
                              ? 'UNIQUE'
                              : col.references
                                ? `FK -> ${col.references.table}.${col.references.column}`
                                : col.nullable
                                  ? 'NULLABLE'
                                  : 'NOT NULL'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    )
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
                ? 'Access your Fitness Explorer studio with rotating session tokens backed by the AuthSession schema.'
                : 'Create your training profile to start an authenticated session with rotating refresh tokens.'}
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
