import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { ArrowLeft, BarChart2, FileText, Info, CheckCircle, XCircle, MessageSquare, Lock } from 'lucide-react'
import { getDemande, submitDemandeDecision, cloturerDemande } from '@/api/credits'
import { getScoringDetail } from '@/api/scoring'
import { formatDate } from '@/utils/formatters'
import { formatMoney } from '@/utils/apiHelpers'

const RECO_VARIANTS = { approuver: 'success', prudence: 'warning', rejeter: 'danger' }
const RECO_LABELS   = { approuver: 'IA: Approuver', prudence: 'IA: Prudence', rejeter: 'IA: Rejeter' }

export default function AgentRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [demande, setDemande] = useState(null)
  const [scoring, setScoring] = useState(null)
  const [loading, setLoading] = useState(true)
  const [observation, setObservation] = useState('')
  const [busy, setBusy] = useState(null)
  const [cloturerOpen, setCloturerOpen] = useState(false)
  const [motifCloture, setMotifCloture] = useState('')
  const [busyCloture, setBusyCloture] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.allSettled([getDemande(id), getScoringDetail(id)])
      .then(([demandeRes, scoringRes]) => {
        if (demandeRes.status === 'fulfilled') {
          setDemande(demandeRes.value.data || demandeRes.value)
        } else {
          toast.error('Impossible de charger la demande.')
        }
        if (scoringRes.status === 'fulfilled') {
          setScoring(scoringRes.value.data)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleDecision = async (decision) => {
    setBusy(decision)
    try {
      await submitDemandeDecision(id, {
        decision,
        motif: `Décision agent : ${decision}`,
        observation,
      })
      toast.success(decision === 'approuve' ? 'Demande approuvée.' : 'Demande rejetée.')
      navigate('/agent/requests')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  const handleCloturer = async () => {
    if (!motifCloture.trim()) return
    setBusyCloture(true)
    try {
      await cloturerDemande(id, motifCloture.trim())
      toast.success('Dossier clôturé.')
      setCloturerOpen(false)
      navigate('/agent/requests')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyCloture(false)
    }
  }

  const shap = scoring?.score_ia?.shap_values || {}
  const shapFeatures = Object.entries(shap).map(([name, val]) => ({ name, shap: val }))
  const max = shapFeatures.length ? Math.max(...shapFeatures.map(f => Math.abs(f.shap)), 0.01) : 1
  const explicationIa = demande?.explication_ia || scoring?.decision?.explication_ia

  return (
    <DashboardLayout title="Détail demande">
      <div className="flex flex-col gap-6 max-w-5xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted">
          <button
            onClick={() => navigate('/agent/requests')}
            className="flex items-center gap-1.5 text-muted hover:text-or transition-colors"
          >
            <ArrowLeft size={14} />
            Demandes de crédit
          </button>
          <span>/</span>
          <span className="text-blanc">{loading ? '…' : (demande?.ref || `Demande #${id}`)}</span>
        </div>

        {loading && <p className="text-sm text-muted">Chargement du dossier…</p>}

        {!loading && demande && (
          <>
            {/* Header */}
            <div className="neu-flat p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs text-muted font-mono">{demande.ref}</span>
                  {demande.risque && <Badge label={demande.risque} />}
                  {demande.statut && <Badge label={demande.statut} />}
                  {demande.recommandation_ia && (
                    <Badge
                      label={RECO_LABELS[demande.recommandation_ia] ?? demande.recommandation_ia}
                      variant={RECO_VARIANTS[demande.recommandation_ia] ?? 'muted'}
                    />
                  )}
                </div>
                <p className="font-bold text-blanc text-lg">{demande.client}</p>
                <p className="text-sm text-muted">
                  {formatMoney(demande.montant_demande, demande.devise)} ·{' '}
                  {demande.duree_mois} mois ·{' '}
                  Score {demande.score ?? (scoring?.decision?.score_global ? Math.round(scoring.decision.score_global) : '—')}/100 ·{' '}
                  {formatDate(demande.date_demande)}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {demande.statut === 'en_analyse' && (
                  <>
                    <Button icon={CheckCircle} loading={busy === 'approuve'} onClick={() => handleDecision('approuve')}>
                      Approuver
                    </Button>
                    <Button variant="danger" icon={XCircle} loading={busy === 'rejete'} onClick={() => handleDecision('rejete')}>
                      Rejeter
                    </Button>
                  </>
                )}
                {demande.statut !== 'cloture' && (
                  <Button variant="secondary" icon={Lock} onClick={() => setCloturerOpen(true)}>
                    Clôturer
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RAG Memo IA */}
              <div className="neu-flat p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <FileText size={18} style={{ color: '#D4AF37' }} />
                  <h2 className="font-display font-bold text-blanc">Mémo IA</h2>
                </div>
                {explicationIa ? (
                  <p className="text-sm text-blanc whitespace-pre-wrap leading-relaxed">{explicationIa}</p>
                ) : (
                  <p className="text-sm text-muted italic">
                    Mémo IA non disponible — le scoring n'a pas encore été calculé pour cette demande.
                  </p>
                )}

                {/* Observation */}
                {demande.statut === 'en_analyse' && (
                  <div className="mt-2">
                    <p className="text-xs text-muted uppercase tracking-widest mb-2 flex items-center gap-1">
                      <MessageSquare size={12} /> Observation agent
                    </p>
                    <textarea
                      value={observation}
                      onChange={e => setObservation(e.target.value)}
                      placeholder="Ajoutez une observation sur ce dossier…"
                      rows={3}
                      className="w-full neu-inset rounded-xl px-4 py-3 text-sm text-blanc placeholder-muted/50 outline-none resize-none bg-transparent"
                    />
                  </div>
                )}
              </div>

              {/* SHAP */}
              <div className="neu-flat p-6 flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} style={{ color: '#D4AF37' }} />
                  <h2 className="font-display font-bold text-blanc">Attributions SHAP</h2>
                </div>
                <p className="text-xs text-muted flex items-start gap-1.5">
                  <Info size={12} className="mt-0.5 flex-shrink-0" />
                  Contribution de chaque variable au score final.
                </p>

                {shapFeatures.length === 0 && (
                  <p className="text-sm text-muted">Analyse SHAP non disponible pour cette demande.</p>
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
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {cloturerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="neu-flat p-6 w-full max-w-md flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Lock size={18} style={{ color: '#D4AF37' }} />
              <h3 className="font-display font-bold text-blanc text-lg">Clôturer le dossier</h3>
            </div>
            <p className="text-sm text-muted">Indiquez le motif de clôture. Cette action est définitive.</p>
            <textarea
              value={motifCloture}
              onChange={e => setMotifCloture(e.target.value)}
              placeholder="Ex : Remboursement intégral hors délai, accord à l'amiable…"
              rows={3}
              className="w-full neu-inset rounded-xl px-4 py-3 text-sm text-blanc placeholder-muted/50 outline-none resize-none bg-transparent"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setCloturerOpen(false); setMotifCloture('') }}>
                Annuler
              </Button>
              <Button
                variant="danger"
                icon={Lock}
                loading={busyCloture}
                onClick={handleCloturer}
                disabled={!motifCloture.trim()}
              >
                Confirmer la clôture
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
