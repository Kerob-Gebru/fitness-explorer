const RAW_BASE_URL = (import.meta.env.VITE_BACKEND_API_URL || '/api').trim()
const BASE_URL = RAW_BASE_URL.endsWith('/') && RAW_BASE_URL.length > 1
  ? RAW_BASE_URL.slice(0, -1)
  : RAW_BASE_URL

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

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Could not connect to the authentication server.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON error response handled below.
  }

  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.message || `Authentication request failed (${response.status}).`)
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
