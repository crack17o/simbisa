import React, { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import ScoringPanel from '@/components/organisms/ScoringPanel'
import Button from '@/components/atoms/Button'
import { BarChart2, Info, Search, RefreshCw, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LangContext'
import { ROLES } from '@/constants/roles'
import { getMyScore, getScoringDetail, triggerScoring } from '@/api/scoring'

export default function ScoringDetail() {
  const { user } = useAuth()
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const isClient = user?.role === ROLES.CLIENT
  const title = isClient ? t('score.page_title_client') : t('score.page_title_agent')
  const [data, setData] = useState(null)
  const [demandeId, setDemandeId] = useState(searchParams.get('demande_id') || '')
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)

  const handleTrigger = async () => {
    if (!demandeId) { toast.error(t('score.enter_id')); return }
    setTriggering(true)
    try {
      await triggerScoring(demandeId)
      toast.success(t('score.relaunch_ok'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setTriggering(false)
    }
  }

  const loadDemande = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getScoringDetail(id)
      setData({
        detail_derniere_demande: res.data,
        score_client: parseFloat(res.data?.decision?.score_global || res.data?.score_ia?.score_normalise || 0),
      })
      setSearchParams({ demande_id: id })
    } catch (err) {
      toast.error(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [setSearchParams])

  useEffect(() => {
    if (isClient) {
      getMyScore()
        .then(res => setData(res.data))
        .catch(err => toast.error(err.message))
    }
  }, [isClient])

  useEffect(() => {
    const id = searchParams.get('demande_id')
    if (id && !isClient) {
      setDemandeId(id)
      loadDemande(id)
    }
  }, [searchParams, isClient, loadDemande])

  const detail = data?.detail_derniere_demande
  const shap = detail?.score_ia?.shap_values || {}
  const shapFeatures = Object.entries(shap).map(([name, val]) => ({
    name,
    shap: val,
    val: String(val),
  }))

  const panelScores = detail ? [
    parseFloat(detail.score_regles?.score || 0),
    parseFloat(detail.score_mobile_money?.score || 0),
    parseFloat(detail.score_comportemental?.score || 0),
    parseFloat(detail.score_ia?.score_normalise || 0),
  ] : [0, 0, 0, 0]

  const max = shapFeatures.length
    ? Math.max(...shapFeatures.map(f => Math.abs(f.shap)), 0.01)
    : 1

  return (
    <DashboardLayout title={title}>

      {!isClient && (
        <div className="mb-6 neu-flat p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted block mb-1">ID demande crédit</label>
            <input
              type="number"
              value={demandeId}
              onChange={e => setDemandeId(e.target.value)}
              placeholder="ex. 1"
              className="w-full bg-surface text-blanc text-sm rounded-lg px-3 py-2 shadow-neu-inset outline-none"
            />
          </div>
          <Button icon={Search} loading={loading} onClick={() => loadDemande(demandeId)}>
            Charger
          </Button>
          <Button icon={RefreshCw} variant="secondary" loading={triggering} onClick={handleTrigger}>
            Relancer scoring
          </Button>
        </div>
      )}

      {/* RAG Memo */}
      {(detail?.decision?.explication_ia) && (
        <div className="neu-flat p-6 flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: '#D4AF37' }} />
            <h2 className="font-display font-bold text-blanc">Mémo IA</h2>
          </div>
          <p className="text-sm text-blanc whitespace-pre-wrap leading-relaxed">
            {detail.decision.explication_ia}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScoringPanel
          globalScore={Math.round(data?.score_client || detail?.decision?.score_global || 0)}
          riskLevel={detail?.score_ia?.niveau_risque || 'non_evalue'}
          scores={panelScores}
        />

        <div className="neu-flat p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} style={{ color: '#D4AF37' }} />
            <h2 className="font-display font-bold text-blanc">Attributions SHAP</h2>
          </div>
          <p className="text-xs text-muted flex items-start gap-1.5">
            <Info size={12} className="mt-0.5 flex-shrink-0" />
            Contribution de chaque variable au score final (valeurs SHAP).
          </p>

          {shapFeatures.length === 0 && (
            <p className="text-sm text-muted">Soumettez une demande de crédit pour obtenir une analyse explicative.</p>
          )}

          <div className="flex flex-col gap-3">
            {shapFeatures.map(f => {
              const isPos = f.shap >= 0
              const pct = (Math.abs(f.shap) / max) * 100
              const color = isPos ? '#34D399' : '#EF4444'
              return (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{f.name}</span>
                    <span className="font-bold" style={{ color }}>
                      {isPos ? '+' : ''}{Number(f.shap).toFixed(2)}
                    </span>
                  </div>
                  <div className="neu-inset h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
