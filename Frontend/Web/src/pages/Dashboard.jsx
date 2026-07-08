import React, { useEffect, useState } from 'react'
import {
  CreditCard, PiggyBank, TrendingUp,
  AlertTriangle, CheckCircle, Sparkles,
} from 'lucide-react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import ScoreRing from '@/components/atoms/ScoreRing'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LangContext'
import { getMyCredits } from '@/api/credits'
import { getMyScore } from '@/api/scoring'
import { listSavings } from '@/api/savings'
import { getMyProfile } from '@/api/clients'
import { formatMoney, mapDecisionLabel } from '@/utils/apiHelpers'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLang()
  const [credits, setCredits] = useState([])
  const [score, setScore] = useState(null)
  const [savingsTotal, setSavingsTotal] = useState({ usd: 0, cdf: 0 })
  const [kycValid, setKycValid] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [creditsRes, scoreRes, savingsRes, profile] = await Promise.all([
          getMyCredits(),
          getMyScore(),
          listSavings(),
          getMyProfile(),
        ])
        if (cancelled) return
        setCredits(creditsRes.data || [])
        setScore(scoreRes.data)
        const accounts = savingsRes.data || []
        setSavingsTotal({
          usd: accounts.filter(a => a.devise === 'USD').reduce((s, a) => s + parseFloat(a.solde), 0),
          cdf: accounts.filter(a => a.devise === 'CDF').reduce((s, a) => s + parseFloat(a.solde), 0),
        })
        setKycValid(!!profile.kyc_valid)
      } catch {
        /* données partielles OK */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const activeCredit = credits.find(c => c.credit?.statut === 'en_cours')
  const recentCredits = credits.slice(0, 3)
  const globalScore = score?.score_client ?? 0

  if (loading) {
    return (
      <DashboardLayout title={t('dash.page_title')}>
        <div className="flex flex-col gap-6 animate-pulse" aria-busy="true" aria-label={t('dash.loading')}>
          <div className="neu-flat p-6 flex items-center justify-between">
            <div className="flex flex-col gap-3">
              <div className="h-3 w-20 bg-white/10 rounded-full" />
              <div className="h-7 w-44 bg-white/10 rounded-xl" />
              <div className="h-3 w-28 bg-white/10 rounded-full" />
            </div>
            <div className="w-24 h-24 rounded-full bg-white/10 flex-shrink-0" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="neu-flat p-5 flex flex-col gap-3">
                <div className="h-3 w-16 bg-white/10 rounded-full" />
                <div className="h-7 w-24 bg-white/10 rounded-xl" />
                <div className="h-3 w-20 bg-white/10 rounded-full" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 neu-flat p-6 flex flex-col gap-4">
              <div className="h-5 w-44 bg-white/10 rounded-xl" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="neu-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex-shrink-0" />
                    <div className="flex flex-col gap-2">
                      <div className="h-3 w-32 bg-white/10 rounded-full" />
                      <div className="h-3 w-16 bg-white/10 rounded-full" />
                    </div>
                  </div>
                  <div className="h-5 w-20 bg-white/10 rounded-xl" />
                </div>
              ))}
            </div>
            <div className="neu-flat p-5 flex flex-col gap-3">
              <div className="h-4 w-28 bg-white/10 rounded-xl" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="neu-sm h-12 bg-white/5 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={t('dash.page_title')}>
      <div className="flex flex-col gap-6">

        <div
          className="neu-flat p-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(145deg, var(--color-panel), var(--color-surface))' }}
        >
          <div>
            <p className="text-muted text-sm">{t('dash.welcome')}</p>
            <h2 className="font-display font-bold text-2xl text-blanc">{user?.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              {kycValid ? (
                <>
                  <CheckCircle size={14} className="text-success" />
                  <span className="text-xs text-success">{t('dash.kyc_valid')}</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} className="text-warning" />
                  <span className="text-xs text-warning">{t('dash.kyc_pending')}</span>
                </>
              )}
            </div>
          </div>
          <ScoreRing score={Math.round(globalScore)} size={100} label={t('dash.my_score')} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t('dash.savings_usd')} value={formatMoney(savingsTotal.usd, 'USD')} sub={t('dash.active_accounts')} icon={PiggyBank} accentColor="#D4AF37" />
          <StatCard label={t('dash.savings_cdf')} value={formatMoney(savingsTotal.cdf, 'CDF')} sub={t('dash.active_accounts')} icon={PiggyBank} accentColor="#34D399" />
          <StatCard label={t('dash.global_score')} value={`${globalScore}/100`} sub={t('dash.avg_currencies')} icon={TrendingUp} accentColor="#A78BFA" />
          <StatCard
            label={t('dash.active_credit')}
            value={activeCredit ? formatMoney(activeCredit.credit?.solde_restant, activeCredit.devise) : '—'}
            sub={activeCredit ? activeCredit.devise : t('dash.none')}
            icon={CreditCard}
            accentColor="#60A5FA"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 neu-flat p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-blanc">{t('dash.credit_history')}</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-credits')}>{t('action.see_all')}</Button>
            </div>

            <div className="flex flex-col gap-3">
              {recentCredits.length === 0 && (
                <p className="text-sm text-muted">{t('dash.no_credits')}</p>
              )}
              {recentCredits.map(c => (
                <div key={c.demande_id} className="neu-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D4AF3715', color: '#D4AF37' }}>
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blanc">#{c.demande_id} · {c.devise}</p>
                      <p className="text-xs text-muted">{c.duree_mois} {t('label.months')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blanc">{formatMoney(c.montant_demande, c.devise)}</span>
                    <Badge label={mapDecisionLabel(c.statut)} />
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" size="md" className="self-start" onClick={() => navigate('/credit-request')}>
              {t('action.new_request')}
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="neu-flat p-5 flex flex-col gap-3">
              <h3 className="font-display font-bold text-blanc text-sm">{t('dash.quick_actions')}</h3>
              {[
                { label: t('dash.request_credit'), to: '/credit-request', icon: CreditCard, color: '#D4AF37' },
                { label: t('dash.save_now'), to: '/savings', icon: PiggyBank, color: '#34D399' },
                { label: t('dash.view_score'), to: '/scoring', icon: TrendingUp, color: '#A78BFA' },
                { label: t('nav.ai'), to: '/ai-explanations', icon: Sparkles, color: '#60A5FA' },
              ].map(a => (
                <button
                  key={a.to}
                  onClick={() => navigate(a.to)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl neu-sm text-left hover:shadow-neu transition-all"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}15`, color: a.color }}>
                    <a.icon size={14} />
                  </div>
                  <span className="text-sm text-blanc">{a.label}</span>
                </button>
              ))}
            </div>

            {activeCredit?.credit && (
              <div className="neu-flat p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-warning" />
                  <h3 className="font-bold text-blanc text-sm">{t('dash.active_loan')}</h3>
                </div>
                <p className="text-2xl font-display font-bold text-or-light">
                  {formatMoney(activeCredit.credit.mensualite, activeCredit.devise)}
                </p>
                <p className="text-xs text-muted mt-1">
                  {t('dash.monthly_payment')} · {t('dash.remaining_balance')} {formatMoney(activeCredit.credit.solde_restant, activeCredit.devise)}
                </p>
                <div className="mt-3">
                  <Button size="sm" className="w-full" onClick={() => navigate('/repayments')}>
                    {t('action.repay')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
