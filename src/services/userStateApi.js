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
const REQUEST_TIMEOUT_MS = 15000

async function userStateRequest(
  path,
  { method = 'GET', body = null, accessToken = '', keepalive = false } = {},
) {
  const headers = {
    Accept: 'application/json',
  }
  if (body !== null) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const controller =
    !keepalive && typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      keepalive: Boolean(keepalive),
      body: body !== null ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('User data request timed out.', { cause: error })
    }
    throw new Error('Could not connect to the backend to sync saved data.', { cause: error })
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
    const error = new Error(payload?.message || `User data request failed (${response.status}).`)
    error.status = response.status
    throw error
  }

  return payload.data
}

export function fetchUserState({ accessToken }) {
  return userStateRequest('/user-state', {
    method: 'GET',
    accessToken,
  })
}

export function saveUserState({ accessToken, state, keepalive = false }) {
  return userStateRequest('/user-state', {
    method: 'PUT',
    accessToken,
    body: state,
    keepalive,
  })
}
