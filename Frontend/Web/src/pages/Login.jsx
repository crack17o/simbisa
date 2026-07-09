import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Phone, Lock, Eye, EyeOff, Shield, Mail } from 'lucide-react'
import { toast } from 'sonner'
import AuthLayout from '@/components/templates/AuthLayout'
import FormField from '@/components/molecules/FormField'
import PhoneInput from '@/components/molecules/PhoneInput'
import Button from '@/components/atoms/Button'
import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LangContext'
import { getHomeRoute } from '@/constants/roles'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { t } = useLang()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({ phone: '', password: '' })
  const [otpCode, setOtpCode] = useState('')
  const [otpStep, setOtpStep] = useState(null)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (location.state?.passwordReset) {
      toast.success('Mot de passe réinitialisé. Connectez-vous.')
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
      setOtpStep({ telephone, password, otpSentTo: result.otpSentTo, reasons: result.reasons })
      toast.info(`Code envoyé à ${result.otpSentTo}`)
      return null
    }
    return result
  }

  const handleBlur = (field) => (e) => {
    const value = e.target.value
    if (!value) {
      setFieldErrors(p => ({
        ...p,
        [field]: field === 'phone' ? t('error.phone_required') : t('error.password_required'),
      }))
    }
  }

  const handleChange = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    if (fieldErrors[field]) setFieldErrors(p => ({ ...p, [field]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.phone || !form.password) {
      setFieldErrors({
        phone: form.phone ? '' : t('error.phone_required'),
        password: form.password ? '' : t('error.password_required'),
      })
      toast.error(t('error.fill_all_fields'))
      return
    }
    setLoading(true)
    try {
      const user = await runLogin(form.phone, form.password)
      if (user) handleLoginSuccess(user)
    } catch (err) {
      toast.error(err.message || t('error.login_failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    if (!otpCode || otpCode.length !== 6) {
      toast.error(t('error.otp_six_digits'))
      return
    }
    setLoading(true)
    try {
      const user = await login(otpStep.telephone, otpStep.password, null, { otp_code: otpCode })
      if (user?.requiresOtp) {
        toast.error(t('error.otp_expired'))
        return
      }
      handleLoginSuccess(user)
    } catch (err) {
      toast.error(err.message || t('error.invalid_code'))
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

          {otpStep.reasons?.length > 0 && (
            <ul className="text-xs text-muted space-y-1">
              {otpStep.reasons.map(r => <li key={r}>• {r}</li>)}
            </ul>
          )}

          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
            <FormField
              name="otp"
              label="Code reçu par e-mail"
              type="text"
              icon={Mail}
              placeholder="000000"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Button type="submit" size="xl" loading={loading}>Valider le code</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOtpStep(null); setOtpCode('') }}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <PhoneInput
            name="phone"
            label="Numéro de téléphone"
            value={form.phone}
            error={fieldErrors.phone}
            onChange={handleChange('phone')}
          />

          <FormField
            name="password"
            label="Mot de passe"
            type={showPwd ? 'text' : 'password'}
            icon={Lock}
            placeholder="••••••••"
            value={form.password}
            error={fieldErrors.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            iconRight={
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                className="text-muted hover:text-or transition-colors"
                aria-label={showPwd ? t('aria.hide_password') : t('aria.show_password')}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <Button type="submit" size="xl" loading={loading}>Se connecter</Button>

          <p className="text-center text-sm">
            <Link to="/forgot-password" className="text-or hover:text-or-light">Mot de passe oublié ?</Link>
          </p>
        </form>

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
