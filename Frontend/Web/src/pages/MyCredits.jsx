import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, CalendarDays, Search } from 'lucide-react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { useNavigate } from 'react-router-dom'
import { useLang } from '@/context/LangContext'
import { getMyCredits } from '@/api/credits'
import { formatMoney, mapDecisionLabel } from '@/utils/apiHelpers'

const STATUS_OPTIONS = [
  { value: 'all',         label: 'Tous statuts' },
  { value: 'en_attente',  label: 'En attente' },
  { value: 'en_analyse',  label: 'En analyse' },
  { value: 'approuve',    label: 'Approuvé' },
  { value: 'rejete',      label: 'Rejeté' },
  { value: 'en_cours',    label: 'En cours' },
  { value: 'rembourse',   label: 'Remboursé' },
]

export default function MyCredits() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [credits, setCredits] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    getMyCredits()
      .then(res => setCredits(res.data || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return credits.filter(c => {
      if (q && !String(c.demande_id).includes(q) && !String(c.montant_demande).includes(q)) return false
      if (statusFilter !== 'all' && c.statut !== statusFilter) return false
      return true
    })
  }, [credits, search, statusFilter])

  return (
    <DashboardLayout title={t('credits.page_title')}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm text-muted">
            {loading ? t('label.loading') : `${filtered.length}${filtered.length !== credits.length ? ` / ${credits.length}` : ''} ${t('label.requests')}`}
          </p>
          <Button onClick={() => navigate('/credit-request')}>{t('action.new_request')}</Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par ID…"
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
        </div>

        <div className="flex flex-col gap-3">
          {filtered.length === 0 && !loading && (
            <p className="text-sm text-muted">
              {credits.length === 0 ? t('credits.no_credits') : 'Aucun crédit ne correspond aux filtres.'}
            </p>
          )}
          {filtered.map(c => (
            <div key={c.demande_id} className="neu-flat p-4 sm:p-5 flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: '#D4AF3715', color: '#D4AF37' }}>
                  <CreditCard size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-blanc truncate">#{c.demande_id} · {c.devise}</p>
                  <p className="text-xs text-muted">
                    {c.duree_mois} {t('label.months')}
                    {c.credit?.mensualite ? ` · ${formatMoney(c.credit.mensualite, c.devise)}${t('label.month_abbr')}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-blanc whitespace-nowrap">{formatMoney(c.montant_demande, c.devise)}</span>
                <Badge label={mapDecisionLabel(c.statut)} />
                {c.credit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={CalendarDays}
                    onClick={() => navigate(`/echeancier?credit_id=${c.credit.id}`)}
                  >
                    {t('credits.schedule')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
