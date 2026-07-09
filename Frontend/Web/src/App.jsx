import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { LangProvider } from '@/context/LangContext'
import ProtectedRoute from '@/components/guards/ProtectedRoute'
import GuestRoute from '@/components/guards/GuestRoute'
import { ROLES, getHomeRoute } from '@/constants/roles'

import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import Dashboard from '@/pages/Dashboard'
import Profile from '@/pages/Profile'
import CreditRequest from '@/pages/CreditRequest'
import Savings from '@/pages/Savings'
import ScoringDetail from '@/pages/ScoringDetail'
import MyCredits from '@/pages/MyCredits'
import Repayments from '@/pages/Repayments'
import AIExplanations from '@/pages/AIExplanations'
import Echeancier from '@/pages/Echeancier'
import Wallets from '@/pages/Wallets'

import AgentDashboard from '@/pages/AgentDashboard'
import AgentRequests from '@/pages/agent/AgentRequests'
import AgentClients from '@/pages/agent/AgentClients'

import ManagerDashboard from '@/pages/manager/ManagerDashboard'
import ManagerExceptions from '@/pages/manager/ManagerExceptions'
import ManagerPlafonds from '@/pages/manager/ManagerPlafonds'

import RiskDashboard from '@/pages/risk/RiskDashboard'
import RiskRules from '@/pages/risk/RiskRules'
import RiskModels from '@/pages/risk/RiskModels'

import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminRoles from '@/pages/admin/AdminRoles'
import AdminSettings from '@/pages/admin/AdminSettings'

import AuditorDashboard from '@/pages/audit/AuditorDashboard'
import AuditDecisions from '@/pages/audit/AuditDecisions'
import AuditReports from '@/pages/audit/AuditReports'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import Help from '@/pages/Help'
import ErrorPage from '@/pages/ErrorPage'

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={getHomeRoute(user.role)} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/403" element={<ErrorPage code={403} />} />
      <Route path="/404" element={<ErrorPage code={404} />} />
      <Route path="/500" element={<ErrorPage code={500} />} />

      {/* Client */}
      <Route path="/dashboard" element={<ProtectedRoute roles={[ROLES.CLIENT]}><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute roles={[ROLES.CLIENT]}><Profile /></ProtectedRoute>} />
      <Route path="/savings" element={<ProtectedRoute roles={[ROLES.CLIENT]}><Savings /></ProtectedRoute>} />
      <Route path="/credit-request" element={<ProtectedRoute roles={[ROLES.CLIENT]}><CreditRequest /></ProtectedRoute>} />
      <Route path="/my-credits" element={<ProtectedRoute roles={[ROLES.CLIENT]}><MyCredits /></ProtectedRoute>} />
      <Route path="/repayments" element={<ProtectedRoute roles={[ROLES.CLIENT]}><Repayments /></ProtectedRoute>} />
      <Route path="/ai-explanations" element={<ProtectedRoute roles={[ROLES.CLIENT]}><AIExplanations /></ProtectedRoute>} />
      <Route path="/echeancier" element={<ProtectedRoute roles={[ROLES.CLIENT]}><Echeancier /></ProtectedRoute>} />
      <Route path="/wallets" element={<ProtectedRoute roles={[ROLES.CLIENT]}><Wallets /></ProtectedRoute>} />

      {/* Scoring — Agent, Manager, Analyste uniquement (clients via /ai-explanations) */}
      <Route path="/scoring" element={
        <ProtectedRoute roles={[ROLES.AGENT, ROLES.MANAGER, ROLES.ANALYST]}>
          <ScoringDetail />
        </ProtectedRoute>
      } />

      {/* Agent + Manager (traitement dossiers) */}
      <Route path="/agent" element={
        <ProtectedRoute roles={[ROLES.AGENT, ROLES.MANAGER]}>
          <AgentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/agent/clients" element={
        <ProtectedRoute roles={[ROLES.AGENT, ROLES.MANAGER]}>
          <AgentClients />
        </ProtectedRoute>
      } />
      <Route path="/agent/requests" element={
        <ProtectedRoute roles={[ROLES.AGENT, ROLES.MANAGER]}>
          <AgentRequests />
        </ProtectedRoute>
      } />

      {/* Responsable crédit */}
      <Route path="/manager" element={<ProtectedRoute roles={[ROLES.MANAGER]}><ManagerDashboard /></ProtectedRoute>} />
      <Route path="/manager/exceptions" element={<ProtectedRoute roles={[ROLES.MANAGER]}><ManagerExceptions /></ProtectedRoute>} />
      <Route path="/manager/plafonds" element={<ProtectedRoute roles={[ROLES.MANAGER]}><ManagerPlafonds /></ProtectedRoute>} />

      {/* Analyste risque */}
      <Route path="/risk" element={<ProtectedRoute roles={[ROLES.ANALYST]}><RiskDashboard /></ProtectedRoute>} />
      <Route path="/risk/rules" element={<ProtectedRoute roles={[ROLES.ANALYST]}><RiskRules /></ProtectedRoute>} />
      <Route path="/risk/models" element={<ProtectedRoute roles={[ROLES.ANALYST]}><RiskModels /></ProtectedRoute>} />

      {/* Administrateur */}
      <Route path="/admin" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminRoles /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminSettings /></ProtectedRoute>} />

      {/* Auditeur */}
      <Route path="/audit" element={<ProtectedRoute roles={[ROLES.AUDITOR]}><AuditorDashboard /></ProtectedRoute>} />
      <Route path="/audit/decisions" element={<ProtectedRoute roles={[ROLES.AUDITOR]}><AuditDecisions /></ProtectedRoute>} />
      <Route path="/audit/reports" element={<ProtectedRoute roles={[ROLES.AUDITOR]}><AuditReports /></ProtectedRoute>} />

      {/* Aide — tous les rôles authentifiés */}
      <Route path="/help" element={
        <ProtectedRoute roles={Object.values(ROLES)}><Help /></ProtectedRoute>
      } />

      <Route path="*" element={<ErrorPage code={404} />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <LangProvider>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--color-blanc)',
              border: '1px solid var(--toast-border)',
              borderRadius: '14px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
      </AuthProvider>
      </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
