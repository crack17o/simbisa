import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import FormField from '@/components/molecules/FormField'
import { Shield, Lock, DollarSign } from 'lucide-react'
import {
  getAdminExchangeRate,
  updateExchangeRate,
  getAdminSecurity,
  updateAdminSecurity,
} from '@/api/settings'

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    mfa_obligatoire_agents: false,
    session_timeout_minutes: 30,
    maintenance_mode: false,
    max_tentatives_connexion: 5,
  })
  const [cdfPerUsd, setCdfPerUsd] = useState(2250)
  const [rateMsg, setRateMsg] = useState('')
  const [rateError, setRateError] = useState('')
  const [secMsg, setSecMsg] = useState('')
  const [secError, setSecError] = useState('')
  const [savingRate, setSavingRate] = useState(false)
  const [savingSec, setSavingSec] = useState(false)

  useEffect(() => {
    getAdminExchangeRate()
      .then(res => setCdfPerUsd(res.data.cdf_per_usd))
      .catch(err => setRateError(err.message))
    getAdminSecurity()
      .then(res => setSettings(prev => ({ ...prev, ...res.data })))
      .catch(err => setSecError(err.message))
  }, [])

  const saveRate = async () => {
    setSavingRate(true)
    setRateError('')
    setRateMsg('')
    try {
      const res = await updateExchangeRate(parseInt(cdfPerUsd, 10))
      setRateMsg(res.message)
    } catch (err) {
      setRateError(err.message)
    } finally {
      setSavingRate(false)
    }
  }

  const saveSecurity = async () => {
    setSavingSec(true)
    setSecError('')
    setSecMsg('')
    try {
      const res = await updateAdminSecurity({
        mfa_obligatoire_agents: settings.mfa_obligatoire_agents,
        maintenance_mode: settings.maintenance_mode,
        session_timeout_minutes: settings.session_timeout_minutes,
      })
      setSettings(prev => ({ ...prev, ...res.data }))
      setSecMsg(res.message)
    } catch (err) {
      setSecError(err.message)
    } finally {
      setSavingSec(false)
    }
  }

  return (
    <DashboardLayout title="Paramètres plateforme">
      <div className="max-w-xl flex flex-col gap-4">
        <div className="neu-flat p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-or" />
            <h3 className="font-display font-bold text-blanc">Taux de change</h3>
          </div>
          <FormField
            label="CDF pour 1 USD"
            type="number"
            icon={DollarSign}
            value={cdfPerUsd}
            onChange={e => setCdfPerUsd(e.target.value)}
          />
          {rateMsg && <p className="text-sm text-success">{rateMsg}</p>}
          {rateError && <p className="text-sm text-danger">{rateError}</p>}
          <Button loading={savingRate} onClick={saveRate}>Enregistrer le taux</Button>
        </div>

        <div className="neu-flat p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-or" />
            <h3 className="font-display font-bold text-blanc">Sécurité</h3>
          </div>

          {[
            { key: 'mfa_obligatoire_agents', label: 'MFA obligatoire pour les agents' },
            { key: 'maintenance_mode', label: 'Mode maintenance' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between neu-sm px-4 py-3 rounded-xl cursor-pointer">
              <span className="text-sm text-blanc">{label}</span>
              <input
                type="checkbox"
                checked={!!settings[key]}
                onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked }))}
                className="accent-or w-4 h-4"
              />
            </label>
          ))}

          <div className="flex items-center justify-between neu-sm px-4 py-3 rounded-xl">
            <span className="text-sm text-blanc">Timeout session (minutes)</span>
            <input
              type="number"
              value={settings.session_timeout_minutes}
              onChange={e => setSettings(s => ({ ...s, session_timeout_minutes: +e.target.value }))}
              className="w-16 bg-surface text-blanc text-sm rounded-lg px-2 py-1 text-right outline-none"
            />
          </div>

          {secMsg && <p className="text-sm text-success">{secMsg}</p>}
          {secError && <p className="text-sm text-danger">{secError}</p>}
          <Button variant="secondary" icon={Lock} loading={savingSec} onClick={saveSecurity}>
            Enregistrer sécurité
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
