import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import { getPlafonds, updatePlafonds } from '@/api/manager'

const FIELDS = [
  { key: 'usd_credit_min', label: 'Montant minimum crédit', unit: 'USD' },
  { key: 'usd_credit_max', label: 'Montant maximum crédit', unit: 'USD' },
  { key: 'usd_agent_auto_max', label: 'Plafond auto-approbation agent', unit: 'USD' },
  { key: 'usd_manager_max', label: 'Plafond validation responsable', unit: 'USD' },
]

export default function ManagerPlafonds() {
  const [values, setValues] = useState({})
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPlafonds()
      .then(res => setValues(res.data || {}))
      .catch(err => setError(err.message))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setMsg('')
    try {
      const res = await updatePlafonds({
        usd_credit_min: values.usd_credit_min,
        usd_credit_max: values.usd_credit_max,
        usd_agent_auto_max: values.usd_agent_auto_max,
        usd_manager_max: values.usd_manager_max,
      })
      setValues(res.data)
      setMsg(res.message || 'Plafonds enregistrés.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Plafonds de crédit">
      <div className="max-w-xl flex flex-col gap-4">
        <p className="text-sm text-muted">Modifiez les plafonds opérationnels. Les changements sont journalisés.</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        {msg && <p className="text-sm text-success">{msg}</p>}
        {FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="neu-flat p-4 flex items-center justify-between gap-4">
            <span className="text-sm text-blanc">{label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={values[key] ?? ''}
                onChange={e => setValues(v => ({ ...v, [key]: +e.target.value }))}
                className="w-24 bg-surface text-blanc text-sm rounded-lg px-3 py-2 shadow-neu-inset outline-none text-right"
              />
              <span className="text-xs text-muted">{unit}</span>
            </div>
          </div>
        ))}
        <Button loading={saving} onClick={handleSave}>Enregistrer les plafonds</Button>
      </div>
    </DashboardLayout>
  )
}
