import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import { getRiskRules, updateRiskRules } from '@/api/risk'

export default function RiskRules() {
  const [rules, setRules] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getRiskRules()
      .then(res => setRules(res.data || []))
      .catch(err => setError(err.message))
  }, [])

  const toggle = (code) => {
    setRules(prev => prev.map(r => r.code === code ? { ...r, active: !r.active } : r))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setMsg('')
    try {
      const res = await updateRiskRules(
        rules.map(r => ({ code: r.code, is_active: r.active }))
      )
      setRules(res.data || [])
      setMsg(res.message || 'Règles enregistrées.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Règles métier">
      <div className="flex flex-col gap-4 max-w-2xl">
        <p className="text-sm text-muted">Règles éliminatoires du moteur « Règles » — toute violation entraîne un rejet automatique.</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        {msg && <p className="text-sm text-success">{msg}</p>}
        {rules.length === 0 && !error && (
          <p className="text-sm text-muted">Aucune règle — lancez <code>seed_demo</code> côté backend.</p>
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
