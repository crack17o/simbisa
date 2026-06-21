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
import { getMyCredits } from '@/api/credits'
import { getMyScore } from '@/api/scoring'
import { listSavings } from '@/api/savings'
import { getMyProfile } from '@/api/clients'
import { formatMoney, mapDecisionLabel } from '@/utils/apiHelpers'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
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

  return (
    <DashboardLayout title="Tableau de bord">
      <div className="flex flex-col gap-6">
        {loading && <p className="text-sm text-muted">Chargement des données…</p>}

        <div
          className="neu-flat p-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(145deg, #1a1a1a, #141414)' }}
        >
          <div>
            <p className="text-muted text-sm">Bienvenue,</p>
            <h2 className="font-display font-bold text-2xl text-blanc">{user?.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              {kycValid ? (
                <>
                  <CheckCircle size={14} className="text-success" />
                  <span className="text-xs text-success">KYC validé</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} className="text-warning" />
                  <span className="text-xs text-warning">KYC en attente — complétez votre profil</span>
                </>
              )}
            </div>
          </div>
          <ScoreRing score={Math.round(globalScore)} size={100} label="Mon score" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Épargne USD" value={formatMoney(savingsTotal.usd, 'USD')} sub="Comptes actifs" icon={PiggyBank} accentColor="#D4AF37" />
          <StatCard label="Épargne CDF" value={formatMoney(savingsTotal.cdf, 'CDF')} sub="Comptes actifs" icon={PiggyBank} accentColor="#34D399" />
          <StatCard label="Score global" value={`${globalScore}/100`} sub="Moyenne USD + CDF" icon={TrendingUp} accentColor="#A78BFA" />
          <StatCard
            label="Crédit en cours"
            value={activeCredit ? formatMoney(activeCredit.credit?.solde_restant, activeCredit.devise) : '—'}
            sub={activeCredit ? activeCredit.devise : 'Aucun'}
            icon={CreditCard}
            accentColor="#60A5FA"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 neu-flat p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-blanc">Historique des crédits</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-credits')}>Voir tout →</Button>
            </div>

            <div className="flex flex-col gap-3">
              {recentCredits.length === 0 && (
                <p className="text-sm text-muted">Aucune demande de crédit pour le moment.</p>
              )}
              {recentCredits.map(c => (
                <div key={c.demande_id} className="neu-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D4AF3715', color: '#D4AF37' }}>
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blanc">#{c.demande_id} · {c.devise}</p>
                      <p className="text-xs text-muted">{c.duree_mois} mois</p>
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
              + Nouvelle demande
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="neu-flat p-5 flex flex-col gap-3">
              <h3 className="font-display font-bold text-blanc text-sm">Actions rapides</h3>
              {[
                { label: 'Demander un crédit', to: '/credit-request', icon: CreditCard, color: '#D4AF37' },
                { label: 'Épargner maintenant', to: '/savings', icon: PiggyBank, color: '#34D399' },
                { label: 'Voir mon scoring', to: '/scoring', icon: TrendingUp, color: '#A78BFA' },
                { label: 'Explications IA', to: '/ai-explanations', icon: Sparkles, color: '#60A5FA' },
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
                  <h3 className="font-bold text-blanc text-sm">Crédit en cours</h3>
                </div>
                <p className="text-2xl font-display font-bold text-or-light">
                  {formatMoney(activeCredit.credit.mensualite, activeCredit.devise)}
                </p>
                <p className="text-xs text-muted mt-1">
                  Mensualité · Solde {formatMoney(activeCredit.credit.solde_restant, activeCredit.devise)}
                </p>
                <div className="mt-3">
                  <Button size="sm" className="w-full" onClick={() => navigate('/repayments')}>
                    Rembourser
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
