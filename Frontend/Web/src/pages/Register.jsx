import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Lock, User, Mail, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import AuthLayout from '@/components/templates/AuthLayout'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import { useAuth } from '@/context/AuthContext'
import { getHomeRoute } from '@/constants/roles'
import { listCommunes } from '@/api/clients'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [communes, setCommunes] = useState([])
  const [form, setForm] = useState({
    telephone: '', nom: '', postnom: '', prenom: '', email: '',
    commune_kinshasa: '', password: '', password_confirm: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listCommunes()
      .then(res => setCommunes(res.data || []))
      .catch(() => toast.error('Impossible de charger les communes.'))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.commune_kinshasa) {
      toast.error('Sélectionnez votre commune de résidence.')
      return
    }
    if (form.password !== form.password_confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.password.length < 8) {
      toast.error('Mot de passe minimum : 8 caractères.')
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
        <div>
          <h1 className="font-display font-bold text-2xl text-blanc">Créer un compte</h1>
          <p className="text-muted text-sm mt-1">Inclusion financière pour tous — Simbisa</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Téléphone (+243)" name="telephone" type="tel" icon={Phone}
            placeholder="+243 8XX XXX XXX" value={form.telephone}
            onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} required />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prénom" icon={User} value={form.prenom}
              onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} required />
            <FormField label="Nom" value={form.nom}
              onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required />
          </div>

          <FormField label="Post-nom" value={form.postnom}
            onChange={e => setForm(p => ({ ...p, postnom: e.target.value }))} />

          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wide flex items-center gap-2">
              <MapPin size={14} className="text-or" />
              Commune de résidence (Kinshasa)
            </label>
            <select
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-blanc text-sm focus:outline-none focus:border-or/50"
              value={form.commune_kinshasa}
              onChange={e => setForm(p => ({ ...p, commune_kinshasa: e.target.value }))}
              required
            >
              <option value="">Choisir une commune…</option>
              {communes.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted">Vous serez orienté vers l&apos;agent de crédit de votre zone.</p>
          </div>

          <FormField label="Email (recommandé)" type="email" icon={Mail} value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />

          <FormField label="Mot de passe" type="password" icon={Lock} value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />

          <FormField label="Confirmer le mot de passe" type="password" icon={Lock} value={form.password_confirm}
            onChange={e => setForm(p => ({ ...p, password_confirm: e.target.value }))} required />

          <Button type="submit" size="xl" loading={loading}>Créer mon compte</Button>
        </form>

        <button type="button" onClick={() => navigate('/login')} className="text-sm text-or hover:text-or-light">
          Déjà inscrit ? Se connecter
        </button>
      </div>
    </AuthLayout>
  )
}
