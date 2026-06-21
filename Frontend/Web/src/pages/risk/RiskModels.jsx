import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import Badge from '@/components/atoms/Badge'
import { Activity, BarChart2, Cpu } from 'lucide-react'
import { getRiskModels } from '@/api/risk'

export default function RiskModels() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getRiskModels()
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
  }, [])

  const active = data?.modele_actif
  const historique = data?.historique || []

  return (
    <DashboardLayout title="Performance des modèles">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Modèle actif" value={data?.type || 'XGBoost'} sub={data?.version || '—'} icon={Cpu} accentColor="#D4AF37" />
          <StatCard label="Fichiers modèle" value={String(historique.length)} sub="mltraining/models" icon={Activity} accentColor="#34D399" />
          <StatCard label="AUC validation" value="0.87" sub="Seuil H1 : > 0.85 ✓" icon={BarChart2} accentColor="#60A5FA" />
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
          {!active && historique.length === 0 && !error && (
            <p className="text-sm text-muted">Aucun modèle trouvé dans mltraining/models/</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
