import React, { useState, useEffect } from 'react'
import { DollarSign, FileText } from 'lucide-react'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import clsx from 'clsx'
import { submitCreditRequest } from '@/api/credits'
import { getExchangeRate } from '@/api/settings'
import { getMyProfile } from '@/api/clients'

const MOTIFS = [
  'Achat de stock commercial',
  'Équipement professionnel',
  'Frais de scolarité',
  'Fonds de roulement',
  'Autre',
]

const LEVEL_LIMITS = {
  standard: { maxUsd: 300,  maxMonths: 6  },
  pro:      { maxUsd: 700,  maxMonths: 12 },
  pro_plus: { maxUsd: 1200, maxMonths: 12 },
  premium:  { maxUsd: 2500, maxMonths: 12 },
}

const LEVEL_LABELS = {
  standard: 'Standard',
  pro: 'Pro',
  pro_plus: 'Pro+',
  premium: 'Premium',
}

export default function CreditRequestForm({ onSubmit, onError }) {
  const [form, setForm] = useState({ montant: '', duree: '3', motif: '', devise: 'USD' })
  const [limits, setLimits] = useState({ usd_min: 50, usd_max: 1500, cdf_min: 112500, cdf_max: 3375000 })
  const [niveauCompte, setNiveauCompte] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    getExchangeRate()
      .then(res => {
        const d = res.data
        setLimits({
          usd_min: parseFloat(d.usd_credit_min),
          usd_max: parseFloat(d.usd_credit_max),
          cdf_min: parseFloat(d.cdf_credit_min),
          cdf_max: parseFloat(d.cdf_credit_max),
        })
      })
      .catch(() => {})

    getMyProfile()
      .then(res => {
        const level = res.data?.niveau_compte || res.niveau_compte
        if (level) setNiveauCompte(level)
      })
      .catch(() => {})
  }, [])

  const levelLimits = niveauCompte ? LEVEL_LIMITS[niveauCompte] : null

  const min = form.devise === 'CDF' ? limits.cdf_min : limits.usd_min
  const maxFromRate = form.devise === 'CDF' ? limits.cdf_max : limits.usd_max

  // Level limit overrides global max if it's more restrictive
  const maxUsdFromLevel = levelLimits?.maxUsd ?? null
  const maxFromLevel = maxUsdFromLevel != null && form.devise === 'USD'
    ? Math.min(maxFromRate, maxUsdFromLevel)
    : maxFromRate
  const max = maxFromLevel

  const maxMonths = levelLimits?.maxMonths ?? 12

  const validate = () => {
    const e = {}
    const m = +form.montant
    if (!form.montant || m < min) e.montant = `Montant minimum : ${min} ${form.devise}`
    if (m > max) e.montant = `Montant maximum : ${max} ${form.devise}${niveauCompte ? ` (niveau ${LEVEL_LABELS[niveauCompte] || niveauCompte})` : ''}`
    if (!form.motif) e.motif = "Veuillez préciser l'objet du crédit"
    return e
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      const res = await submitCreditRequest({
        devise: form.devise,
        montant_demande: String(form.montant),
        duree_mois: parseInt(form.duree, 10),
        motif: form.motif,
      })
      onSubmit?.({ ...form, demande_id: res.data.demande_id, statut: res.data.statut })
    } catch (err) {
      onError?.(err.message)
      setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Clamp duree if maxMonths changed
  const dureeNum = Math.min(parseInt(form.duree, 10), maxMonths)

  return (
    <form onSubmit={handleSubmit} className="neu-flat p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <h2 className="font-display font-bold text-blanc text-lg">Nouvelle demande de micro-crédit</h2>
        {niveauCompte && (
          <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#D4AF3718', color: '#D4AF37' }}>
            Niveau {LEVEL_LABELS[niveauCompte] || niveauCompte}
          </span>
        )}
      </div>
      <p className="text-sm text-muted">
        Plages : <span className="text-or">{min}</span> — <span className="text-or">{max}</span> {form.devise}
      </p>

      <div className="flex gap-2">
        {['USD', 'CDF'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setForm(p => ({ ...p, devise: d, montant: '' }))}
            className={clsx(
              'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
              form.devise === d ? 'bg-or text-noir shadow-neu-gold' : 'neu-sm text-muted'
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <FormField
        label={`Montant (${form.devise})`}
        name="montant"
        type="number"
        icon={DollarSign}
        placeholder={form.devise === 'USD' ? 'Ex : 250' : 'Ex : 500000'}
        value={form.montant}
        onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
        error={errors.montant || errors.submit}
      />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted uppercase tracking-widest">Durée de remboursement</label>
        <div className="neu-inset p-4 rounded-xl flex flex-col gap-3">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-muted">1 mois</span>
            <span className="text-or-light">{dureeNum} mois</span>
            <span className="text-muted">{maxMonths} mois</span>
          </div>
          <input
            type="range"
            min={1}
            max={maxMonths}
            value={dureeNum}
            onChange={e => setForm(p => ({ ...p, duree: e.target.value }))}
            className="w-full accent-or"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted uppercase tracking-widest">Objet du crédit</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MOTIFS.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setForm(p => ({ ...p, motif: m }))}
              className={clsx(
                'text-sm px-4 py-3 rounded-xl text-left transition-all',
                form.motif === m ? 'text-or-light border border-or/40 shadow-neu-gold neu-sm' : 'neu-sm text-muted hover:text-blanc'
              )}
            >
              {m}
            </button>
          ))}
        </div>
        {errors.motif && <span className="text-xs text-danger">{errors.motif}</span>}
      </div>

      <Button type="submit" size="xl" loading={loading} icon={loading ? undefined : FileText}>
        {loading ? 'Soumission…' : 'Soumettre la demande'}
      </Button>
    </form>
  )
}
