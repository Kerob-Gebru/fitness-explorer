import { create } from 'zustand'
import {
  listAuthSessions,
  loginAccount,
  logoutAccount,
  logoutAllAuthSessions,
  refreshAuthSession,
  registerAccount,
  revokeAuthSession,
} from '../../services/authApi.js'

// Access and refresh tokens remain exclusively in JavaScript memory (never in localStorage/sessionStorage).
export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  accessToken: '',
  refreshToken: '',
  sessions: [],
  sessionsLoaded: false,
  schemaMetadata: null,
  loading: false,
  error: '',

  clearError() {
    set({ error: '' })
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
        loading: false,
        error: '',
      })
      if (!hasSessions) {
        await get().fetchSessions()
      }
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
        loading: false,
        error: '',
      })
      if (!hasSessions) {
        await get().fetchSessions()
      }
      return data
    } catch (error) {
      set({ loading: false, error: error.message || 'Account creation failed.' })
      return null
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
        schemaMetadata: data.schema || null,
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
    const { refreshToken } = get()
    if (!refreshToken) return null
    set({ loading: true, error: '' })
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
    }
  },

  async revokeSession(sessionId) {
    const { accessToken } = get()
    if (!accessToken) return false
    set({ loading: true, error: '' })
    try {
      const result = await revokeAuthSession({ sessionId, accessToken })
      if (result.revokedCurrentSession) {
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
      await logoutAccount({ refreshToken, accessToken })
    } catch {
      // Always clear in-memory session even if server already expired it.
    } finally {
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
      await logoutAllAuthSessions({ accessToken })
    } finally {
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
