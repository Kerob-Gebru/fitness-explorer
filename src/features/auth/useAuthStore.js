import { create } from 'zustand'
import {
  changeAccountPassword,
  listAuthSessions,
  loginAccount,
  logoutAccount,
  logoutAllAuthSessions,
  refreshAuthSession,
  registerAccount,
  removeProfileAvatar,
  restoreAuthSession,
  revokeAuthSession,
  updateAuthProfile,
  uploadProfileAvatar,
} from '../../services/authApi.js'
import { useProfileStore } from './useProfileStore.js'
import { flushUserStateSync, hydrateUserState } from './userStateSync.js'

let restorePromise = null
let hasAttemptedRestore = false
let rotatePromise = null

// Access and refresh tokens remain in JavaScript memory while the HttpOnly
// refresh cookie preserves authentication across page refreshes and server restarts.
export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  accessToken: '',
  refreshToken: '',
  sessions: [],
  sessionsLoaded: false,
  schemaMetadata: null,
  profileSchemaMetadata: null,
  loading: false,
  restoring: true,
  error: '',

  clearError() {
    set({ error: '' })
  },

  setUser(user) {
    if (user) set({ user })
  },

  async restoreSession() {
    if (get().accessToken) {
      set({ restoring: false })
      return null
    }
    if (hasAttemptedRestore && !restorePromise) {
      set({ restoring: false })
      return null
    }
    if (restorePromise) return restorePromise

    hasAttemptedRestore = true
    set({ restoring: true })
    restorePromise = (async () => {
      try {
        const data = await restoreAuthSession()
        if (!data?.authenticated) {
          set({ restoring: false })
          return null
        }

        const hasSessions = Array.isArray(data.sessions)
        set({
          user: data.user,
          session: data.session,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          sessions: hasSessions ? data.sessions : (data.session ? [data.session] : []),
          sessionsLoaded: hasSessions,
          schemaMetadata: data.schema || get().schemaMetadata,
          profileSchemaMetadata: data.profileSchema || get().profileSchemaMetadata,
          restoring: false,
          error: '',
        })

        await hydrateUserState({
          accessToken: data.accessToken,
          mergeLocal: false,
          onUserUpdate: (updatedUser) => set({ user: updatedUser }),
        })

        return data
      } catch {
        set({ restoring: false })
        return null
      } finally {
        restorePromise = null
      }
    })()

    return restorePromise
  },

  async signIn({ email, password }) {
    set({ loading: true, error: '' })
    try {
      const data = await loginAccount({ email, password })
      const hasSessions = Array.isArray(data.sessions)
      set({
        user: data.user,
        session: data.session,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        sessions: hasSessions ? data.sessions : (data.session ? [data.session] : []),
        sessionsLoaded: hasSessions,
        schemaMetadata: data.schema || get().schemaMetadata,
        profileSchemaMetadata: data.profileSchema || get().profileSchemaMetadata,
        loading: false,
        restoring: false,
        error: '',
      })
      if (!hasSessions) {
        await get().fetchSessions()
      }
      await hydrateUserState({
        accessToken: data.accessToken,
        mergeLocal: true,
        onUserUpdate: (updatedUser) => set({ user: updatedUser }),
      })
      return data
    } catch (error) {
      set({ loading: false, error: error.message || 'Sign in failed.' })
      return null
    }
  },

  async register({ displayName, email, password }) {
    set({ loading: true, error: '' })
    try {
      const data = await registerAccount({ displayName, email, password })
      const hasSessions = Array.isArray(data.sessions)
      set({
        user: data.user,
        session: data.session,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        sessions: hasSessions ? data.sessions : (data.session ? [data.session] : []),
        sessionsLoaded: hasSessions,
        schemaMetadata: data.schema || get().schemaMetadata,
        profileSchemaMetadata: data.profileSchema || get().profileSchemaMetadata,
        loading: false,
        restoring: false,
        error: '',
      })
      if (!hasSessions) {
        await get().fetchSessions()
      }
      await hydrateUserState({
        accessToken: data.accessToken,
        mergeLocal: true,
        onUserUpdate: (updatedUser) => set({ user: updatedUser }),
      })
      return data
    } catch (error) {
      set({ loading: false, error: error.message || 'Account creation failed.' })
      return null
    }
  },

  async updateProfileDetails({ displayName, email }) {
    const { accessToken } = get()
    if (!accessToken) return null
    set({ loading: true, error: '' })
    try {
      const data = await updateAuthProfile({ accessToken, displayName, email })
      if (data?.user) {
        set({ user: data.user, loading: false, error: '' })
      } else {
        set({ loading: false })
      }
      return data
    } catch (error) {
      set({ loading: false, error: error.message || 'Failed to update profile.' })
      return null
    }
  },

  async changePassword({ currentPassword, newPassword }) {
    const { accessToken } = get()
    if (!accessToken) return false
    set({ loading: true, error: '' })
    try {
      await changeAccountPassword({ accessToken, currentPassword, newPassword })
      set({ loading: false, error: '' })
      return true
    } catch (error) {
      set({ loading: false, error: error.message || 'Failed to update password.' })
      return false
    }
  },

  async uploadAvatar(file) {
    const { accessToken } = get()
    if (!accessToken || !file) return null
    set({ loading: true, error: '' })
    try {
      const data = await uploadProfileAvatar({ accessToken, file })
      if (data?.avatarUrl) {
        useProfileStore.getState().updateProfile({ avatarUrl: data.avatarUrl })
      }
      if (data?.user) {
        set({ user: data.user, loading: false, error: '' })
      } else {
        set({ loading: false })
      }
      return data
    } catch (error) {
      set({ loading: false, error: error.message || 'Failed to upload profile photo.' })
      return null
    }
  },

  async removeAvatar() {
    const { accessToken } = get()
    if (!accessToken) return false
    set({ loading: true, error: '' })
    try {
      const data = await removeProfileAvatar({ accessToken })
      useProfileStore.getState().updateProfile({ avatarUrl: '' })
      if (data?.user) {
        set({ user: data.user, loading: false, error: '' })
      } else {
        set({ loading: false })
      }
      return true
    } catch (error) {
      set({ loading: false, error: error.message || 'Failed to remove profile photo.' })
      return false
    }
  },

  async fetchSessions() {
    const { accessToken } = get()
    if (!accessToken) return null
    try {
      const data = await listAuthSessions({ accessToken })
      set({
        user: data.user ?? get().user,
        sessions: Array.isArray(data.sessions) ? data.sessions : [],
        sessionsLoaded: true,
        schemaMetadata: data.schema || get().schemaMetadata,
        profileSchemaMetadata: data.profileSchema || get().profileSchemaMetadata,
      })
      return data
    } catch (error) {
      if (error?.status === 401) {
        set({
          user: null,
          session: null,
          accessToken: '',
          refreshToken: '',
          sessions: [],
          sessionsLoaded: false,
          error: error.message,
        })
      }
      return null
    }
  },

  async rotateSession() {
    if (rotatePromise) return rotatePromise
    const { refreshToken } = get()
    set({ loading: true, error: '' })
    rotatePromise = (async () => {
      try {
        const data = await refreshAuthSession({ refreshToken })
        const hasSessions = Array.isArray(data.sessions)
        set({
          user: data.user,
          session: data.session,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          sessions: hasSessions ? data.sessions : get().sessions,
          sessionsLoaded: hasSessions || get().sessionsLoaded,
          schemaMetadata: data.schema || get().schemaMetadata,
          profileSchemaMetadata: data.profileSchema || get().profileSchemaMetadata,
          loading: false,
          error: '',
        })
        if (!hasSessions) {
          await get().fetchSessions()
        }
        return data
      } catch (error) {
        set({
          user: null,
          session: null,
          accessToken: '',
          refreshToken: '',
          sessions: [],
          sessionsLoaded: false,
          loading: false,
          error: error.message || 'Session rotation failed.',
        })
        return null
      } finally {
        rotatePromise = null
      }
    })()
    return rotatePromise
  },

  async revokeSession(sessionId) {
    const { accessToken } = get()
    if (!accessToken) return false
    set({ loading: true, error: '' })
    try {
      const result = await revokeAuthSession({ sessionId, accessToken })
      if (result.revokedCurrentSession) {
        useProfileStore.getState().resetProfile()
        set({
          user: null,
          session: null,
          accessToken: '',
          refreshToken: '',
          sessions: [],
          sessionsLoaded: false,
          loading: false,
        })
      } else {
        set({ loading: false })
        await get().fetchSessions()
      }
      return true
    } catch (error) {
      set({ loading: false, error: error.message || 'Could not revoke session.' })
      return false
    }
  },

  async signOut() {
    const { refreshToken, accessToken } = get()
    set({ loading: true, error: '' })
    try {
      if (accessToken) {
        await flushUserStateSync({ accessToken })
      }
      await logoutAccount({ refreshToken, accessToken })
    } catch {
      // Always clear in-memory session even if server already expired it.
    } finally {
      useProfileStore.getState().resetProfile()
      set({
        user: null,
        session: null,
        accessToken: '',
        refreshToken: '',
        sessions: [],
        sessionsLoaded: false,
        loading: false,
        error: '',
      })
    }
  },

  async signOutAll() {
    const { accessToken } = get()
    if (!accessToken) return
    set({ loading: true, error: '' })
    try {
      await flushUserStateSync({ accessToken })
      await logoutAllAuthSessions({ accessToken })
    } finally {
      useProfileStore.getState().resetProfile()
      set({
        user: null,
        session: null,
        accessToken: '',
        refreshToken: '',
        sessions: [],
        sessionsLoaded: false,
        loading: false,
        error: '',
      })
    }
  },
}))
