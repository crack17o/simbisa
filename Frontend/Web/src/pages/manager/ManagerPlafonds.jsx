import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import { getPlafonds, updatePlafonds, getNiveauPlafonds, updateNiveauPlafonds } from '@/api/manager'

const GLOBAL_FIELDS = [
  { key: 'usd_credit_min',      label: 'Montant minimum crédit',            unit: 'USD' },
  { key: 'usd_credit_max',      label: 'Montant maximum crédit',            unit: 'USD' },
  { key: 'usd_agent_auto_max',  label: 'Plafond auto-approbation agent',    unit: 'USD' },
  { key: 'usd_manager_max',     label: 'Plafond validation responsable',    unit: 'USD' },
]

const NIVEAUX = [
  { key: 'standard', label: 'Standard' },
  { key: 'pro',      label: 'Pro' },
  { key: 'pro_plus', label: 'Pro+' },
  { key: 'premium',  label: 'Premium' },
]

export default function ManagerPlafonds() {
  const [values, setValues]         = useState({})
  const [saving, setSaving]         = useState(false)
  const [niveaux, setNiveaux]       = useState({})
  const [savingNiv, setSavingNiv]   = useState(false)

  useEffect(() => {
    getPlafonds()
      .then(res => setValues(res.data || {}))
      .catch(err => toast.error(err.message))

    getNiveauPlafonds()
      .then(res => setNiveaux(res.data || {}))
      .catch(err => toast.error(err.message))
  }, [])

  const handleSaveGlobal = async () => {
    setSaving(true)
    try {
      const res = await updatePlafonds({
        usd_credit_min:     values.usd_credit_min,
        usd_credit_max:     values.usd_credit_max,
        usd_agent_auto_max: values.usd_agent_auto_max,
        usd_manager_max:    values.usd_manager_max,
      })
      setValues(res.data)
      toast.success(res.message || 'Plafonds enregistrés.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNiveaux = async () => {
    setSavingNiv(true)
    try {
      const res = await updateNiveauPlafonds(niveaux)
      setNiveaux(res.data)
      toast.success(res.message || 'Plafonds par niveau enregistrés.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingNiv(false)
    }
  }

  const setNiv = (niveau, field, val) =>
    setNiveaux(p => ({ ...p, [niveau]: { ...(p[niveau] || {}), [field]: +val } }))

  return (
    <DashboardLayout title="Plafonds de crédit">
      <div className="flex flex-col gap-8 max-w-2xl">

        {/* ── Plafonds globaux ── */}
        <section>
          <h2 className="font-semibold text-blanc mb-1">Plafonds opérationnels</h2>
          <p className="text-xs text-muted mb-4">Limites globales appliquées à toutes les demandes de crédit.</p>
          <div className="flex flex-col gap-3">
            {GLOBAL_FIELDS.map(({ key, label, unit }) => (
              <div key={key} className="neu-flat p-4 flex items-center justify-between gap-4">
                <span className="text-sm text-blanc">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={values[key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [key]: +e.target.value }))}
                    className="w-28 bg-surface text-blanc text-sm rounded-lg px-3 py-2 shadow-neu-inset outline-none text-right"
                  />
                  <span className="text-xs text-muted w-8">{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button loading={saving} onClick={handleSaveGlobal}>Enregistrer les plafonds</Button>
          </div>
        </section>

        {/* ── Plafonds par niveau de compte ── */}
        <section>
          <h2 className="font-semibold text-blanc mb-1">Plafonds par niveau de compte</h2>
          <p className="text-xs text-muted mb-4">
            Définit le montant maximum (USD) et la durée maximale (mois) accessibles par chaque niveau de compte client.
          </p>
          <div className="flex flex-col gap-3">
            {NIVEAUX.map(({ key, label }) => {
              const plafond = niveaux[key] || {}
              return (
                <div key={key} className="neu-flat p-4 grid grid-cols-3 items-center gap-4">
                  <span className="text-sm font-medium text-blanc">{label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={plafond.max_usd ?? ''}
                      onChange={e => setNiv(key, 'max_usd', e.target.value)}
                      placeholder="USD max"
                      className="w-full bg-surface text-blanc text-sm rounded-lg px-3 py-2 shadow-neu-inset outline-none text-right"
                    />
                    <span className="text-xs text-muted shrink-0">USD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={plafond.max_mois ?? ''}
                      onChange={e => setNiv(key, 'max_mois', e.target.value)}
                      placeholder="Mois max"
                      className="w-full bg-surface text-blanc text-sm rounded-lg px-3 py-2 shadow-neu-inset outline-none text-right"
                    />
                    <span className="text-xs text-muted shrink-0">mois</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4">
            <Button loading={savingNiv} onClick={handleSaveNiveaux}>Enregistrer par niveau</Button>
          </div>
        </section>

      </div>
    </DashboardLayout>
  )
}
