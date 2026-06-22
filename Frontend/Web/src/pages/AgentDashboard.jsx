import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import Badge from '@/components/atoms/Badge'
import AIMemoPanel from '@/components/organisms/AIMemoPanel'
import Button from '@/components/atoms/Button'
import { Users, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { getDemandesStats, listDemandes, submitDemandeDecision } from '@/api/credits'
import { formatDate } from '@/utils/formatters'
import { formatMoney } from '@/utils/apiHelpers'

export default function AgentDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [pending, setPending] = useState([])
  const [hasError, setHasError] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setHasError(false)
    Promise.all([
      getDemandesStats(),
      listDemandes('statut=en_analyse'),
    ])
      .then(([statsRes, listRes]) => {
        setStats(statsRes.data)
        setPending((listRes.data || []).slice(0, 5))
      })
      .catch(err => { toast.error(err.message); setHasError(true) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleDecision = async (demandeId, decision) => {
    setBusyId(demandeId)
    try {
      await submitDemandeDecision(demandeId, {
        decision,
        motif: decision === 'approuve' ? 'Approbation agent' : 'Rejet agent',
      })
      toast.success(decision === 'approuve' ? 'Demande approuvée.' : 'Demande rejetée.')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout title="Espace agent de crédit">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Dossiers en attente" value={String(stats?.dossiers_en_attente ?? '—')} sub="À instruire" icon={Clock} accentColor="#F59E0B" />
          <StatCard label="Approuvés ce mois" value={String(stats?.approuves_ce_mois ?? '—')} sub="Mois en cours" icon={CheckCircle} accentColor="#22C55E" />
          <StatCard label="Rejetés ce mois" value={String(stats?.rejetes_ce_mois ?? '—')} sub="Mois en cours" icon={XCircle} accentColor="#EF4444" />
          <StatCard label="Clients actifs" value={String(stats?.clients_actifs ?? '—')} sub="Portefeuille" icon={Users} accentColor="#D4AF37" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 neu-flat p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-blanc">Dossiers prioritaires</h3>
            {pending.length === 0 && !hasError && (
              <p className="text-sm text-muted">Aucun dossier en analyse.</p>
            )}
            <div className="flex flex-col gap-3">
              {pending.map(d => (
                <div key={d.demande_id} className="neu-sm p-4 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{d.ref}</span>
                      <Badge label={d.risque} />
                    </div>
                    <p className="text-sm font-semibold text-blanc mt-1">{d.client}</p>
                    <p className="text-xs text-muted">
                      {formatMoney(d.montant_demande, d.devise)} · {formatDate(d.date_demande)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-lg font-display font-bold text-or-light">{d.score ?? '—'}</p>
                      <p className="text-xs text-muted">Score</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        icon={CheckCircle}
                        className="text-xs"
                        loading={busyId === d.demande_id}
                        onClick={() => handleDecision(d.demande_id, 'approuve')}
                      >
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={XCircle}
                        className="text-xs"
                        loading={busyId === d.demande_id}
                        onClick={() => handleDecision(d.demande_id, 'rejete')}
                      >
                        Rejeter
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Eye}
                      onClick={() => navigate(`/scoring?demande_id=${d.demande_id}`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AIMemoPanel />
        </div>
      </div>
    </DashboardLayout>
  )
}
