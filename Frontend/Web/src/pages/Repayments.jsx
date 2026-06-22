import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { CreditCard, DollarSign } from 'lucide-react'
import { getMyCredits, submitRepayment } from '@/api/credits'
import { formatMoney, mapDecisionLabel } from '@/utils/apiHelpers'

export default function Repayments() {
  const [credits, setCredits] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [amount, setAmount] = useState('')
  const [modePaiement, setModePaiement] = useState('illicocash')
  const [loading, setLoading] = useState(false)

  const MODES = [
    { value: 'illicocash', label: 'illicocash' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'virement', label: 'Virement bancaire' },
    { value: 'agence', label: 'Agence Rawbank' },
  ]

  const load = () => {
    getMyCredits()
      .then(res => {
        const active = (res.data || []).filter(c => c.credit?.statut === 'en_cours')
        setCredits(active)
        if (active.length && !selectedId) setSelectedId(active[0].credit.id)
      })
      .catch(err => toast.error(err.message))
  }

  useEffect(() => { load() }, [])

  const item = credits.find(c => c.credit?.id === selectedId)
  const credit = item?.credit

  const handlePay = async () => {
    if (!credit || !amount || +amount <= 0) return
    setLoading(true)
    try {
      const res = await submitRepayment(credit.id, {
        montant: String(amount),
        mode_paiement: modePaiement,
      })
      toast.success(res.message || 'Paiement enregistré.')
      setAmount('')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Remboursements">
      <div className="flex flex-col gap-6 max-w-2xl">

        {!credit && <p className="text-sm text-muted">Aucun crédit en cours à rembourser.</p>}

        {credit && (
          <div className="neu-flat p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard size={20} style={{ color: '#D4AF37' }} />
                <div>
                  <p className="font-semibold text-blanc">Crédit #{credit.id} · {item.devise}</p>
                  <p className="text-xs text-muted">Montant accordé {formatMoney(credit.montant_accorde, item.devise)}</p>
                </div>
              </div>
              <Badge label={mapDecisionLabel(credit.statut)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="neu-inset p-4 rounded-xl">
                <p className="text-xs text-muted">Mensualité</p>
                <p className="text-xl font-display font-bold text-or-light">{formatMoney(credit.mensualite, item.devise)}</p>
              </div>
              <div className="neu-inset p-4 rounded-xl">
                <p className="text-xs text-muted">Solde restant</p>
                <p className="text-xl font-display font-bold text-blanc">{formatMoney(credit.solde_restant, item.devise)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted uppercase tracking-widest">Montant ({item.devise})</label>
              <div className="flex gap-3">
                <div className="flex-1 neu-inset rounded-xl overflow-hidden">
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={String(credit.mensualite)}
                    className="w-full bg-transparent px-4 py-3 text-sm text-blanc placeholder-muted/50 outline-none"
                  />
                </div>
                <Button onClick={() => setAmount(String(credit.mensualite))} variant="secondary" size="sm">Mensualité</Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-widest">Mode de paiement</label>
              <select
                value={modePaiement}
                onChange={e => setModePaiement(e.target.value)}
                className="w-full bg-surface text-blanc text-sm rounded-xl px-4 py-3.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none"
              >
                {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <Button size="xl" icon={DollarSign} loading={loading} onClick={handlePay}>
              Rembourser via {MODES.find(m => m.value === modePaiement)?.label}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
