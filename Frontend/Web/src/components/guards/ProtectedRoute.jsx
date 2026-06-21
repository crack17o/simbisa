import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { canAccess, getHomeRoute } from '@/constants/roles'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-or animate-pulse font-display font-bold">Chargement…</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  const path = location.pathname
  const roleAllowed = !roles || roles.includes(user.role)
  const routeAllowed = canAccess(user.role, path)

  if (!roleAllowed || !routeAllowed) {
    return <Navigate to={getHomeRoute(user.role)} replace />
  }

  return children
}
