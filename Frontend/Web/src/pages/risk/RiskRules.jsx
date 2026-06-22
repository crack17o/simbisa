import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import { getRiskRules, updateRiskRules } from '@/api/risk'

export default function RiskRules() {
  const [rules, setRules] = useState([])
  const [hasError, setHasError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getRiskRules()
      .then(res => setRules(res.data || []))
      .catch(err => { toast.error(err.message); setHasError(true) })
  }, [])

  const toggle = (code) => {
    setRules(prev => prev.map(r => r.code === code ? { ...r, active: !r.active } : r))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateRiskRules(
        rules.map(r => ({ code: r.code, is_active: r.active }))
      )
      setRules(res.data || [])
      toast.success(res.message || 'Règles enregistrées.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Règles métier">
      <div className="flex flex-col gap-4 max-w-2xl">
        <p className="text-sm text-muted">Règles éliminatoires du moteur « Règles » — toute violation entraîne un rejet automatique.</p>
        {rules.length === 0 && !hasError && (
          <p className="text-sm text-muted">Aucune règle métier configurée.</p>
        )}
        {rules.map(r => (
          <div key={r.code} className="neu-flat p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-blanc">{r.label}</p>
              <p className="text-xs text-muted">{r.description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(r.code)}
              className={`w-12 h-6 rounded-full transition-all ${r.active ? 'bg-or' : 'bg-surface'}`}
              style={{ boxShadow: r.active ? '0 0 8px rgba(212,175,55,0.4)' : 'inset 2px 2px 6px #050505' }}
            >
              <div className={`w-5 h-5 rounded-full bg-blanc transition-transform mx-0.5 ${r.active ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        ))}
        <Button loading={saving} onClick={handleSave}>Enregistrer les règles</Button>
      </div>
    </DashboardLayout>
  )
}
