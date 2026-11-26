import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/useAuthStore.js'
import { splitDisplayName, useProfileStore } from '../features/auth/useProfileStore.js'
import { useTheme } from '../features/theme/themeContext.js'
import { useWorkoutStore } from '../features/workout/useWorkoutStore.js'
import { calculateWorkoutProgress } from '../features/workout/workoutProgress.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { resolveAuthMediaUrl } from '../services/authApi.js'

const KG_TO_LB = 2.2046226218
const CM_TO_IN = 0.3937007874

function formatShortDate(dateValue) {
  if (!dateValue) return '—'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

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

function toDisplayWeight(weightKg, units) {
  if (weightKg == null || !Number.isFinite(Number(weightKg))) return ''
  const kg = Number(weightKg)
  const value = units === 'imperial' ? kg * KG_TO_LB : kg
  return String(Math.round(value * 10) / 10)
}

function toStorageWeightKg(rawValue, units) {
  if (rawValue === '' || rawValue == null) return null
  const num = Number(rawValue)
  if (!Number.isFinite(num) || num <= 0) return null
  const kg = units === 'imperial' ? num / KG_TO_LB : num
  return Math.round(kg * 10) / 10
}

function toDisplayHeight(heightCm, units) {
  if (heightCm == null || !Number.isFinite(Number(heightCm))) return ''
  const cm = Number(heightCm)
  const value = units === 'imperial' ? cm * CM_TO_IN : cm
  return String(Math.round(value * 10) / 10)
}

function toStorageHeightCm(rawValue, units) {
  if (rawValue === '' || rawValue == null) return null
  const num = Number(rawValue)
  if (!Number.isFinite(num) || num <= 0) return null
  const cm = units === 'imperial' ? num / CM_TO_IN : num
  return Math.round(cm * 10) / 10
}

function getInitials(name, email) {
  const source = (name || email || 'FE').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function ProfileAvatar({ avatarUrl, name, email, size = 'lg' }) {
  const [failedUrl, setFailedUrl] = useState('')
  const resolvedUrl = resolveAuthMediaUrl(avatarUrl)
  const showImage = Boolean(resolvedUrl) && failedUrl !== resolvedUrl

  return (
    <div className={`profile-avatar profile-avatar--${size}`}>
      {showImage ? (
        <img
          src={resolvedUrl}
          alt={`${name || 'Member'} profile photo`}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(resolvedUrl)}
        />
      ) : (
        <span className="profile-avatar__initials" aria-hidden="true">
          {getInitials(name, email)}
        </span>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="profile-page" aria-busy="true" aria-label="Loading profile">
      <div className="profile-grid">
        <section className="profile-card profile-overview-card profile-skeleton-card">
          <div className="profile-skeleton-circle" />
          <div className="profile-skeleton-line profile-skeleton-line--title" />
          <div className="profile-skeleton-line profile-skeleton-line--sub" />
          <div className="profile-skeleton-grid" />
        </section>
        <section className="profile-card profile-edit-card profile-skeleton-card">
          <div className="profile-skeleton-line profile-skeleton-line--title" />
          <div className="profile-skeleton-line" />
          <div className="profile-skeleton-line" />
          <div className="profile-skeleton-line" />
        </section>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  useDocumentTitle('My Profile')
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const {
    user,
    restoring,
    session,
    sessions,
    sessionsLoaded,
    schemaMetadata,
    profileSchemaMetadata,
    loading,
    error,
    clearError,
    fetchSessions,
    rotateSession,
    revokeSession,
    signOut,
    signOutAll,
    updateProfileDetails,
    changePassword,
    uploadAvatar,
    removeAvatar,
  } = useAuthStore()

  const profile = useProfileStore((state) => state.profile)
  const updateProfileStore = useProfileStore((state) => state.updateProfile)

  const plans = useWorkoutStore((state) => state.plans)
  const history = useWorkoutStore((state) => state.history)
  const goals = useWorkoutStore((state) => state.goals)
  const activeSession = useWorkoutStore((state) => state.activeSession)
  const updateWorkoutGoals = useWorkoutStore((state) => state.updateWorkoutGoals)

  const [activeTab, setActiveTab] = useState('general')
  const [mobileView, setMobileView] = useState('overview')
  const [draft, setDraft] = useState(null)
  const [notice, setNotice] = useState('')
  const [localError, setLocalError] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSchemaTable, setShowSchemaTable] = useState(false)
  const [showProfileSchemaTable, setShowProfileSchemaTable] = useState(false)

  const fileInputRef = useRef(null)
  const firstNameInputRef = useRef(null)

  const firstNameId = useId()
  const lastNameId = useId()
  const emailId = useId()
  const handleId = useId()
  const phoneId = useId()
  const bioId = useId()
  const locationId = useId()
  const weightId = useId()
  const targetWeightId = useId()
  const heightId = useId()
  const heartRateId = useId()
  const measurementDateId = useId()
  const currentPasswordId = useId()
  const newPasswordId = useId()
  const confirmPasswordId = useId()

  useEffect(() => () => clearError(), [clearError])

  useEffect(() => {
    if (user && !sessionsLoaded) {
      fetchSessions()
    }
  }, [user, sessionsLoaded, fetchSessions])

  const stats = useMemo(() => calculateWorkoutProgress(history), [history])

  const derivedNames = useMemo(
    () => splitDisplayName(user?.displayName || ''),
    [user?.displayName],
  )

  const baseUnits = profile.units || 'metric'
  const activeUnits = draft?.units ?? baseUnits

  const baseForm = {
    firstName: profile.firstName || derivedNames.firstName,
    lastName: profile.lastName || derivedNames.lastName,
    email: user?.email || '',
    handle: profile.handle || '',
    phone: profile.phone || '',
    location: profile.location || '',
    bio: profile.bio || '',
    units: baseUnits,
    weightDisplay: toDisplayWeight(profile.weightKg, baseUnits),
    targetWeightDisplay: toDisplayWeight(profile.targetWeightKg, baseUnits),
    heightDisplay: toDisplayHeight(profile.heightCm, baseUnits),
    restingHeartRate:
      profile.restingHeartRate != null ? String(profile.restingHeartRate) : '',
    latestMeasurementDate: profile.latestMeasurementDate
      ? String(profile.latestMeasurementDate).slice(0, 10)
      : '',
  }

  const form = draft ? { ...baseForm, ...draft } : baseForm

  if (restoring && !user) {
    return <ProfileSkeleton />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const avatarUrl = profile.avatarUrl || user.avatarUrl || ''
  const fullName =
    [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ') ||
    user.displayName

  const latestWorkoutDate = stats.latestCompletedAt
    ? formatShortDate(stats.latestCompletedAt)
    : 'None'

  const currentWeightDisplay =
    profile.weightKg != null
      ? `${toDisplayWeight(profile.weightKg, activeUnits)} ${activeUnits === 'imperial' ? 'lb' : 'kg'}`
      : '—'

  const measurementDisplay = profile.latestMeasurementDate
    ? formatShortDate(profile.latestMeasurementDate)
    : profile.targetWeightKg != null
      ? `${toDisplayWeight(profile.targetWeightKg, activeUnits)} ${activeUnits === 'imperial' ? 'lb' : 'kg'}`
      : '—'

  const measurementLabel = profile.latestMeasurementDate
    ? 'Latest Check-in'
    : profile.targetWeightKg != null
      ? 'Target Weight'
      : 'Latest Check-in'

  const sixthMetricValue =
    profile.restingHeartRate != null ? `${profile.restingHeartRate} bpm` : `${stats.totalWorkouts}`
  const sixthMetricLabel =
    profile.restingHeartRate != null ? 'Heart Rate' : 'Sessions Done'

  function updateField(field, value) {
    setNotice('')
    setLocalError('')
    setDraft((prev) => ({ ...(prev || {}), [field]: value }))
  }

  function handleUnitsChange(nextUnits) {
    if (nextUnits === activeUnits) return
    const currentWeightKg = toStorageWeightKg(form.weightDisplay, activeUnits)
    const currentTargetKg = toStorageWeightKg(form.targetWeightDisplay, activeUnits)
    const currentHeightCm = toStorageHeightCm(form.heightDisplay, activeUnits)

    setDraft((prev) => ({
      ...(prev || {}),
      units: nextUnits,
      weightDisplay: toDisplayWeight(currentWeightKg, nextUnits),
      targetWeightDisplay: toDisplayWeight(currentTargetKg, nextUnits),
      heightDisplay: toDisplayHeight(currentHeightCm, nextUnits),
    }))
  }

  function openEditSection(tabName = 'general') {
    setActiveTab(tabName)
    setMobileView('edit')
    if (tabName === 'general') {
      requestAnimationFrame(() => firstNameInputRef.current?.focus())
    }
  }

  async function handleSaveGeneral(event) {
    event.preventDefault()
    setNotice('')
    setLocalError('')
    clearError()

    const nextFirst = form.firstName.trim()
    const nextLast = form.lastName.trim()
    const nextDisplayName = [nextFirst, nextLast].filter(Boolean).join(' ')
    const nextEmail = form.email.trim()

    if (nextDisplayName.length < 2) {
      setLocalError('Please enter at least 2 characters for your name.')
      return
    }
    if (!nextEmail || !nextEmail.includes('@')) {
      setLocalError('Please enter a valid email address.')
      return
    }

    if (nextDisplayName !== user.displayName || nextEmail !== user.email) {
      const updated = await updateProfileDetails({
        displayName: nextDisplayName,
        email: nextEmail,
      })
      if (!updated) return
    }

    updateProfileStore({
      firstName: nextFirst,
      lastName: nextLast,
      handle: form.handle.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
    })
    setDraft(null)
    setNotice('General profile saved.')
  }

  async function handleSaveBodyAndLocation(event) {
    event.preventDefault()
    setNotice('')
    setLocalError('')
    clearError()

    const weightKg = toStorageWeightKg(form.weightDisplay, activeUnits)
    const targetWeightKg = toStorageWeightKg(form.targetWeightDisplay, activeUnits)
    const heightCm = toStorageHeightCm(form.heightDisplay, activeUnits)
    const hr = form.restingHeartRate.trim() ? Number(form.restingHeartRate) : null

    if (form.weightDisplay.trim() && (weightKg === null || weightKg < 20 || weightKg > 400)) {
      setLocalError('Enter a realistic weight measurement.')
      return
    }
    if (form.targetWeightDisplay.trim() && (targetWeightKg === null || targetWeightKg < 20 || targetWeightKg > 400)) {
      setLocalError('Enter a realistic target weight.')
      return
    }
    if (form.heightDisplay.trim() && (heightCm === null || heightCm < 80 || heightCm > 260)) {
      setLocalError('Enter a realistic height measurement.')
      return
    }
    if (hr !== null && (!Number.isFinite(hr) || hr < 30 || hr > 220)) {
      setLocalError('Resting heart rate must be between 30 and 220 bpm.')
      return
    }

    const hasBiometricChange =
      weightKg !== profile.weightKg ||
      targetWeightKg !== profile.targetWeightKg ||
      heightCm !== profile.heightCm ||
      hr !== profile.restingHeartRate

    const nextMeasurementDate =
      form.latestMeasurementDate ||
      (hasBiometricChange ? new Date().toISOString().slice(0, 10) : profile.latestMeasurementDate)

    updateProfileStore({
      location: form.location.trim(),
      units: activeUnits,
      weightKg,
      targetWeightKg,
      heightCm,
      restingHeartRate: hr,
      latestMeasurementDate: nextMeasurementDate,
    })
    setDraft(null)
    setNotice('Body metrics and location saved.')
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setNotice('')
    setLocalError('')
    clearError()

    if (!currentPassword) {
      setLocalError('Enter your current password.')
      return
    }
    if (newPassword.length < 8) {
      setLocalError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setLocalError('New passwords do not match.')
      return
    }

    const ok = await changePassword({ currentPassword, newPassword })
    if (ok) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      setNotice('Password updated.')
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setNotice('')
    setLocalError('')
    clearError()
    const result = await uploadAvatar(file)
    if (result?.avatarUrl) {
      setNotice('Profile photo updated.')
    }
  }

  async function handleRemoveAvatar() {
    setNotice('')
    setLocalError('')
    clearError()
    const ok = await removeAvatar()
    if (ok) {
      setNotice('Profile photo removed.')
    }
  }

  function getPlanProgressBadge(plan) {
    const total = plan.exercises?.length || 0
    if (activeSession && activeSession.planId === plan.id) {
      const done = activeSession.exercises.filter((item) => item.status === 'completed').length
      return { text: `${done}/${total}`, tone: 'active' }
    }
    return { text: `${total} ex`, tone: 'idle' }
  }

  const displayedError = localError || error

  return (
    <div className={`profile-page profile-page--${mobileView}`}>
      <header className="page-heading profile-top-header">
        <div>
          <p className="eyebrow">MEMBER STUDIO</p>
          <h1 className="display">My <em>Profile.</em></h1>
          <p className="muted">
            Your training identity, body metrics, workout plans, and account preferences synced across sessions.
          </p>
        </div>
        <div className="profile-top-header__actions">
          <div className="profile-mobile-toggle" role="group" aria-label="Profile view switcher">
            <button
              type="button"
              className={mobileView === 'overview' ? 'profile-mobile-toggle__btn is-active' : 'profile-mobile-toggle__btn'}
              onClick={() => setMobileView('overview')}
            >
              My Profile
            </button>
            <button
              type="button"
              className={mobileView === 'edit' ? 'profile-mobile-toggle__btn is-active' : 'profile-mobile-toggle__btn'}
              onClick={() => setMobileView('edit')}
            >
              Edit Profile
            </button>
          </div>
          <Link to="/" className="btn btn--ghost btn--sm">
            Dashboard
          </Link>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
            disabled={loading}
          >
            Sign out
          </button>
        </div>
      </header>

      {(notice || displayedError) && (
        <p
          className={displayedError ? 'login-alert login-alert--error' : 'login-alert login-alert--ok'}
          role={displayedError ? 'alert' : 'status'}
        >
          {displayedError || notice}
        </p>
      )}

      <div className="profile-grid">
        <section className="profile-card profile-overview-card" aria-label="Profile summary">
          <div className="profile-identity">
            <button
              type="button"
              className="profile-edit-icon-btn"
              aria-label="Edit profile"
              title="Edit profile"
              onClick={() => openEditSection('general')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>

            <ProfileAvatar
              avatarUrl={avatarUrl}
              name={fullName}
              email={user.email}
              size="lg"
            />

            <h2 className="profile-identity__name">{fullName}</h2>
            <p className="profile-identity__email">{user.email}</p>

            {(profile.handle || profile.phone || profile.location) ? (
              <div className="profile-identity__contacts">
                {profile.handle && (
                  <span className="profile-contact-item">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                    </svg>
                    {profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`}
                  </span>
                )}
                {profile.phone && (
                  <span className="profile-contact-item">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                    </svg>
                    {profile.phone}
                  </span>
                )}
                {profile.location && (
                  <span className="profile-contact-item">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {profile.location}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="profile-add-details-link"
                onClick={() => openEditSection('general')}
              >
                Add handle, phone & location
              </button>
            )}

            {profile.bio && <p className="profile-identity__bio">{profile.bio}</p>}
          </div>

          <dl className="profile-stats-grid" aria-label="Member training telemetry">
            <button
              type="button"
              className="profile-stat-cell"
              onClick={() => openEditSection('body')}
            >
              <dd>{currentWeightDisplay}</dd>
              <dt>Current Weight</dt>
            </button>

            <button
              type="button"
              className="profile-stat-cell"
              onClick={() => openEditSection('settings')}
            >
              <dd>{stats.weeklyWorkouts}/{goals.weekly}</dd>
              <dt>Weekly Workout</dt>
            </button>

            <Link to="/progress" className="profile-stat-cell">
              <dd>{latestWorkoutDate}</dd>
              <dt>Latest Session</dt>
            </Link>

            <button
              type="button"
              className="profile-stat-cell"
              onClick={() => openEditSection('body')}
            >
              <dd>{measurementDisplay}</dd>
              <dt>{measurementLabel}</dt>
            </button>

            <Link to="/progress" className="profile-stat-cell">
              <dd>{stats.currentStreak}d</dd>
              <dt>Active Streak</dt>
            </Link>

            <button
              type="button"
              className="profile-stat-cell"
              onClick={() => openEditSection('body')}
            >
              <dd>{sixthMetricValue}</dd>
              <dt>{sixthMetricLabel}</dt>
            </button>
          </dl>

          <div className="profile-plans-section">
            <div className="profile-plans-section__head">
              <h3>Current Workout Plans</h3>
              <span className="profile-plans-section__count">{plans.length}</span>
            </div>

            {plans.length === 0 ? (
              <div className="profile-plans-empty">
                <p>No saved workout plans yet.</p>
                <Link to="/explore" className="btn btn--ghost btn--sm">
                  Explore exercises
                </Link>
              </div>
            ) : (
              <ul className="profile-plan-list">
                {plans.slice(0, 5).map((plan) => {
                  const badge = getPlanProgressBadge(plan)
                  return (
                    <li key={plan.id}>
                      <Link to="/workout" className="profile-plan-row">
                        <span className="profile-plan-row__name">{plan.name}</span>
                        <span className="profile-plan-row__right">
                          <span className={`profile-plan-row__count is-${badge.tone}`}>
                            {badge.text}
                          </span>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            {plans.length > 0 && (
              <div className="profile-plans-footer">
                <Link to="/workout" className="profile-plans-footer__link">
                  Open workout builder →
                </Link>
                <Link to="/calendar" className="profile-plans-footer__link">
                  Calendar →
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="profile-card profile-edit-card" aria-labelledby="edit-profile-heading">
          <div className="profile-edit-header">
            <div className="profile-edit-header__title-row">
              <button
                type="button"
                className="profile-back-btn"
                aria-label="Back to My Profile"
                onClick={() => setMobileView('overview')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="eyebrow">PROFILE SETTINGS</p>
                <h2 id="edit-profile-heading" className="display">
                  Edit <em>Profile</em>
                </h2>
              </div>
            </div>

            <div className="profile-tabs" role="tablist" aria-label="Profile settings sections">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'general'}
                className={activeTab === 'general' ? 'profile-tab is-active' : 'profile-tab'}
                onClick={() => setActiveTab('general')}
              >
                General Info
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'body'}
                className={activeTab === 'body' ? 'profile-tab is-active' : 'profile-tab'}
                onClick={() => setActiveTab('body')}
              >
                Body & Location
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'settings'}
                className={activeTab === 'settings' ? 'profile-tab is-active' : 'profile-tab'}
                onClick={() => setActiveTab('settings')}
              >
                Settings & Security
              </button>
            </div>
          </div>

          {activeTab === 'general' && (
            <form className="profile-form" onSubmit={handleSaveGeneral} noValidate>
              <div className="profile-avatar-editor">
                <div className="profile-avatar-editor__frame">
                  <ProfileAvatar
                    avatarUrl={avatarUrl}
                    name={fullName}
                    email={user.email}
                    size="md"
                  />
                  <button
                    type="button"
                    className="profile-camera-btn"
                    aria-label="Upload profile photo"
                    title="Upload profile photo"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="profile-avatar-editor__copy">
                  <p className="profile-avatar-editor__title">Profile photo</p>
                  <p className="profile-avatar-editor__hint">
                    JPG, PNG, GIF or WEBP up to 5 MB. Stored with your account.
                  </p>
                  {avatarUrl && (
                    <button
                      type="button"
                      className="profile-text-btn"
                      onClick={handleRemoveAvatar}
                      disabled={loading}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <div className="profile-form__row">
                <div className="profile-field">
                  <label htmlFor={firstNameId}>First Name</label>
                  <input
                    ref={firstNameInputRef}
                    id={firstNameId}
                    type="text"
                    className="profile-input"
                    value={form.firstName}
                    onChange={(event) => updateField('firstName', event.target.value)}
                    placeholder="Alex"
                    maxLength={40}
                  />
                </div>
                <div className="profile-field">
                  <label htmlFor={lastNameId}>Last Name</label>
                  <input
                    id={lastNameId}
                    type="text"
                    className="profile-input"
                    value={form.lastName}
                    onChange={(event) => updateField('lastName', event.target.value)}
                    placeholder="Mercer"
                    maxLength={40}
                  />
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor={emailId}>Email</label>
                <div className="profile-input-icon-wrap">
                  <input
                    id={emailId}
                    type="email"
                    className="profile-input"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="athlete@fitnessexplorer.app"
                    maxLength={254}
                  />
                  <svg className="profile-field-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
              </div>

              <div className="profile-form__row">
                <div className="profile-field">
                  <label htmlFor={handleId}>Athlete Handle</label>
                  <div className="profile-input-icon-wrap">
                    <input
                      id={handleId}
                      type="text"
                      className="profile-input"
                      value={form.handle}
                      onChange={(event) => updateField('handle', event.target.value)}
                      placeholder="@alexmercer"
                      maxLength={40}
                    />
                    <svg className="profile-field-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                    </svg>
                  </div>
                </div>
                <div className="profile-field">
                  <label htmlFor={phoneId}>Phone</label>
                  <div className="profile-input-icon-wrap">
                    <input
                      id={phoneId}
                      type="tel"
                      className="profile-input"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      placeholder="+1 555 014 8820"
                      maxLength={30}
                    />
                    <svg className="profile-field-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor={bioId}>Training Focus / Bio</label>
                <input
                  id={bioId}
                  type="text"
                  className="profile-input"
                  value={form.bio}
                  onChange={(event) => updateField('bio', event.target.value)}
                  placeholder="Hypertrophy split, mobility & steady-state conditioning"
                  maxLength={240}
                />
              </div>

              <div className="profile-form__footer">
                <button
                  type="button"
                  className="profile-text-btn"
                  onClick={() => setShowPasswordForm((prev) => !prev)}
                  aria-expanded={showPasswordForm}
                >
                  {showPasswordForm ? 'Hide Change Password' : 'Change Password'}
                </button>
                <button type="submit" className="btn btn--primary glint" disabled={loading}>
                  <span className="glint__label">{loading ? 'Saving...' : 'Save profile'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'general' && showPasswordForm && (
            <form className="profile-password-drawer" onSubmit={handlePasswordSubmit} noValidate>
              <h3>Update Password</h3>
              <div className="profile-field">
                <label htmlFor={currentPasswordId}>Current Password</label>
                <input
                  id={currentPasswordId}
                  type="password"
                  className="profile-input"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="profile-form__row">
                <div className="profile-field">
                  <label htmlFor={newPasswordId}>New Password</label>
                  <input
                    id={newPasswordId}
                    type="password"
                    className="profile-input"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <div className="profile-field">
                  <label htmlFor={confirmPasswordId}>Confirm Password</label>
                  <input
                    id={confirmPasswordId}
                    type="password"
                    className="profile-input"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <div className="profile-password-drawer__actions">
                <button type="submit" className="btn btn--ghost btn--sm" disabled={loading}>
                  Update password
                </button>
              </div>
            </form>
          )}

          {activeTab === 'body' && (
            <form className="profile-form" onSubmit={handleSaveBodyAndLocation} noValidate>
              <div className="profile-field">
                <label>Preferred Measurement Units</label>
                <div className="profile-units-switch" role="group" aria-label="Measurement units">
                  <button
                    type="button"
                    className={activeUnits === 'metric' ? 'profile-units-btn is-active' : 'profile-units-btn'}
                    onClick={() => handleUnitsChange('metric')}
                  >
                    Metric (kg, cm)
                  </button>
                  <button
                    type="button"
                    className={activeUnits === 'imperial' ? 'profile-units-btn is-active' : 'profile-units-btn'}
                    onClick={() => handleUnitsChange('imperial')}
                  >
                    Imperial (lb, in)
                  </button>
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor={locationId}>Location / Gym City</label>
                <div className="profile-input-icon-wrap">
                  <input
                    id={locationId}
                    type="text"
                    className="profile-input"
                    value={form.location}
                    onChange={(event) => updateField('location', event.target.value)}
                    placeholder="Portland, OR"
                    maxLength={80}
                  />
                  <svg className="profile-field-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
              </div>

              <div className="profile-form__row">
                <div className="profile-field">
                  <label htmlFor={weightId}>
                    Current Weight ({activeUnits === 'imperial' ? 'lb' : 'kg'})
                  </label>
                  <input
                    id={weightId}
                    type="number"
                    step="0.1"
                    min="20"
                    max="880"
                    className="profile-input"
                    value={form.weightDisplay}
                    onChange={(event) => updateField('weightDisplay', event.target.value)}
                    placeholder={activeUnits === 'imperial' ? '175' : '79.5'}
                  />
                </div>
                <div className="profile-field">
                  <label htmlFor={targetWeightId}>
                    Target Weight ({activeUnits === 'imperial' ? 'lb' : 'kg'})
                  </label>
                  <input
                    id={targetWeightId}
                    type="number"
                    step="0.1"
                    min="20"
                    max="880"
                    className="profile-input"
                    value={form.targetWeightDisplay}
                    onChange={(event) => updateField('targetWeightDisplay', event.target.value)}
                    placeholder={activeUnits === 'imperial' ? '168' : '76.0'}
                  />
                </div>
              </div>

              <div className="profile-form__row">
                <div className="profile-field">
                  <label htmlFor={heightId}>
                    Height ({activeUnits === 'imperial' ? 'in' : 'cm'})
                  </label>
                  <input
                    id={heightId}
                    type="number"
                    step="0.1"
                    min="30"
                    max="260"
                    className="profile-input"
                    value={form.heightDisplay}
                    onChange={(event) => updateField('heightDisplay', event.target.value)}
                    placeholder={activeUnits === 'imperial' ? '70' : '178'}
                  />
                </div>
                <div className="profile-field">
                  <label htmlFor={heartRateId}>Resting Heart Rate (bpm)</label>
                  <input
                    id={heartRateId}
                    type="number"
                    step="1"
                    min="30"
                    max="220"
                    className="profile-input"
                    value={form.restingHeartRate}
                    onChange={(event) => updateField('restingHeartRate', event.target.value)}
                    placeholder="62"
                  />
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor={measurementDateId}>Latest Check-in Date</label>
                <input
                  id={measurementDateId}
                  type="date"
                  className="profile-input"
                  value={form.latestMeasurementDate}
                  onChange={(event) => updateField('latestMeasurementDate', event.target.value)}
                />
              </div>

              <div className="profile-form__footer">
                <span className="profile-save-hint">Synced to your account automatically.</span>
                <button type="submit" className="btn btn--primary glint" disabled={loading}>
                  <span className="glint__label">Save metrics</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'settings' && (
            <div className="profile-settings-stack">
              <div className="profile-setting-block">
                <div className="profile-setting-block__head">
                  <h3>Training Targets</h3>
                  <span>Synced to calendar & dashboard</span>
                </div>
                <div className="profile-goal-steppers">
                  <div className="profile-goal-stepper">
                    <span className="profile-goal-stepper__label">Weekly Goal</span>
                    <div className="profile-goal-stepper__controls">
                      <button
                        type="button"
                        className="profile-stepper-btn"
                        aria-label="Decrease weekly goal"
                        onClick={() => updateWorkoutGoals({ weekly: Math.max(1, goals.weekly - 1) })}
                      >
                        −
                      </button>
                      <span className="profile-goal-stepper__value">{goals.weekly}/wk</span>
                      <button
                        type="button"
                        className="profile-stepper-btn"
                        aria-label="Increase weekly goal"
                        onClick={() => updateWorkoutGoals({ weekly: Math.min(14, goals.weekly + 1) })}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="profile-goal-stepper">
                    <span className="profile-goal-stepper__label">Monthly Goal</span>
                    <div className="profile-goal-stepper__controls">
                      <button
                        type="button"
                        className="profile-stepper-btn"
                        aria-label="Decrease monthly goal"
                        onClick={() => updateWorkoutGoals({ monthly: Math.max(1, goals.monthly - 1) })}
                      >
                        −
                      </button>
                      <span className="profile-goal-stepper__value">{goals.monthly}/mo</span>
                      <button
                        type="button"
                        className="profile-stepper-btn"
                        aria-label="Increase monthly goal"
                        onClick={() => updateWorkoutGoals({ monthly: Math.min(60, goals.monthly + 1) })}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-setting-block">
                <div className="profile-setting-block__head">
                  <h3>Studio Appearance</h3>
                  <span>Theme preference</span>
                </div>
                <div className="profile-units-switch" role="group" aria-label="Color theme">
                  <button
                    type="button"
                    className={theme === 'dark' ? 'profile-units-btn is-active' : 'profile-units-btn'}
                    onClick={() => setTheme('dark')}
                  >
                    Dark Charcoal
                  </button>
                  <button
                    type="button"
                    className={theme === 'light' ? 'profile-units-btn is-active' : 'profile-units-btn'}
                    onClick={() => setTheme('light')}
                  >
                    Light Stone
                  </button>
                </div>
              </div>

              <div className="profile-setting-block">
                <div className="profile-setting-block__head">
                  <h3>Active Sessions ({sessions.length})</h3>
                  <div className="profile-session-actions">
                    <button
                      type="button"
                      className="profile-text-btn"
                      onClick={async () => {
                        const rotated = await rotateSession()
                        if (rotated?.session) {
                          setNotice(`Session rotated (${shortId(rotated.session.tokenFamilyId)}).`)
                        }
                      }}
                      disabled={loading}
                    >
                      Rotate token
                    </button>
                    <button
                      type="button"
                      className="profile-text-btn profile-text-btn--danger"
                      onClick={signOutAll}
                      disabled={loading}
                    >
                      Revoke all
                    </button>
                  </div>
                </div>

                {sessions.length === 0 ? (
                  <p className="muted">No active sessions recorded.</p>
                ) : (
                  <ul className="auth-session-list">
                    {sessions.slice(0, 5).map((item) => {
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
                              <span className={`auth-session-status auth-session-status--${item.status || 'active'}`}>
                                {item.status || 'active'}
                              </span>
                            </div>
                            <dl className="auth-session-item__meta">
                              <div>
                                <dt>Last used</dt>
                                <dd>{formatTimestamp(item.lastUsedAt)}</dd>
                              </div>
                              <div>
                                <dt>Expires</dt>
                                <dd>{formatTimestamp(item.expiresAt)}</dd>
                              </div>
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

                {(schemaMetadata || profileSchemaMetadata) && (
                  <div className="profile-schema-toggle">
                    <div className="profile-session-actions">
                      {schemaMetadata && (
                        <button
                          type="button"
                          className="profile-text-btn"
                          onClick={() => setShowSchemaTable((prev) => !prev)}
                          aria-expanded={showSchemaTable}
                        >
                          {showSchemaTable
                            ? `Hide ${schemaMetadata.tableName} schema`
                            : `Inspect ${schemaMetadata.tableName} schema (${schemaMetadata.columns.length} columns)`}
                        </button>
                      )}
                      {profileSchemaMetadata && (
                        <button
                          type="button"
                          className="profile-text-btn"
                          onClick={() => setShowProfileSchemaTable((prev) => !prev)}
                          aria-expanded={showProfileSchemaTable}
                        >
                          {showProfileSchemaTable
                            ? `Hide ${profileSchemaMetadata.tableName} schema`
                            : `Inspect ${profileSchemaMetadata.tableName} schema (${profileSchemaMetadata.columns.length} columns)`}
                        </button>
                      )}
                    </div>

                    {showSchemaTable && schemaMetadata && (
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
                    )}

                    {showProfileSchemaTable && profileSchemaMetadata && (
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
                            {profileSchemaMetadata.columns.map((col) => (
                              <tr key={col.name}>
                                <td className="login-schema-col">{col.name}</td>
                                <td className="login-schema-type">{col.type}</td>
                                <td className="login-schema-constraint">
                                  {col.primaryKey && col.references
                                    ? `PK, FK -> ${col.references.table}.${col.references.column}`
                                    : col.primaryKey
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
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
