import React, { useEffect, useState } from 'react'
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

  return (
    <DashboardLayout title="Explications IA">
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
              duree={3}
              motif={d.motif}
              explication={d.explication_ia || d.motif}
            />
          )}
        </div>
        <AIMemoPanel memo={d?.explication_ia} demandeId={detail?.demande_id} />
      </div>
    </DashboardLayout>
  )
}
