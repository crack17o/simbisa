import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Shield, AlertTriangle, Sliders, CheckCircle, XCircle, Eye } from 'lucide-react'
import { getManagerDashboard } from '@/api/manager'
import { submitDemandeDecision } from '@/api/credits'
import { formatMoney } from '@/utils/apiHelpers'

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    getManagerDashboard()
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDecision = async (demandeId, decision) => {
    setBusyId(demandeId)
    try {
      await submitDemandeDecision(demandeId, {
        decision,
        motif: `Validation responsable : ${decision}`,
      })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const dossiers = data?.dossiers || []

  return (
    <DashboardLayout title="Supervision crédit">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Dossiers sensibles" value={String(data?.dossiers_sensibles ?? '—')} sub="En attente validation" icon={Shield} accentColor="#F59E0B" />
          <StatCard label="Exceptions actives" value={String(data?.exceptions_actives ?? '—')} sub="Ouvertes" icon={AlertTriangle} accentColor="#EF4444" />
          <StatCard label="Décisions supervisées" value={String(data?.decisions_supervisees_mois ?? '—')} sub="Ce mois" icon={CheckCircle} accentColor="#22C55E" />
          <StatCard label="Plafond responsable" value={data?.plafond_moyen_usd ? `$${data.plafond_moyen_usd}` : '—'} sub="Ajustable" icon={Sliders} accentColor="#D4AF37" />
        </div>

        <div className="neu-flat p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-blanc">Approbations sensibles</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/manager/exceptions')}>Exceptions →</Button>
          </div>
          {dossiers.length === 0 && !error && (
            <p className="text-sm text-muted">Aucun dossier sensible en attente.</p>
          )}
          {dossiers.map(d => (
            <div key={d.demande_id} className="neu-sm p-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{d.ref}</span>
                  <Badge label={d.risque} />
                </div>
                <p className="font-semibold text-blanc">
                  {d.client} · {formatMoney(d.montant_demande, d.devise)}
                </p>
                <p className="text-xs text-muted">{d.motif_sensible || 'Dossier sensible'}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  icon={CheckCircle}
                  loading={busyId === d.demande_id}
                  onClick={() => handleDecision(d.demande_id, 'approuve')}
                >
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={XCircle}
                  loading={busyId === d.demande_id}
                  onClick={() => handleDecision(d.demande_id, 'rejete')}
                >
                  Rejeter
                </Button>
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
    </DashboardLayout>
  )
}
