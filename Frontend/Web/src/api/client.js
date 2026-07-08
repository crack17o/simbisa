const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const STORAGE_KEY = 'simbisa_auth'

function getDeviceIdHeader() {
  try {
    const KEY = 'simbisa_device_id'
    let id = localStorage.getItem(KEY)
    if (!id && typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id || ''
  } catch {
    return ''
  }
}

export class ApiError extends Error {
  constructor(payload, status) {
    const message = payload?.error?.message || payload?.message || `Erreur HTTP ${status}`
    super(typeof message === 'string' ? message : JSON.stringify(message))
    this.name = 'ApiError'
    this.code = payload?.error?.code
    this.details = payload?.error?.details
    this.status = status
    this.payload = payload
  }
}

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredAuth(user) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY)
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${API_BASE}/api/v1/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data, res.status)
  return data
}

export async function apiRequest(path, { method = 'GET', body, auth = true, headers = {}, retry = true } = {}) {
  const stored = getStoredAuth()
  const reqHeaders = { Accept: 'application/json', ...headers }

  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json'
  }

  if (auth && stored?.accessToken) {
    reqHeaders.Authorization = `Bearer ${stored.accessToken}`
  }

  const deviceId = getDeviceIdHeader()
  if (deviceId) {
    reqHeaders['X-Device-Id'] = deviceId
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  if (res.status === 401 && auth && stored?.refreshToken && retry) {
    try {
      const tokens = await refreshAccessToken(stored.refreshToken)
      setStoredAuth({
        ...stored,
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        token: tokens.access,
      })
      return apiRequest(path, { method, body, auth, headers, retry: false })
    } catch {
      setStoredAuth(null)
      throw new ApiError({ error: { message: 'Session expirée. Reconnectez-vous.' } }, 401)
    }
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data, res.status)
  return data
}

/**
 * Télécharge un fichier protégé (KYC, media) en passant le JWT en header.
 * Retourne un Blob exploitable via URL.createObjectURL().
 * Gère le refresh token automatiquement comme apiRequest.
 */
export async function fetchAuthFile(url, retried = false) {
  const stored = getStoredAuth()
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`

  const res = await fetch(fullUrl, {
    headers: stored?.accessToken ? { Authorization: `Bearer ${stored.accessToken}` } : {},
    credentials: 'include',
  })

  if (res.status === 401 && !retried && stored?.refreshToken) {
    try {
      const tokens = await refreshAccessToken(stored.refreshToken)
      setStoredAuth({ ...stored, accessToken: tokens.access, refreshToken: tokens.refresh, token: tokens.access })
      return fetchAuthFile(url, true)
    } catch {
      setStoredAuth(null)
      throw new Error('Session expirée. Reconnectez-vous.')
    }
  }

  if (!res.ok) throw new Error(`Accès refusé (${res.status})`)
  return res.blob()
}

export { API_BASE }
