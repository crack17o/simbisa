import React, { useState } from 'react'
import { PiggyBank, Target, Plus, Minus } from 'lucide-react'
import Button from '@/components/atoms/Button'
import { formatMoney } from '@/utils/apiHelpers'

export default function SavingsWidget({ account, onDepot, onRetrait }) {
  const balance = parseFloat(account?.solde || 0)
  const goal = parseFloat(account?.objectif_montant || 1)
  const pct = Math.min(Math.round(account?.progression_pct ?? (balance / goal) * 100), 100)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const devise = account?.devise || 'USD'
  const sym = devise === 'CDF' ? 'FC' : '$'

  const run = async (fn) => {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    setLoading(true)
    try {
      await fn(val)
      setAmount('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="neu-flat p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank size={20} style={{ color: '#D4AF37' }} />
          <h2 className="font-display font-bold text-blanc">Épargne {devise}</h2>
        </div>
        <span className="text-xs text-muted">{account?.objectif_description || 'Objectif'}</span>
      </div>

      <div className="neu-inset p-4 rounded-xl text-center">
        <p className="text-xs text-muted uppercase tracking-widest mb-1">Solde actuel</p>
        <p className="text-4xl font-display font-bold text-gradient-gold">{formatMoney(balance, devise)}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted">
            <Target size={14} /> Progression objectif
          </span>
          <span className="text-or font-semibold">{pct}%</span>
        </div>
        <div className="neu-inset h-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #A8861F, #F0C040)',
              boxShadow: '0 0 8px rgba(212,175,55,0.5)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>{formatMoney(0, devise)}</span>
          <span>Objectif : {formatMoney(goal, devise)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 neu-inset rounded-xl overflow-hidden">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={`Montant (${sym})`}
            className="w-full bg-transparent px-4 py-3 text-sm text-blanc placeholder-muted/50 outline-none"
          />
        </div>
        <Button size="sm" icon={Plus} className="aspect-square" loading={loading} onClick={() => run(onDepot)} disabled={!onDepot}>+</Button>
        <Button size="sm" variant="secondary" icon={Minus} className="aspect-square" loading={loading} onClick={() => run(onRetrait)} disabled={!onRetrait}>−</Button>
      </div>
    </div>
  )
}
