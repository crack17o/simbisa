import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import SavingsWidget from '@/components/organisms/SavingsWidget'
import StatCard from '@/components/molecules/StatCard'
import Badge from '@/components/atoms/Badge'
import { PiggyBank, TrendingUp, Calendar, Award } from 'lucide-react'
import { listSavings, depotSavings, retraitSavings, listSavingsOperations } from '@/api/savings'
import { formatMoney } from '@/utils/apiHelpers'
import { formatDate } from '@/utils/formatters'

export default function Savings() {
  const [accounts, setAccounts] = useState([])
  const [operations, setOperations] = useState([])

  const loadOperations = (accountId) => {
    if (!accountId) return
    listSavingsOperations(accountId)
      .then(res => setOperations(res.data || []))
      .catch(() => setOperations([]))
  }

  const load = () => {
    listSavings()
      .then(res => {
        const list = res.data || []
        setAccounts(list)
        const first = list[0]
        if (first) loadOperations(first.id)
      })
      .catch(err => toast.error(err.message))
  }

  useEffect(() => { load() }, [])

  const usdAccount = accounts.find(a => a.devise === 'USD')
  const cdfAccount = accounts.find(a => a.devise === 'CDF')
  const totalUsd = parseFloat(usdAccount?.solde || 0)
  const totalCdf = parseFloat(cdfAccount?.solde || 0)

  const handleDepot = async (account, amount, mode = '') => {
    try {
      await depotSavings(account.id, { montant: String(amount), mode_paiement: mode, description: 'Dépôt via Simbisa Web' })
      toast.success('Dépôt enregistré.')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRetrait = async (account, amount, mode = '') => {
    try {
      await retraitSavings(account.id, { montant: String(amount), mode_paiement: mode, description: 'Retrait via Simbisa Web' })
      toast.success('Retrait effectué.')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <DashboardLayout title="Épargne virtuelle">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Épargne USD" value={formatMoney(totalUsd, 'USD')} sub={usdAccount?.objectif_description || '—'} icon={PiggyBank} accentColor="#D4AF37" />
          <StatCard label="Épargne CDF" value={formatMoney(totalCdf, 'CDF')} sub={cdfAccount?.objectif_description || '—'} icon={PiggyBank} accentColor="#34D399" />
          <StatCard label="Objectif USD" value={usdAccount ? `${Math.round(usdAccount.progression_pct)}%` : '—'} sub={usdAccount ? formatMoney(usdAccount.objectif_montant, 'USD') : ''} icon={TrendingUp} accentColor="#A78BFA" />
          <StatCard label="Comptes actifs" value={String(accounts.length)} sub="USD + CDF" icon={Award} accentColor="#60A5FA" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {usdAccount && (
            <SavingsWidget
              account={usdAccount}
              onDepot={(amt) => handleDepot(usdAccount, amt)}
              onRetrait={(amt) => handleRetrait(usdAccount, amt)}
            />
          )}
          {cdfAccount && (
            <SavingsWidget
              account={cdfAccount}
              onDepot={(amt) => handleDepot(cdfAccount, amt)}
              onRetrait={(amt) => handleRetrait(cdfAccount, amt)}
            />
          )}
          {!usdAccount && !cdfAccount && (
            <p className="text-sm text-muted">Aucun compte épargne actif. Contactez un agent pour en créer un.</p>
          )}
          <div className="neu-flat p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-blanc">Impact sur le scoring</h3>
            <p className="text-sm text-muted leading-relaxed">
              Chaque dépôt régulier renforce votre score comportemental.
              Consultez votre espace scoring pour suivre votre progression.
            </p>
          </div>
        </div>

        {operations.length > 0 && (
          <div className="neu-flat p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-blanc flex items-center gap-2">
              <Calendar size={18} className="text-or" /> Historique des opérations
            </h3>
            <div className="flex flex-col gap-2">
              {operations.map(op => (
                <div key={op.id} className="neu-sm px-4 py-3 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <Badge label={op.type_operation} />
                    {op.mode_paiement && (
                      <p className="text-xs mt-0.5" style={{ color: '#D4AF37' }}>{op.mode_paiement.replace('_', ' ')}</p>
                    )}
                    <p className="text-xs text-muted mt-0.5">{formatDate(op.date_operation)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${op.type_operation === 'retrait' ? 'text-danger' : 'text-success'}`}>
                      {op.type_operation === 'retrait' ? '−' : '+'}
                      {formatMoney(op.montant, op.devise)}
                    </p>
                    <p className="text-xs text-muted">Solde {formatMoney(op.solde_apres, op.devise)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
