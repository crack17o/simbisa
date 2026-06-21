import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { DEMO_USERS, getHomeRoute, SEED_PASSWORD } from '@/constants/roles'
import { loginApi, registerApi, logoutApi } from '@/api/auth'
import { getStoredAuth, setStoredAuth, ApiError } from '@/api/client'

const AuthContext = createContext(null)

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

  useEffect(() => {
    setUser(getStoredAuth())
    setLoading(false)
  }, [])

  const login = useCallback(async (telephone, password, demoKey = null, otpOptions = {}) => {
    let creds = { telephone, password }

    if (demoKey && DEMO_USERS[demoKey]) {
      creds = {
        telephone: DEMO_USERS[demoKey].telephone,
        password: SEED_PASSWORD,
      }
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
    const stored = getStoredAuth()
    try {
      if (stored?.refreshToken) await logoutApi(stored.refreshToken)
    } catch {
      /* ignore — session locale quand même effacée */
    }
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
