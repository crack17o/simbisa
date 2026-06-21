import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import { Users, UserCog, Settings, Shield, Lock } from 'lucide-react'
import Button from '@/components/atoms/Button'

export default function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <DashboardLayout title="Administration système">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Utilisateurs actifs" value="512" sub="Tous rôles" icon={Users} accentColor="#D4AF37" />
          <StatCard label="Rôles configurés" value="6" sub="RBAC Simbisa" icon={UserCog} accentColor="#60A5FA" />
          <StatCard label="Sessions actives" value="89" sub="Dernières 24h" icon={Shield} accentColor="#34D399" />
          <StatCard label="Alertes sécurité" value="2" sub="À traiter" icon={Lock} accentColor="#EF4444" />
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
