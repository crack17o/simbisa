import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import { Users, UserCog, Settings, Lock, ShieldAlert } from 'lucide-react'
import Button from '@/components/atoms/Button'
import { listAdminUsers, listAdminRoles } from '@/api/admin'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listAdminUsers(), listAdminRoles()])
      .then(([usersRes, rolesRes]) => {
        const users = usersRes.data || []
        const roles = rolesRes.data || []
        const actifs = users.filter(u => u.statut === 'actif').length
        const bloques = users.filter(u => u.statut !== 'actif').length
        setStats({
          total: users.length,
          actifs,
          bloques,
          roles: roles.length,
        })
      })
      .catch(err => setError(err.message))
  }, [])

  return (
    <DashboardLayout title="Administration système">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Utilisateurs totaux"
            value={stats ? String(stats.total) : '—'}
            sub="Tous rôles"
            icon={Users}
            accentColor="#D4AF37"
          />
          <StatCard
            label="Rôles configurés"
            value={stats ? String(stats.roles) : '—'}
            sub="RBAC Simbisa"
            icon={UserCog}
            accentColor="#60A5FA"
          />
          <StatCard
            label="Comptes actifs"
            value={stats ? String(stats.actifs) : '—'}
            sub="Statut actif"
            icon={Settings}
            accentColor="#34D399"
          />
          <StatCard
            label="Bloqués / suspendus"
            value={stats ? String(stats.bloques) : '—'}
            sub="À traiter"
            icon={ShieldAlert}
            accentColor="#EF4444"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Gérer les utilisateurs', to: '/admin/users', icon: Users },
            { label: 'Gérer les rôles', to: '/admin/roles', icon: UserCog },
            { label: 'Paramétrer la plateforme', to: '/admin/settings', icon: Settings },
            { label: 'Sécurité & MFA', to: '/admin/settings', icon: Lock },
          ].map(a => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="neu-flat p-5 flex flex-col items-center gap-3 hover:shadow-neu-gold transition-all text-center"
            >
              <a.icon size={24} style={{ color: '#D4AF37' }} />
              <span className="text-sm font-medium text-blanc">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
