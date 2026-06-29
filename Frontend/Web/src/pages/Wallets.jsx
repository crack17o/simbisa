import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import StatCard from '@/components/molecules/StatCard'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { Wallet, Plus, Phone, X, ArrowDownCircle, ArrowUpCircle, History } from 'lucide-react'
import {
  getMyWallets, listMobileMoney, createMobileMoney,
  depotWallet, retraitWallet, listWalletTransactions,
  detectOperateur, OPERATEUR_LABELS,
} from '@/api/wallets'
import { formatMoney } from '@/utils/apiHelpers'
import { formatDate } from '@/utils/formatters'

const MODES_PAIEMENT = [
  { value: 'illicocash',   label: 'Illico Cash' },
  { value: 'mpesa',        label: 'Vodacom M-Pesa' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'africell',     label: 'Africell Money' },
]

function WalletCard({ wallet, onAction }) {
  const sym = wallet.devise === 'USD' ? '$' : 'FC'
  const color = wallet.devise === 'USD' ? '#D4AF37' : '#34D399'
  return (
    <div className="neu-flat p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
            <Wallet size={18} />
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-widest">Wallet {wallet.devise}</p>
            <p className="text-lg font-bold text-blanc">{sym}{parseFloat(wallet.solde).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <Badge label={wallet.statut} />
      </div>
      <p className="text-xs text-muted font-mono">{wallet.numero_wallet}</p>
      {wallet.statut === 'actif' && (
        <div className="flex gap-2">
          <Button size="sm" icon={ArrowDownCircle} onClick={() => onAction(wallet, 'depot')}
            className="flex-1" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            Déposer
          </Button>
          <Button size="sm" icon={ArrowUpCircle} onClick={() => onAction(wallet, 'retrait')}
            variant="ghost" className="flex-1">
            Retirer
          </Button>
          <Button size="sm" icon={History} onClick={() => onAction(wallet, 'historique')}
            variant="ghost" className="flex-1">
            Historique
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Wallets() {
  const [wallets, setWallets] = useState([])
  const [mobileMoney, setMobileMoney] = useState([])
  const [showMmForm, setShowMmForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mmForm, setMmForm] = useState({ telephone: '', operateur: 'mpesa', devise: 'CDF' })
  const [detectedOp, setDetectedOp] = useState(null)

  // Modal dépôt/retrait
  const [modal, setModal] = useState(null) // { wallet, type: 'depot'|'retrait'|'historique' }
  const [opForm, setOpForm] = useState({ montant: '', mode_paiement: 'illicocash', numero_paiement: '', description: '' })
  const [opLoading, setOpLoading] = useState(false)
  const [transactions, setTransactions] = useState([])

  const load = () => {
    Promise.all([getMyWallets(), listMobileMoney()])
      .then(([wRes, mmRes]) => {
        setWallets(wRes.data || [])
        setMobileMoney(mmRes.data || [])
      })
      .catch(err => toast.error(err.message))
  }

  useEffect(() => { load() }, [])

  const handlePhoneChange = (val) => {
    setMmForm(p => ({ ...p, telephone: val }))
    const op = detectOperateur(val)
    setDetectedOp(op)
    if (op) setMmForm(p => ({ ...p, operateur: op }))
  }

  const handleAddMm = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createMobileMoney({ operateur: mmForm.operateur, numero_telephone: mmForm.telephone, devise: mmForm.devise })
      toast.success('Compte Mobile Money enregistré.')
      setShowMmForm(false)
      setMmForm({ telephone: '', operateur: 'mpesa', devise: 'CDF' })
      setDetectedOp(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openModal = (wallet, type) => {
    setModal({ wallet, type })
    setOpForm({ montant: '', mode_paiement: 'illicocash', numero_paiement: '', description: '' })
    if (type === 'historique') {
      listWalletTransactions(wallet.id).then(r => setTransactions(r.data || [])).catch(() => setTransactions([]))
    }
  }

  const handleOpNumeroChange = (val) => {
    setOpForm(p => ({ ...p, numero_paiement: val }))
    const op = detectOperateur(val)
    if (op) setOpForm(p => ({ ...p, mode_paiement: op }))
  }

  const handleOperation = async (e) => {
    e.preventDefault()
    if (!modal) return
    setOpLoading(true)
    try {
      const fn = modal.type === 'depot' ? depotWallet : retraitWallet
      const res = await fn(modal.wallet.id, {
        montant: opForm.montant,
        mode_paiement: opForm.mode_paiement,
        numero_paiement: opForm.numero_paiement,
        description: opForm.description,
      })
      toast.success(res.message || 'Opération effectuée.')
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOpLoading(false)
    }
  }

  const totalUsd = wallets.find(w => w.devise === 'USD')
  const totalCdf = wallets.find(w => w.devise === 'CDF')

  return (
    <DashboardLayout title="Mon portefeuille">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Solde USD" value={formatMoney(totalUsd?.solde || 0, 'USD')} sub="Wallet Rawbank" icon={Wallet} accentColor="#D4AF37" />
        <StatCard label="Solde CDF" value={formatMoney(totalCdf?.solde || 0, 'CDF')} sub="Wallet Rawbank" icon={Wallet} accentColor="#34D399" />
        <StatCard label="Comptes MM" value={String(mobileMoney.length)} sub="Mobile Money liés" icon={Phone} accentColor="#60A5FA" />
      </div>

      <div className="flex flex-col gap-6">
        {/* Wallets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {wallets.map(w => (
            <WalletCard key={w.id} wallet={w} onAction={openModal} />
          ))}
        </div>

        {/* Mobile Money */}
        <div className="neu-flat p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-blanc">Comptes Mobile Money</h3>
            <Button size="sm" icon={showMmForm ? X : Plus} variant={showMmForm ? 'ghost' : 'primary'}
              onClick={() => setShowMmForm(v => !v)}>
              {showMmForm ? 'Annuler' : 'Ajouter'}
            </Button>
          </div>

          {showMmForm && (
            <form onSubmit={handleAddMm} className="neu-inset p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FormField label="Numéro" type="tel" icon={Phone} placeholder="+243 8XX XXX XXX"
                  value={mmForm.telephone} onChange={e => handlePhoneChange(e.target.value)} />
                {detectedOp && (
                  <p className="text-xs mt-1" style={{ color: '#34D399' }}>
                    Opérateur détecté : {OPERATEUR_LABELS[detectedOp]}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted uppercase tracking-widest">Opérateur</label>
                <select value={mmForm.operateur} onChange={e => setMmForm(p => ({ ...p, operateur: e.target.value }))}
                  className="bg-surface text-blanc text-sm rounded-xl px-3 py-2.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none">
                  {MODES_PAIEMENT.filter(m => m.value !== 'illicocash').map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted uppercase tracking-widest">Devise</label>
                <div className="flex gap-2">
                  {['USD', 'CDF'].map(d => (
                    <button key={d} type="button" onClick={() => setMmForm(p => ({ ...p, devise: d }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mmForm.devise === d ? 'bg-or text-noir shadow-neu-gold' : 'neu-sm text-muted'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" loading={saving} icon={Plus}>Enregistrer</Button>
              </div>
            </form>
          )}

          {mobileMoney.length === 0 && !showMmForm && (
            <p className="text-sm text-muted">
              Aucun compte Mobile Money. L'opérateur est détecté automatiquement depuis votre numéro.
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
                    <p className="text-sm font-semibold text-blanc">{OPERATEUR_LABELS[mm.operateur] || mm.operateur}</p>
                    <p className="text-xs text-muted">{mm.numero_telephone} · {mm.devise}</p>
                  </div>
                </div>
                <Badge label={mm.is_active ? 'actif' : 'inactif'} />
              </div>
            ))}
          </div>
        </div>

        <div className="neu-flat p-5 text-sm text-muted leading-relaxed">
          <strong className="text-blanc">Scoring Mobile Money :</strong> les transactions sur vos comptes
          MM alimentent le moteur <span className="text-or">Mobile Money (25%)</span> de votre score de crédit.
        </div>
      </div>

      {/* Modal dépôt / retrait / historique */}
      {modal && (
        <div className="fixed inset-0 bg-noir/70 z-50 flex items-center justify-center p-4">
          <div className="neu-flat p-6 w-full max-w-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-blanc capitalize">
                {modal.type === 'historique' ? 'Historique' : modal.type} — Wallet {modal.wallet.devise}
              </h3>
              <button onClick={() => setModal(null)} className="text-muted hover:text-blanc">
                <X size={18} />
              </button>
            </div>

            {modal.type === 'historique' ? (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {transactions.length === 0 && <p className="text-sm text-muted">Aucune transaction.</p>}
                {transactions.map(t => (
                  <div key={t.id} className="neu-sm px-4 py-3 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <Badge label={t.type_transaction} />
                      <p className="text-xs text-muted mt-1">{OPERATEUR_LABELS[t.mode_paiement] || t.mode_paiement}</p>
                      <p className="text-xs text-muted">{formatDate(t.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${t.type_transaction === 'retrait' ? 'text-danger' : 'text-success'}`}>
                        {t.type_transaction === 'retrait' ? '−' : '+'}{t.symbole}{parseFloat(t.montant).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted">Solde {t.symbole}{parseFloat(t.solde_apres).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleOperation} className="flex flex-col gap-4">
                <FormField label="Montant" type="number" min="0.01" step="0.01"
                  placeholder={modal.wallet.devise === 'USD' ? '0.00' : '0'}
                  value={opForm.montant} onChange={e => setOpForm(p => ({ ...p, montant: e.target.value }))} required />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted uppercase tracking-widest">Mode de paiement</label>
                  <select value={opForm.mode_paiement}
                    onChange={e => setOpForm(p => ({ ...p, mode_paiement: e.target.value }))}
                    className="bg-surface text-blanc text-sm rounded-xl px-3 py-2.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none">
                    {MODES_PAIEMENT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                {opForm.mode_paiement !== 'illicocash' && (
                  <div>
                    <FormField label="Numéro" type="tel" icon={Phone} placeholder="+243 8XX XXX XXX"
                      value={opForm.numero_paiement} onChange={e => handleOpNumeroChange(e.target.value)} />
                    {opForm.numero_paiement && detectOperateur(opForm.numero_paiement) && (
                      <p className="text-xs mt-1" style={{ color: '#34D399' }}>
                        {OPERATEUR_LABELS[detectOperateur(opForm.numero_paiement)]} détecté
                      </p>
                    )}
                  </div>
                )}

                <FormField label="Description (optionnel)" value={opForm.description}
                  onChange={e => setOpForm(p => ({ ...p, description: e.target.value }))} />

                <Button type="submit" loading={opLoading}
                  icon={modal.type === 'depot' ? ArrowDownCircle : ArrowUpCircle}>
                  Confirmer le {modal.type}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
