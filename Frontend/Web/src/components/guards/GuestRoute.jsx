import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function GuestRoute({ children }) {
  const { isAuthenticated, loading, homeRoute } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-or animate-pulse font-display font-bold">Chargement…</div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={homeRoute} replace />
  }

  return children
}
