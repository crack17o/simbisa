import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Activity, BarChart2, Cpu, Server, RefreshCw } from 'lucide-react'
import { getRiskModels, getRiskDashboard, getRiskModelStatus, triggerRetrain } from '@/api/risk'

export default function RiskModels() {
  const [data, setData] = useState(null)
  const [dash, setDash] = useState(null)
  const [modelStatus, setModelStatus] = useState(null)
  const [retraining, setRetraining] = useState(false)

  const load = () =>
    Promise.all([getRiskModels(), getRiskDashboard(), getRiskModelStatus()])
      .then(([modelsRes, dashRes, statusRes]) => {
        setData(modelsRes.data)
        setDash(dashRes.data)
        setModelStatus(statusRes.data)
      })
      .catch(err => toast.error(err.message))

  useEffect(() => { load() }, [])

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      const res = await triggerRetrain()
      toast.success(res.message || 'Ré-entraînement lancé.')
      setTimeout(load, 4000)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRetraining(false)
    }
  }

  const active = data?.modele_actif
  const historique = data?.historique || []
  const auc = dash?.auc_modele ?? null
  const seuil = dash?.seuil_approbation ?? null
  const lastRun = modelStatus?.last_training_run

  return (
    <DashboardLayout title="Performance des modèles">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Modèle actif"
            value={data?.type || 'XGBoost'}
            sub={data?.version || '—'}
            icon={Cpu}
            accentColor="#D4AF37"
          />
          <StatCard
            label="Versions archivées"
            value={String(historique.length)}
            sub="Historique modèles"
            icon={Activity}
            accentColor="#34D399"
          />
          <StatCard
            label="AUC validation"
            value={auc !== null ? String(auc) : '—'}
            sub={seuil !== null ? `Seuil approbation : ${seuil}/100` : 'Non disponible'}
            icon={BarChart2}
            accentColor="#60A5FA"
          />
          <StatCard
            label="Statut moteur IA"
            value={modelStatus?.model_file ? 'Opérationnel' : '—'}
            sub={modelStatus?.model_file ? 'Modèle chargé' : 'Modèle non chargé'}
            icon={Server}
            accentColor={modelStatus?.model_file ? '#34D399' : '#EF4444'}
          />
        </div>

        {/* Bouton retrain */}
        <div className="neu-flat p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-display font-bold text-blanc">Ré-entraînement manuel</p>
            <p className="text-sm text-muted mt-1">
              {lastRun
                ? `Dernier entraînement : ${lastRun.model_version || lastRun.model_name} — ${lastRun.status} — ${lastRun.n_samples ?? '?'} échantillons`
                : 'Aucun historique d\'entraînement disponible.'}
            </p>
            <p className="text-xs text-muted mt-1">
              Planification automatique : {modelStatus?.schedule?.time ?? '03:00'} ({modelStatus?.schedule?.timezone ?? 'Africa/Kinshasa'})
            </p>
          </div>
          <Button
            icon={RefreshCw}
            loading={retraining}
            onClick={handleRetrain}
          >
            Relancer l'entraînement
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {active && (
            <div className="neu-flat p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-blanc">{active.name}</p>
                  <Badge label="production" />
                </div>
                <p className="text-sm text-muted mt-1">
                  {active.filename} · {active.size_kb} Ko
                </p>
              </div>
            </div>
          )}
          {historique.map(m => (
            <div key={m.name} className="neu-flat p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-display font-bold text-blanc">{m.name}</p>
                <p className="text-sm text-muted">{m.filename}</p>
              </div>
              <Badge label={m.name === active?.name ? 'actif' : 'archive'} />
            </div>
          ))}
          {!active && historique.length === 0 && (
            <p className="text-sm text-muted">Aucun modèle disponible.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
