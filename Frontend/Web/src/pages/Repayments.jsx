import React, { useEffect, useState } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    getMyCredits()
      .then(res => {
        const active = (res.data || []).filter(c => c.credit?.statut === 'en_cours')
        setCredits(active)
        if (active.length && !selectedId) setSelectedId(active[0].credit.id)
      })
      .catch(err => setError(err.message))
  }

  useEffect(() => { load() }, [])

  const item = credits.find(c => c.credit?.id === selectedId)
  const credit = item?.credit

  const handlePay = async () => {
    if (!credit || !amount || +amount <= 0) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await submitRepayment(credit.id, {
        montant: String(amount),
        mode_paiement: 'illicocash',
      })
      setMessage(res.message)
      setAmount('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Remboursements">
      <div className="flex flex-col gap-6 max-w-2xl">
        {error && <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">{error}</div>}
        {message && <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-sm text-success">{message}</div>}

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

            <Button size="xl" icon={DollarSign} loading={loading} onClick={handlePay}>
              Rembourser via illicocash
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
