import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import { FileText, Eye, Shield, ClipboardList } from 'lucide-react'
import Button from '@/components/atoms/Button'
import { listAuditLogs, listAuditDecisions, listAuditReports } from '@/api/audit'

export default function AuditorDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      listAuditLogs(),
      listAuditDecisions(),
      listAuditReports(),
    ])
      .then(([logsRes, decisionsRes, reportsRes]) => {
        const logs = logsRes.data?.results || logsRes.data || []
        const decisions = decisionsRes.data || []
        const reports = reportsRes.data || []
        setStats({
          events: Array.isArray(logs) ? logs.length : 0,
          decisions: decisions.length,
          reports: reports.length,
        })
      })
      .catch(err => toast.error(err.message))
  }, [])

  return (
    <DashboardLayout title="Contrôle interne">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Événements audités" value={String(stats?.events ?? '—')} sub="Journal API" icon={ClipboardList} accentColor="#D4AF37" />
          <StatCard label="Décisions crédit" value={String(stats?.decisions ?? '—')} sub="Traçabilité" icon={Eye} accentColor="#60A5FA" />
          <StatCard label="Rapports disponibles" value={String(stats?.reports ?? '—')} sub="Modèles audit" icon={FileText} accentColor="#A78BFA" />
          <StatCard label="Contrôle accès" value="RBAC" sub="6 rôles Simbisa" icon={Shield} accentColor="#34D399" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button variant="secondary" onClick={() => navigate('/audit/decisions')}>Vérifier les décisions</Button>
          <Button variant="secondary" onClick={() => navigate('/audit/reports')}>Produire un rapport</Button>
          <Button variant="secondary" onClick={() => navigate('/admin/users')} disabled title="Réservé administrateur">
            Contrôler les accès
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
