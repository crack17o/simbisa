import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Eye, MessageSquare, CheckCircle, XCircle } from 'lucide-react'
import { listDemandes, submitDemandeDecision } from '@/api/credits'
import { formatDate } from '@/utils/formatters'
import { formatMoney } from '@/utils/apiHelpers'

export default function AgentRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [observation, setObservation] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    listDemandes()
      .then(res => setRequests(res.data || []))
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDecision = async (demandeId, decision) => {
    setBusyId(demandeId)
    setError('')
    try {
      await submitDemandeDecision(demandeId, {
        decision,
        motif: `Décision agent : ${decision}`,
        observation,
      })
      setSelected(null)
      setObservation('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout title="Demandes de crédit">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <div className="flex flex-col gap-4">
        {requests.length === 0 && !error && (
          <p className="text-sm text-muted">Aucune demande de crédit.</p>
        )}
        {requests.map(r => (
          <div key={r.demande_id} className="neu-flat p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{r.ref}</span>
                  <Badge label={r.risque} />
                  <Badge label={r.statut} />
                </div>
                <p className="font-semibold text-blanc mt-1">{r.client}</p>
                <p className="text-sm text-muted">
                  {formatMoney(r.montant_demande, r.devise)} · Score {r.score ?? '—'}/100 · {formatDate(r.date_demande)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Eye}
                  onClick={() => setSelected(selected === r.demande_id ? null : r.demande_id)}
                >
                  Vérifier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Eye}
                  onClick={() => navigate(`/scoring?demande_id=${r.demande_id}`)}
                >
                  Scoring
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
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
