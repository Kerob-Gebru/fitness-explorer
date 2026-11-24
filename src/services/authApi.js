function resolveApiBaseUrl(rawValue) {
  const trimmed = (rawValue || '/api').trim()
  if (!trimmed || trimmed === '/') return '/api'

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      if (!parsed.pathname || parsed.pathname === '/') {
        parsed.pathname = '/api'
      }
      return parsed.toString().replace(/\/+$/, '')
    } catch {
      return trimmed.replace(/\/+$/, '')
    }
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

const BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_BACKEND_API_URL)

const AUTH_REQUEST_TIMEOUT_MS = 15000

async function authRequest(path, { method = 'GET', body = null, accessToken = '' } = {}) {
  const headers = {
    Accept: 'application/json',
  }
  if (body !== null) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS)
    : null

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Authentication request timed out. Please try again.', { cause: error })
    }
    throw new Error('Could not connect to the authentication server.', { cause: error })
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId)
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON error response handled below.
  }

  if (!response.ok || !payload?.success) {
    const fallbackMessage =
      response.status === 404
        ? 'Authentication endpoint not found (404). Verify the server is running and up to date.'
        : `Authentication request failed (${response.status}).`
    const error = new Error(payload?.message || fallbackMessage)
    error.status = response.status
    throw error
  }

  return payload.data
}

export function registerAccount({ displayName, email, password }) {
  return authRequest('/auth/register', {
    method: 'POST',
    body: { displayName, email, password },
  })
}

export function loginAccount({ email, password }) {
  return authRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function refreshAuthSession({ refreshToken }) {
  return authRequest('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  })
}

export function logoutAccount({ refreshToken = '', accessToken = '' } = {}) {
  return authRequest('/auth/logout', {
    method: 'POST',
    accessToken,
    body: refreshToken ? { refreshToken } : {},
  })
}

export function listAuthSessions({ accessToken }) {
  return authRequest('/auth/sessions', {
    method: 'GET',
    accessToken,
  })
}

export function revokeAuthSession({ sessionId, accessToken }) {
  return authRequest(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    accessToken,
  })
}

export function logoutAllAuthSessions({ accessToken }) {
  return authRequest('/auth/logout-all', {
    method: 'POST',
    accessToken,
    body: {},
  })
}
