import React, { useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import CreditRequestForm from '@/components/organisms/CreditRequestForm'
import CreditDecisionBanner from '@/components/molecules/CreditDecisionBanner'
import ScoringPanel from '@/components/organisms/ScoringPanel'
import AIMemoPanel from '@/components/organisms/AIMemoPanel'
import { useLang } from '@/context/LangContext'
import { getMyScore } from '@/api/scoring'
import { poll } from '@/utils/apiHelpers'

export default function CreditRequest() {
  const { t } = useLang()
  const [decision, setDecision] = useState(null)
  const [scoreData, setScoreData] = useState(null)
  const [polling, setPolling] = useState(false)

  const handleSubmit = async (form) => {
    setDecision(null)
    setPolling(true)
    try {
      const scoreRes = await poll(
        () => getMyScore(),
        {
          until: (res) => res.data?.derniere_demande_id === form.demande_id
            && res.data?.detail_derniere_demande?.decision,
        }
      )
      const detail = scoreRes.data.detail_derniere_demande
      const d = detail?.decision
      setScoreData(scoreRes.data)
      if (d) {
        setDecision({
          decision: d.decision === 'approuvee' ? 'approuve' : d.decision === 'rejetee' ? 'rejete' : d.decision,
          motif: d.motif,
          explication: d.explication_ia || d.motif,
          montant: form.montant,
          duree: form.duree,
          devise: form.devise,
        })
      } else {
        setDecision({
          decision: 'en_analyse',
          motif: t('credit.registered'),
          explication: t('credit.results_soon'),
          montant: form.montant,
          duree: form.duree,
        })
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPolling(false)
    }
  }

  const motors = scoreData?.detail_derniere_demande
  const panelScores = motors ? [
    parseFloat(motors.score_regles?.score || 0),
    parseFloat(motors.score_mobile_money?.score || 0),
    parseFloat(motors.score_comportemental?.score || 0),
    parseFloat(motors.score_ia?.score_normalise || 0),
  ] : [0, 0, 0, 0]

  return (
    <DashboardLayout title={t('credit.page_title')}>
      {polling && <p className="mb-4 text-sm text-muted">{t('credit.analyzing')}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <CreditRequestForm onSubmit={handleSubmit} onError={msg => toast.error(msg)} />
          {decision && <CreditDecisionBanner {...decision} />}
        </div>

        <div className="flex flex-col gap-6">
          <ScoringPanel
            globalScore={Math.round(scoreData?.score_client || 0)}
            riskLevel={motors?.score_ia?.niveau_risque || '—'}
            scores={panelScores}
          />
          {decision && <AIMemoPanel memo={decision.explication} />}
        </div>
      </div>
    </DashboardLayout>
  )
}
