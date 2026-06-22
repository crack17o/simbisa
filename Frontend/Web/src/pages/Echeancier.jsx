import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { getMyCredits, getEcheances } from '@/api/credits'
import { formatMoney } from '@/utils/apiHelpers'
import { formatDate } from '@/utils/formatters'

const STATUT_ICON = {
  paye: <CheckCircle2 size={16} className="text-success" />,
  en_retard: <AlertCircle size={16} className="text-danger" />,
  partiellement_paye: <Clock size={16} className="text-warning" />,
  non_paye: <Clock size={16} className="text-muted" />,
}

export default function Echeancier() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [credits, setCredits] = useState([])
  const [selectedCreditId, setSelectedCreditId] = useState(searchParams.get('credit_id') || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyCredits()
      .then(res => {
        const list = (res.data || []).filter(c => c.credit)
        setCredits(list)
        if (!selectedCreditId && list.length) {
          setSelectedCreditId(String(list[0].credit.id))
        }
      })
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedCreditId) return
    setLoading(true)
    setError('')
    getEcheances(selectedCreditId)
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedCreditId])

  const payees = data?.echeances?.filter(e => e.statut === 'paye').length ?? 0
  const total = data?.echeances?.length ?? 0
  const progression = total > 0 ? Math.round((payees / total) * 100) : 0

  return (
    <DashboardLayout title="Échéancier de remboursement">
      <div className="flex flex-col gap-6 max-w-2xl">
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">{error}</div>
        )}

        {credits.length > 1 && (
          <div className="neu-flat p-4 flex items-center gap-3">
            <label className="text-xs text-muted uppercase tracking-widest whitespace-nowrap">Crédit</label>
            <select
              value={selectedCreditId}
              onChange={e => setSelectedCreditId(e.target.value)}
              className="flex-1 bg-surface text-blanc text-sm rounded-xl px-4 py-3 shadow-neu-inset outline-none"
            >
              {credits.map(c => (
                <option key={c.credit.id} value={c.credit.id}>
                  #{c.credit.id} · {c.devise} · {formatMoney(c.montant_demande, c.devise)}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && <p className="text-sm text-muted">Chargement…</p>}

        {data && !loading && (
          <>
            <div className="neu-flat p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="neu-inset p-3 rounded-xl">
                  <p className="text-xs text-muted">Montant accordé</p>
                  <p className="font-display font-bold text-blanc mt-1">
                    {formatMoney(data.montant_accorde, data.devise)}
                  </p>
                </div>
                <div className="neu-inset p-3 rounded-xl">
                  <p className="text-xs text-muted">Mensualité</p>
                  <p className="font-display font-bold text-or-light mt-1">
                    {formatMoney(data.mensualite, data.devise)}
                  </p>
                </div>
                <div className="neu-inset p-3 rounded-xl">
                  <p className="text-xs text-muted">Solde restant</p>
                  <p className="font-display font-bold text-blanc mt-1">
                    {formatMoney(data.solde_restant, data.devise)}
                  </p>
                </div>
                <div className="neu-inset p-3 rounded-xl">
                  <p className="text-xs text-muted">Progression</p>
                  <p className="font-display font-bold text-success mt-1">{payees}/{total} échéances</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden shadow-neu-inset">
                  <div
                    className="h-full rounded-full bg-success transition-all"
                    style={{ width: `${progression}%` }}
                  />
                </div>
                <span className="text-xs text-success font-bold">{progression}%</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {data.echeances.length === 0 && (
                <p className="text-sm text-muted">
                  Aucune échéance générée — le crédit vient peut-être d'être accordé.
                </p>
              )}
              {data.echeances.map((e, i) => (
                <div
                  key={e.id}
                  className={`neu-flat p-4 flex items-center justify-between gap-4 ${
                    e.statut === 'en_retard' ? 'border border-danger/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface text-xs font-bold text-muted">
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {STATUT_ICON[e.statut] || STATUT_ICON.non_paye}
                        <p className="text-sm font-semibold text-blanc">{formatDate(e.date_echeance)}</p>
                      </div>
                      {e.statut === 'partiellement_paye' && (
                        <p className="text-xs text-warning mt-0.5">
                          Payé {formatMoney(e.montant_paye, data.devise)} · Reste {formatMoney(e.restant, data.devise)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-display font-bold text-blanc">
                      {formatMoney(e.montant, data.devise)}
                    </span>
                    <Badge label={e.statut} />
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" onClick={() => navigate('/repayments')}>
              Effectuer un remboursement →
            </Button>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
