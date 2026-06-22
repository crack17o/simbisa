import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { Wallet, Plus, Phone, X } from 'lucide-react'
import { getMyWallets, listMobileMoney, createMobileMoney } from '@/api/wallets'
import { formatMoney } from '@/utils/apiHelpers'

const OPERATEURS = ['Airtel Money', 'M-Pesa', 'Orange Money', 'Afrimoney']

export default function Wallets() {
  const [wallet, setWallet] = useState(null)
  const [mobileMoney, setMobileMoney] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ telephone: '', operateur: OPERATEURS[0], devise: 'USD' })

  const load = () => {
    Promise.all([getMyWallets(), listMobileMoney()])
      .then(([walletRes, mmRes]) => {
        setWallet(walletRes.data)
        setMobileMoney(mmRes.data || [])
      })
      .catch(err => setError(err.message))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMsg('')
    try {
      await createMobileMoney(form)
      setMsg('Compte Mobile Money enregistré.')
      setShowForm(false)
      setForm({ telephone: '', operateur: OPERATEURS[0], devise: 'USD' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const soldeUsd = wallet?.solde_usd ?? 0
  const soldeCdf = wallet?.solde_cdf ?? 0

  return (
    <DashboardLayout title="Mon portefeuille">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      {msg && <p className="text-sm text-success mb-4">{msg}</p>}

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Solde USD"
            value={formatMoney(soldeUsd, 'USD')}
            sub="Portefeuille Simbisa"
            icon={Wallet}
            accentColor="#D4AF37"
          />
          <StatCard
            label="Solde CDF"
            value={formatMoney(soldeCdf, 'CDF')}
            sub="Portefeuille Simbisa"
            icon={Wallet}
            accentColor="#34D399"
          />
          <StatCard
            label="Comptes Mobile Money"
            value={String(mobileMoney.length)}
            sub="Liés au portefeuille"
            icon={Phone}
            accentColor="#60A5FA"
          />
        </div>

        <div className="neu-flat p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-blanc">Comptes Mobile Money</h3>
            <Button size="sm" icon={showForm ? X : Plus} variant={showForm ? 'ghost' : 'primary'} onClick={() => setShowForm(v => !v)}>
              {showForm ? 'Annuler' : 'Ajouter'}
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="neu-inset p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                label="Numéro Mobile Money"
                type="tel"
                icon={Phone}
                placeholder="+243 8XX XXX XXX"
                value={form.telephone}
                onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted uppercase tracking-widest">Opérateur</label>
                <select
                  value={form.operateur}
                  onChange={e => setForm(p => ({ ...p, operateur: e.target.value }))}
                  className="bg-surface text-blanc text-sm rounded-xl px-3 py-2.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none"
                >
                  {OPERATEURS.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted uppercase tracking-widest">Devise</label>
                <div className="flex gap-2">
                  {['USD', 'CDF'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, devise: d }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${form.devise === d ? 'bg-or text-noir shadow-neu-gold' : 'neu-sm text-muted'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" loading={saving} icon={Plus}>Enregistrer le compte</Button>
              </div>
            </form>
          )}

          {mobileMoney.length === 0 && !showForm && (
            <p className="text-sm text-muted">
              Aucun compte Mobile Money lié. Ajoutez un compte pour activer le scoring Mobile Money et les remboursements automatiques.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {mobileMoney.map(mm => (
              <div key={mm.id} className="neu-sm p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#D4AF3715', color: '#D4AF37' }}>
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blanc">{mm.operateur}</p>
                    <p className="text-xs text-muted">{mm.telephone} · {mm.devise}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mm.solde !== undefined && (
                    <span className="text-sm font-bold text-blanc">{formatMoney(mm.solde, mm.devise)}</span>
                  )}
                  <Badge label={mm.actif ? 'actif' : 'inactif'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="neu-flat p-5 text-sm text-muted leading-relaxed">
          <strong className="text-blanc">Impact sur votre scoring :</strong> les comptes Mobile Money actifs
          alimentent le moteur <span className="text-or">Mobile Money (25%)</span> de votre score de crédit.
          Des flux réguliers et un solde moyen élevé améliorent votre profil de risque.
        </div>
      </div>
    </DashboardLayout>
  )
}
