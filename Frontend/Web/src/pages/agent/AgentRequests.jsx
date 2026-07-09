import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Eye, MessageSquare, CheckCircle, XCircle, BarChart2, FileText } from 'lucide-react'
import { listDemandes, submitDemandeDecision } from '@/api/credits'
import { formatDate } from '@/utils/formatters'
import { formatMoney } from '@/utils/apiHelpers'

const RECO_VARIANTS = { approuver: 'success', prudence: 'warning', rejeter: 'danger' }
const RECO_LABELS   = { approuver: 'IA: Approuver', prudence: 'IA: Prudence', rejeter: 'IA: Rejeter' }

export default function AgentRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [showShap, setShowShap] = useState({})
  const [observation, setObservation] = useState('')
  const [hasError, setHasError] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setHasError(false)
    listDemandes()
      .then(res => setRequests(res.data || []))
      .catch(err => { toast.error(err.message); setHasError(true) })
  }, [])

  useEffect(() => { load() }, [load])

  const toggleSelected = (id) => {
    setSelected(prev => prev === id ? null : id)
    setObservation('')
  }

  const handleDecision = async (demandeId, decision) => {
    setBusyId(demandeId)
    try {
      await submitDemandeDecision(demandeId, {
        decision,
        motif: `Décision agent : ${decision}`,
        observation,
      })
      toast.success(decision === 'approuve' ? 'Demande approuvée.' : 'Demande rejetée.')
      setSelected(null)
      setObservation('')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout title="Demandes de crédit">
      <div className="flex flex-col gap-4">
        {requests.length === 0 && !hasError && (
          <p className="text-sm text-muted">Aucune demande de crédit.</p>
        )}
        {requests.map(r => (
          <div key={r.demande_id} className="neu-flat p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted">{r.ref}</span>
                  <Badge label={r.risque} />
                  <Badge label={r.statut} />
                  {r.recommandation_ia && (
                    <Badge
                      label={RECO_LABELS[r.recommandation_ia] ?? r.recommandation_ia}
                      variant={RECO_VARIANTS[r.recommandation_ia] ?? 'muted'}
                    />
                  )}
                </div>
                <p className="font-semibold text-blanc mt-1">{r.client}</p>
                <p className="text-sm text-muted">
                  {formatMoney(r.montant_demande, r.devise)} · Score {r.score ?? '—'}/100 · {formatDate(r.date_demande)}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Eye}
                  onClick={() => toggleSelected(r.demande_id)}
                >
                  {selected === r.demande_id ? 'Fermer' : 'Vérifier'}
                </Button>
                {r.statut === 'en_analyse' && (
                  <>
                    <Button
                      size="sm"
                      icon={CheckCircle}
                      loading={busyId === r.demande_id}
                      onClick={() => handleDecision(r.demande_id, 'approuve')}
                    >
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={XCircle}
                      loading={busyId === r.demande_id}
                      onClick={() => handleDecision(r.demande_id, 'rejete')}
                    >
                      Rejeter
                    </Button>
                  </>
                )}
              </div>
            </div>

            {selected === r.demande_id && (
              <div className="flex flex-col gap-3">
                {/* Mémo IA */}
                <div className="neu-inset p-4 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted uppercase tracking-widest flex items-center gap-1">
                      {showShap[r.demande_id]
                        ? <><BarChart2 size={13} /> Analyse SHAP/LIME</>
                        : <><FileText size={13} /> Mémo IA</>}
                    </p>
                    <button
                      className="text-xs text-or hover:text-or-light transition-colors"
                      onClick={() => {
                        if (showShap[r.demande_id]) {
                          setShowShap(p => ({ ...p, [r.demande_id]: false }))
                        } else {
                          navigate(`/scoring?demande_id=${r.demande_id}`)
                        }
                      }}
                    >
                      {showShap[r.demande_id] ? '← Retour au mémo' : 'Voir SHAP/LIME →'}
                    </button>
                  </div>
                  {r.explication_ia ? (
                    <p className="text-sm text-blanc whitespace-pre-wrap leading-relaxed">{r.explication_ia}</p>
                  ) : (
                    <p className="text-sm text-muted italic">Mémo IA non disponible.</p>
                  )}
                </div>

                {/* Observation agent */}
                <div className="neu-inset p-4 rounded-xl flex flex-col gap-3">
                  <p className="text-xs text-muted uppercase tracking-widest flex items-center gap-1">
                    <MessageSquare size={14} /> Observations agent
                  </p>
                  <textarea
                    value={observation}
                    onChange={e => setObservation(e.target.value)}
                    placeholder="Ajouter une observation sur le dossier…"
                    rows={3}
                    className="w-full bg-transparent text-sm text-blanc placeholder-muted/50 outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
