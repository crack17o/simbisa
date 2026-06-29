import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { DEMO_USERS, getHomeRoute, SEED_PASSWORD } from '@/constants/roles'
import { loginApi, registerApi, logoutApi } from '@/api/auth'
import { getStoredAuth, setStoredAuth, ApiError, refreshAccessToken } from '@/api/client'

const AuthContext = createContext(null)

// Decode JWT payload without a library
function jwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

// Refresh 90 seconds before the token expires
const REFRESH_MARGIN_MS = 90 * 1000

function mapApiUser(apiUser, tokens) {
  return {
    id: apiUser.id,
    name: apiUser.full_name || `${apiUser.nom} ${apiUser.prenom}`.trim(),
    role: apiUser.role_name,
    telephone: apiUser.telephone,
    email: apiUser.email || '',
    accessToken: tokens.access,
    refreshToken: tokens.refresh,
    token: tokens.access,
    mfa_enabled: apiUser.mfa_enabled,
    statut: apiUser.statut,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef(null)

  const silentRefresh = useCallback(async (stored) => {
    if (!stored?.refreshToken) return null
    try {
      const tokens = await refreshAccessToken(stored.refreshToken)
      const updated = {
        ...stored,
        accessToken: tokens.access,
        refreshToken: tokens.refresh ?? stored.refreshToken,
        token: tokens.access,
      }
      setUser(updated)
      setStoredAuth(updated)
      return updated
    } catch {
      setUser(null)
      setStoredAuth(null)
      return null
    }
  }, [])

  const scheduleRefresh = useCallback((accessToken, storedGetter) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const expiry = jwtExpiry(accessToken)
    if (!expiry) return
    const delay = Math.max(expiry - Date.now() - REFRESH_MARGIN_MS, 5_000)
    refreshTimerRef.current = setTimeout(() => {
      const stored = storedGetter()
      if (stored?.refreshToken) silentRefresh(stored)
    }, delay)
  }, [silentRefresh])

  // On mount: restore session, refresh immediately if token is near/past expiry
  useEffect(() => {
    const stored = getStoredAuth()
    if (!stored?.accessToken) {
      setLoading(false)
      return
    }
    const expiry = jwtExpiry(stored.accessToken)
    if (expiry && Date.now() >= expiry - REFRESH_MARGIN_MS) {
      silentRefresh(stored).finally(() => setLoading(false))
    } else {
      setUser(stored)
      scheduleRefresh(stored.accessToken, getStoredAuth)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reschedule when token changes
  useEffect(() => {
    if (!user?.accessToken) return
    scheduleRefresh(user.accessToken, getStoredAuth)
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
  }, [user?.accessToken, scheduleRefresh])

  // Refresh when user switches back to this tab after a long absence
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const stored = getStoredAuth()
      if (!stored?.accessToken) return
      const expiry = jwtExpiry(stored.accessToken)
      if (!expiry || Date.now() >= expiry - REFRESH_MARGIN_MS) {
        silentRefresh(stored)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [silentRefresh])

  const login = useCallback(async (telephone, password, demoKey = null, otpOptions = {}) => {
    let creds = { telephone, password }
    if (demoKey && DEMO_USERS[demoKey]) {
      creds = { telephone: DEMO_USERS[demoKey].telephone, password: SEED_PASSWORD }
    }
    const res = await loginApi(creds.telephone, creds.password, otpOptions)
    if (res.requires_otp) {
      return {
        requiresOtp: true,
        message: res.message,
        otpSentTo: res.data?.otp_sent_to,
        reasons: res.data?.reasons || [],
        telephone: creds.telephone,
        password: creds.password,
      }
    }
    const authUser = mapApiUser(res.data.user, res.data.tokens)
    setUser(authUser)
    setStoredAuth(authUser)
    return authUser
  }, [])

  const register = useCallback(async (data) => {
    const res = await registerApi(data)
    const authUser = mapApiUser(res.data.user, res.data.tokens)
    setUser(authUser)
    setStoredAuth(authUser)
    return authUser
  }, [])

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const stored = getStoredAuth()
    try {
      if (stored?.refreshToken) await logoutApi(stored.refreshToken)
    } catch { /* ignore */ }
    setUser(null)
    setStoredAuth(null)
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    homeRoute: user ? getHomeRoute(user.role) : '/login',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }
