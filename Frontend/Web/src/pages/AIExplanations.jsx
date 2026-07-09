import React, { useEffect, useState } from 'react'
import { BarChart2, Info } from 'lucide-react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import ScoringPanel from '@/components/organisms/ScoringPanel'
import AIMemoPanel from '@/components/organisms/AIMemoPanel'
import CreditDecisionBanner from '@/components/molecules/CreditDecisionBanner'
import { getMyScore } from '@/api/scoring'

export default function AIExplanations() {
  const [data, setData] = useState(null)

  useEffect(() => {
    getMyScore().then(res => setData(res.data)).catch(() => {})
  }, [])

  const detail = data?.detail_derniere_demande
  const d = detail?.decision

  const panelScores = detail ? [
    parseFloat(detail.score_regles?.score || 0),
    parseFloat(detail.score_mobile_money?.score || 0),
    parseFloat(detail.score_comportemental?.score || 0),
    parseFloat(detail.score_ia?.score_normalise || 0),
  ] : [0, 0, 0, 0]

  const shap = detail?.score_ia?.shap_values || {}
  const shapFeatures = Object.entries(shap)
    .map(([name, val]) => ({ name, shap: parseFloat(val) }))
    .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))
    .slice(0, 8)
  const shapMax = shapFeatures.length
    ? Math.max(...shapFeatures.map(f => Math.abs(f.shap)), 0.01)
    : 1

  return (
    <DashboardLayout title="Mon score & Explications IA">
      {/* Ligne principale : scoring + mémo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <ScoringPanel
            globalScore={Math.round(data?.score_client || 0)}
            riskLevel={detail?.score_ia?.niveau_risque || '—'}
            scores={panelScores}
          />
          {d && (
            <CreditDecisionBanner
              decision={d.decision === 'approuvee' ? 'approuve' : d.decision}
              montant={detail.montant_demande}
              duree={detail.duree_mois}
              devise={detail.devise}
              motif={d.motif}
              explication={d.explication_ia || d.motif}
            />
          )}
        </div>
        <AIMemoPanel memo={d?.explication_ia} demandeId={detail?.demande_id} />
      </div>

      {/* Attributions SHAP */}
      {shapFeatures.length > 0 && (
        <div className="neu-flat p-6 flex flex-col gap-5 mt-6">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} style={{ color: '#D4AF37' }} />
            <h2 className="font-display font-bold text-blanc">Facteurs qui influencent votre score</h2>
          </div>
          <p className="text-xs text-muted flex items-start gap-1.5">
            <Info size={12} className="mt-0.5 flex-shrink-0" />
            Chaque barre montre l'impact d'un critère sur votre score final. Vert&nbsp;= favorable, Rouge&nbsp;= défavorable.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
            {shapFeatures.map(f => {
              const isPos = f.shap >= 0
              const pct = (Math.abs(f.shap) / shapMax) * 100
              const color = isPos ? '#34D399' : '#EF4444'
              return (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted capitalize">{f.name.replace(/_/g, ' ')}</span>
                    <span className="font-bold" style={{ color }}>
                      {isPos ? '+' : ''}{f.shap.toFixed(3)}
                    </span>
                  </div>
                  <div className="neu-inset h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!data && (
        <p className="text-center text-muted text-sm mt-10">
          Soumettez une demande de crédit pour obtenir votre score et les explications IA.
        </p>
      )}
    </DashboardLayout>
  )
}
