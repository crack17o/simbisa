import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Eye, CheckCircle, XCircle, Search, ChevronRight } from 'lucide-react'
import { listDemandes, submitDemandeDecision } from '@/api/credits'
import { formatDate } from '@/utils/formatters'
import { formatMoney } from '@/utils/apiHelpers'

const RECO_VARIANTS = { approuver: 'success', prudence: 'warning', rejeter: 'danger' }
const RECO_LABELS   = { approuver: 'IA: Approuver', prudence: 'IA: Prudence', rejeter: 'IA: Rejeter' }

const STATUS_OPTIONS = [
  { value: 'all',          label: 'Tous statuts' },
  { value: 'en_analyse',  label: 'En analyse' },
  { value: 'approuve',    label: 'Approuvé' },
  { value: 'rejete',      label: 'Rejeté' },
  { value: 'en_attente',  label: 'En attente' },
]

const RECO_OPTIONS = [
  { value: 'all',      label: 'Toutes reco.' },
  { value: 'approuver', label: 'IA: Approuver' },
  { value: 'prudence',  label: 'IA: Prudence' },
  { value: 'rejeter',   label: 'IA: Rejeter' },
]

export default function AgentRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [hasError, setHasError] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [recoFilter, setRecoFilter] = useState('all')

  const load = useCallback(() => {
    setHasError(false)
    listDemandes()
      .then(res => setRequests(res.data || []))
      .catch(err => { toast.error(err.message); setHasError(true) })
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return requests.filter(r => {
      if (q && !r.client?.toLowerCase().includes(q) && !r.ref?.toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && r.statut !== statusFilter) return false
      if (recoFilter !== 'all' && r.recommandation_ia !== recoFilter) return false
      return true
    })
  }, [requests, search, statusFilter, recoFilter])

  const handleDecision = async (demandeId, decision, e) => {
    e.stopPropagation()
    setBusyId(demandeId)
    try {
      await submitDemandeDecision(demandeId, {
        decision,
        motif: `Décision agent : ${decision}`,
      })
      toast.success(decision === 'approuve' ? 'Demande approuvée.' : 'Demande rejetée.')
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
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par client ou référence…"
              className="w-full neu-inset rounded-xl pl-9 pr-4 py-2.5 text-sm text-blanc placeholder-muted/50 outline-none bg-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="neu-inset rounded-xl px-4 py-2.5 text-sm text-blanc outline-none bg-surface"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={recoFilter}
            onChange={e => setRecoFilter(e.target.value)}
            className="neu-inset rounded-xl px-4 py-2.5 text-sm text-blanc outline-none bg-surface"
          >
            {RECO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {filtered.length === 0 && !hasError && (
          <p className="text-sm text-muted">{requests.length === 0 ? 'Aucune demande de crédit.' : 'Aucune demande ne correspond aux filtres.'}</p>
        )}

        {filtered.map(r => (
          <div
            key={r.demande_id}
            className="neu-flat p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-panel/60 transition-colors"
            onClick={() => navigate(`/agent/requests/${r.demande_id}`)}
          >
            <div className="flex-1 min-w-0">
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
              <p className="font-semibold text-blanc mt-1 truncate">{r.client}</p>
              <p className="text-sm text-muted">
                {formatMoney(r.montant_demande, r.devise)} · Score {r.score ?? '—'}/100 · {formatDate(r.date_demande)}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
              {r.statut === 'en_analyse' && (
                <>
                  <Button
                    size="sm"
                    icon={CheckCircle}
                    loading={busyId === r.demande_id}
                    onClick={(e) => handleDecision(r.demande_id, 'approuve', e)}
                  >
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={XCircle}
                    loading={busyId === r.demande_id}
                    onClick={(e) => handleDecision(r.demande_id, 'rejete', e)}
                  >
                    Rejeter
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" icon={Eye} onClick={e => { e.stopPropagation(); navigate(`/agent/requests/${r.demande_id}`) }}>
                Détail
              </Button>
              <ChevronRight size={14} className="text-muted flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
