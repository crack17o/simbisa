import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Phone, Lock, Eye, EyeOff, Shield, Mail } from 'lucide-react'
import AuthLayout from '@/components/templates/AuthLayout'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import { useAuth } from '@/context/AuthContext'
import { getHomeRoute } from '@/constants/roles'
import clsx from 'clsx'

const DEMO_ACCOUNTS = [
  { key: 'client', label: 'Client', color: '#D4AF37' },
  { key: 'agent', label: 'Agent', color: '#60A5FA' },
  { key: 'manager', label: 'Responsable', color: '#A78BFA' },
  { key: 'analyst', label: 'Analyste', color: '#34D399' },
  { key: 'admin', label: 'Admin', color: '#F59E0B' },
  { key: 'auditor', label: 'Auditeur', color: '#EF4444' },
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [otpCode, setOtpCode] = useState('')
  const [otpStep, setOtpStep] = useState(null)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (location.state?.passwordReset) {
      setInfo('Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.')
    }
  }, [location.state])

  const redirectTo = location.state?.from || null

  const handleLoginSuccess = (user) => {
    if (!user?.role) return
    const dest = redirectTo && redirectTo !== '/login' ? redirectTo : getHomeRoute(user.role)
    navigate(dest, { replace: true })
  }

  const runLogin = async (telephone, password, otpOptions = {}) => {
    const result = await login(telephone, password, null, otpOptions)

    if (result?.requiresOtp) {
      setOtpStep({
        telephone,
        password,
        otpSentTo: result.otpSentTo,
        reasons: result.reasons,
        message: result.message,
      })
      setInfo(result.message)
      setError('')
      return null
    }

    return result
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.phone || !form.password) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const user = await runLogin(form.phone, form.password)
      if (user) handleLoginSuccess(user)
    } catch (err) {
      setError(err.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    if (!otpCode || otpCode.length !== 6) {
      setError('Saisissez le code à 6 chiffres reçu par e-mail.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const user = await login(otpStep.telephone, otpStep.password, null, { otp_code: otpCode })
      if (user?.requiresOtp) {
        setError('Code incorrect ou expiré.')
        return
      }
      handleLoginSuccess(user)
    } catch (err) {
      setError(err.message || 'Code invalide.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (key) => {
    setError('')
    setInfo('')
    setOtpStep(null)
    setLoading(true)
    try {
      const user = await login('', '', key)
      if (user?.requiresOtp) {
        setOtpStep({
          demoKey: key,
          otpSentTo: user.otpSentTo,
          reasons: user.reasons,
          message: user.message,
        })
        setInfo(user.message)
        return
      }
      handleLoginSuccess(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoOtp = async (e) => {
    e.preventDefault()
    if (!otpStep?.demoKey) return
    setLoading(true)
    setError('')
    try {
      const user = await login('', '', otpStep.demoKey, { otp_code: otpCode })
      if (user?.requiresOtp) {
        setError('Code incorrect ou expiré.')
        return
      }
      handleLoginSuccess(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (otpStep) {
    return (
      <AuthLayout>
        <div className="neu-flat p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-or" />
            <div>
              <h1 className="font-display font-bold text-2xl text-blanc">Vérification sécurisée</h1>
              <p className="text-muted text-sm mt-1">Code envoyé à {otpStep.otpSentTo}</p>
            </div>
          </div>

          {info && (
            <div className="bg-or/10 border border-or/20 rounded-xl px-4 py-3 text-sm text-or-light">
              {info}
            </div>
          )}
          {otpStep.reasons?.length > 0 && (
            <ul className="text-xs text-muted space-y-1">
              {otpStep.reasons.map(r => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )}
          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={otpStep.demoKey ? handleDemoOtp : handleOtpSubmit} className="flex flex-col gap-4">
            <FormField
              label="Code reçu par e-mail"
              type="text"
              icon={Mail}
              placeholder="000000"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              hint="Valide 10 minutes — vérifiez la console backend en dev"
            />
            <Button type="submit" size="xl" loading={loading}>Valider le code</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOtpStep(null); setOtpCode(''); setInfo(''); setError('') }}
            >
              ← Retour
            </Button>
          </form>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="neu-flat p-8 flex flex-col gap-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-blanc">Connexion</h1>
          <p className="text-muted text-sm mt-1">Accédez à votre espace selon votre rôle</p>
        </div>

        {info && !otpStep && (
          <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-sm text-success">{info}</div>
        )}

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="Numéro de téléphone"
            type="tel"
            icon={Phone}
            placeholder="+243 8XX XXX XXX"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            hint="Ex. +243900000010 (Jean seed)"
          />

          <FormField
            label="Mot de passe"
            type={showPwd ? 'text' : 'password'}
            icon={Lock}
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            iconRight={
              <button type="button" onClick={() => setShowPwd(p => !p)} className="text-muted hover:text-or transition-colors">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <Button type="submit" size="xl" loading={loading}>
            Se connecter
          </Button>

          <p className="text-center text-sm">
            <Link to="/forgot-password" className="text-or hover:text-or-light">
              Mot de passe oublié ?
            </Link>
          </p>
        </form>

        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-3">Connexion rapide (démo)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map(({ key, label, color }) => (
              <button
                key={key}
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin(key)}
                className={clsx(
                  'text-xs px-3 py-2.5 rounded-xl neu-sm transition-all',
                  'hover:shadow-neu-gold text-blanc font-medium disabled:opacity-50'
                )}
                style={{ borderLeft: `3px solid ${color}` }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">
            Seed : +243900000010 · mdp Test123! · OTP par e-mail si MFA ou nouvel appareil
          </p>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-muted">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Button variant="secondary" size="xl" onClick={() => navigate('/register')}>
          Créer un compte Simbisa
        </Button>
      </div>
    </AuthLayout>
  )
}
