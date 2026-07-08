import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Lock, User, Mail, MapPin, ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import AuthLayout from '@/components/templates/AuthLayout'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import { useAuth } from '@/context/AuthContext'
import { getHomeRoute } from '@/constants/roles'
import { listCommunes } from '@/api/clients'

const PWD_RULES = [
  { key: 'length',  label: '8 car. min',   test: p => p.length >= 8 },
  { key: 'upper',   label: 'Majuscule',     test: p => /[A-Z]/.test(p) },
  { key: 'number',  label: 'Chiffre',       test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'Caractère spécial', test: p => /[^A-Za-z0-9]/.test(p) },
]

const STRENGTH_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E']
const STRENGTH_LABELS = ['Faible', 'Passable', 'Bon', 'Fort']

function PasswordStrength({ password }) {
  if (!password) return null
  const results = PWD_RULES.map(r => ({ ...r, ok: r.test(password) }))
  const score = results.filter(r => r.ok).length
  const color = STRENGTH_COLORS[score - 1] || STRENGTH_COLORS[0]

  return (
    <div className="flex flex-col gap-2 -mt-1">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? color : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: score > 0 ? color : 'transparent' }}>
          {score > 0 ? STRENGTH_LABELS[score - 1] : '—'}
        </span>
        <div className="flex gap-3">
          {results.map(r => (
            <span key={r.key} className="text-xs flex items-center gap-0.5 transition-colors"
              style={{ color: r.ok ? '#22C55E' : 'var(--color-muted)' }}>
              {r.ok ? '✓' : '·'} {r.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [communes, setCommunes] = useState([])
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    telephone: '', nom: '', postnom: '', prenom: '', email: '',
    commune_kinshasa: '', password: '', password_confirm: '',
  })
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    listCommunes()
      .then(res => setCommunes(res.data || []))
      .catch(() => toast.error('Impossible de charger les communes.'))
  }, [])

  const set = field => e => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleNext = () => {
    if (!form.telephone)        { toast.error('Numéro de téléphone requis.'); return }
    if (!form.prenom)           { toast.error('Prénom requis.'); return }
    if (!form.nom)              { toast.error('Nom requis.'); return }
    if (!form.commune_kinshasa) { toast.error('Sélectionnez votre commune.'); return }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Mot de passe minimum : 8 caractères.'); return }
    if (form.password !== form.password_confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (!accepted) {
      toast.error("Acceptez la politique de confidentialité et les conditions d'utilisation.")
      return
    }
    setLoading(true)
    try {
      const user = await register(form)
      navigate(getHomeRoute(user.role), { replace: true })
    } catch (err) {
      toast.error(err.message || 'Inscription impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="neu-flat p-8 flex flex-col gap-6">

        {/* Header + indicateur d'étape */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="font-display font-bold text-2xl text-blanc">Créer un compte</h1>
            <span className="text-xs text-muted tabular-nums">Étape {step} / 2</span>
          </div>
          <p className="text-muted text-sm">Inclusion financière pour tous — Simbisa</p>
          <div className="flex gap-1.5 mt-1">
            {[1, 2].map(s => (
              <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: s <= step ? '#D4AF37' : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        </div>

        {/* ── ÉTAPE 1 : Identité ── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <FormField label="Téléphone (+243)" name="telephone" type="tel" icon={Phone}
              placeholder="+243 8XX XXX XXX" value={form.telephone}
              onChange={set('telephone')} required />

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prénom" icon={User} value={form.prenom}
                onChange={set('prenom')} required />
              <FormField label="Nom" value={form.nom}
                onChange={set('nom')} required />
            </div>

            <FormField label="Post-nom" value={form.postnom}
              onChange={set('postnom')} />

            <div className="w-full flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wide flex items-center gap-2">
                <MapPin size={14} className="text-or" />
                Commune de résidence (Kinshasa)
              </label>
              <select
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-blanc text-sm focus:outline-none focus:border-or/50"
                value={form.commune_kinshasa}
                onChange={set('commune_kinshasa')}
                required
              >
                <option value="">Choisir une commune…</option>
                {communes.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted">
                Vous serez orienté vers l&apos;agent de crédit de votre zone.
              </p>
            </div>

            <FormField label="Email (recommandé)" type="email" icon={Mail} value={form.email}
              onChange={set('email')} />

            <Button type="button" size="xl" icon={ArrowRight} onClick={handleNext}>
              Continuer
            </Button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Sécurité ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <FormField label="Mot de passe" type="password" icon={Lock}
                value={form.password} onChange={set('password')} required />
              <PasswordStrength password={form.password} />
            </div>

            <FormField label="Confirmer le mot de passe" type="password" icon={Lock}
              value={form.password_confirm} onChange={set('password_confirm')} required />

            <div className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--border-subtle)' }}>
              <input
                id="accept-legal"
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 cursor-pointer accent-or"
              />
              <label htmlFor="accept-legal" className="text-xs leading-relaxed cursor-pointer"
                style={{ color: 'var(--color-muted)' }}>
                J&apos;ai lu et j&apos;accepte la{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-or hover:text-or-light underline underline-offset-2">
                  politique de confidentialité
                </a>
                {' '}et les{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  className="text-or hover:text-or-light underline underline-offset-2">
                  conditions d&apos;utilisation
                </a>
                {' '}de Simbisa.
              </label>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button type="submit" size="xl" loading={loading} disabled={!accepted}
                className="flex-1">
                Créer mon compte
              </Button>
            </div>
          </form>
        )}

        <button type="button" onClick={() => navigate('/login')}
          className="text-sm text-or hover:text-or-light">
          Déjà inscrit ? Se connecter
        </button>
      </div>
    </AuthLayout>
  )
}
