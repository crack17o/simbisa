import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import { TrendingDown, Target, Activity, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/atoms/Button'
import { getRiskDashboard } from '@/api/risk'

export default function RiskDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getRiskDashboard()
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <DashboardLayout title="Gestion du risque">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Taux de défaut" value={data ? `${data.taux_defaut_pct}%` : '—'} sub="Portefeuille" icon={TrendingDown} accentColor="#EF4444" />
          <StatCard label="Seuil approbation" value={String(data?.seuil_approbation ?? '—')} sub="/100 points" icon={Target} accentColor="#D4AF37" />
          <StatCard label="AUC modèle XGBoost" value={String(data?.auc_modele ?? '—')} sub="Validation" icon={Activity} accentColor="#34D399" />
          <StatCard label="Alertes risque" value={String(data?.alertes_risque ?? '—')} sub="Dossiers élevés" icon={AlertTriangle} accentColor="#F59E0B" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="neu-flat p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-blanc">Indicateurs de défaut</h3>
            {[
              { label: 'PD moyenne (30j)', value: data ? `${data.pd_moyenne_30j_pct}%` : '—' },
              { label: 'Dossiers en défaut actif', value: String(data?.dossiers_defaut_actif ?? '—') },
              { label: 'Recovery rate', value: data ? `${data.recovery_rate_pct}%` : '—' },
              { label: 'Corrélation SHAP-LIME', value: String(data?.correlation_shap_lime ?? '—') },
            ].map(item => (
              <div key={item.label} className="flex justify-between neu-sm px-4 py-3 rounded-xl">
                <span className="text-sm text-muted">{item.label}</span>
                <span className="font-semibold text-blanc">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="neu-flat p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-blanc">Actions rapides</h3>
            <Button variant="secondary" onClick={() => navigate('/risk/rules')}>Configurer les règles métier</Button>
            <Button variant="secondary" onClick={() => navigate('/risk/models')}>Analyser les modèles IA</Button>
            <Button variant="secondary" onClick={() => navigate('/scoring')}>Scoring détaillé XAI</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
