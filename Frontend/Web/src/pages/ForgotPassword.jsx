import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Shield, Lock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import AuthLayout from '@/components/templates/AuthLayout'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import {
  forgotPasswordApi,
  verifyResetOtpApi,
  resetPasswordApi,
} from '@/api/auth'

const STEPS = ['email', 'otp', 'password', 'done']

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Saisissez votre adresse e-mail.'); return }
    setLoading(true)
    try {
      const res = await forgotPasswordApi(email.trim())
      const dest = res.data?.otp_sent_to
      toast.info(dest ? `Code envoyé à ${dest}` : res.message)
      setStep('otp')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    if (otpCode.length !== 6) { toast.error('Code à 6 chiffres requis.'); return }
    setLoading(true)
    try {
      const res = await verifyResetOtpApi(email.trim(), otpCode)
      setResetToken(res.data.reset_token)
      setStep('password')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Minimum 8 caractères.'); return }
    if (password !== passwordConfirm) { toast.error('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      await resetPasswordApi({ email: email.trim(), reset_token: resetToken, new_password: password, new_password_confirm: passwordConfirm })
      setStep('done')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="neu-flat p-8 flex flex-col gap-6 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <Shield size={22} className="text-or" />
          <div>
            <h1 className="font-display font-bold text-2xl text-blanc">Mot de passe oublié</h1>
            <p className="text-muted text-sm mt-1">
              {step === 'email' && 'Étape 1 — Votre e-mail'}
              {step === 'otp' && 'Étape 2 — Code reçu par e-mail'}
              {step === 'password' && 'Étape 3 — Nouveau mot de passe'}
              {step === 'done' && 'Terminé'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {STEPS.slice(0, 3).map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${STEPS.indexOf(step) >= i ? 'bg-or' : 'bg-white/10'}`} />
          ))}
        </div>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <FormField
              label="Adresse e-mail du compte"
              type="email"
              icon={Mail}
              placeholder="vous@exemple.cd"
              value={email}
              onChange={e => setEmail(e.target.value)}
              hint="Même e-mail que lors de l'inscription"
            />
            <Button type="submit" size="xl" loading={loading}>Envoyer le code</Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
            <FormField
              label="Code de vérification"
              type="text"
              icon={Shield}
              placeholder="000000"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Button type="submit" size="xl" loading={loading}>Valider le code</Button>
            <Button type="button" variant="ghost" onClick={() => setStep('email')}>← Changer l&apos;e-mail</Button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <FormField label="Nouveau mot de passe" type="password" icon={Lock} value={password}
              onChange={e => setPassword(e.target.value)} />
            <FormField label="Confirmer le mot de passe" type="password" icon={Lock} value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)} />
            <Button type="submit" size="xl" loading={loading}>Enregistrer</Button>
          </form>
        )}

        {step === 'done' && (
          <div className="flex flex-col gap-4 items-center text-center py-4">
            <CheckCircle size={48} className="text-success" />
            <p className="text-blanc font-semibold">Mot de passe réinitialisé avec succès.</p>
            <Button size="xl" onClick={() => navigate('/login', { state: { passwordReset: true } })}>
              Se connecter
            </Button>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-center text-sm text-muted">
            <Link to="/login" className="text-or hover:text-or-light">← Retour à la connexion</Link>
          </p>
        )}
      </div>
    </AuthLayout>
  )
}
