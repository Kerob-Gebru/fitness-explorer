import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_PROFILE = {
  firstName: '',
  lastName: '',
  phone: '',
  handle: '',
  location: '',
  bio: '',
  avatarUrl: '',
  weightKg: null,
  targetWeightKg: null,
  heightCm: null,
  restingHeartRate: null,
  units: 'metric',
  latestMeasurementDate: null,
}

function sanitizeNullableNumber(value, min, max, integer = false) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  const clamped = Math.min(max, Math.max(min, num))
  return integer ? Math.round(clamped) : Math.round(clamped * 10) / 10
}

function sanitizeAvatarUrl(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(trimmed)) return trimmed
  return ''
}

function sanitizeDateString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || Number.isNaN(Date.parse(trimmed))) return null
  return trimmed.slice(0, 32)
}

export function sanitizeProfile(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    firstName: typeof input.firstName === 'string' ? input.firstName.trim().slice(0, 40) : '',
    lastName: typeof input.lastName === 'string' ? input.lastName.trim().slice(0, 40) : '',
    phone: typeof input.phone === 'string' ? input.phone.trim().slice(0, 30) : '',
    handle: typeof input.handle === 'string' ? input.handle.trim().slice(0, 40) : '',
    location: typeof input.location === 'string' ? input.location.trim().slice(0, 80) : '',
    bio: typeof input.bio === 'string' ? input.bio.trim().slice(0, 240) : '',
    avatarUrl: sanitizeAvatarUrl(input.avatarUrl),
    weightKg: sanitizeNullableNumber(input.weightKg, 20, 400),
    targetWeightKg: sanitizeNullableNumber(input.targetWeightKg, 20, 400),
    heightCm: sanitizeNullableNumber(input.heightCm, 80, 260),
    restingHeartRate: sanitizeNullableNumber(input.restingHeartRate, 30, 220, true),
    units: input.units === 'imperial' ? 'imperial' : 'metric',
    latestMeasurementDate: sanitizeDateString(input.latestMeasurementDate),
  }
}

export function splitDisplayName(displayName) {
  if (typeof displayName !== 'string' || !displayName.trim()) {
    return { firstName: '', lastName: '' }
  }
  const parts = displayName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

export const useProfileStore = create(
  persist(
    (set, get) => ({
      profile: { ...DEFAULT_PROFILE },

      updateProfile: (updates) =>
        set({
          profile: sanitizeProfile({ ...get().profile, ...(updates || {}) }),
        }),

      replaceProfile: (nextProfile) =>
        set({ profile: sanitizeProfile(nextProfile) }),

      resetProfile: () => set({ profile: { ...DEFAULT_PROFILE } }),
    }),
    {
      name: 'fitness-explorer-profile',
      version: 1,
      partialize: (state) => ({ profile: state.profile }),
      merge: (persisted, current) => ({
        ...current,
        profile: sanitizeProfile(persisted?.profile),
      }),
    },
  ),
)
