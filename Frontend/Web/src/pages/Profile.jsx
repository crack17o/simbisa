import React, { useEffect, useRef, useState } from 'react'
import { User, MapPin, Briefcase, FileCheck, Upload, CheckCircle, Lock, Award, Globe, Sun, Moon, Shield, Eye, UserCheck, RefreshCw } from 'lucide-react'
import { toast } from '@/lib/toast'
import DashboardLayout from '@/components/templates/DashboardLayout'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { LANGS } from '@/lib/i18n'
import { getMyProfile, updateMyProfile, submitKyc, fetchKycFile } from '@/api/clients'
import { mfaSetupApi, mfaVerifyApi, mfaDisableApi, changePasswordApi } from '@/api/auth'
import { KYC_TYPE_MAP } from '@/constants/roles'

const KYC_TYPES = Object.keys(KYC_TYPE_MAP)

const PWD_RULES = [
  { key: 'length',  label: '8 car.',    test: p => p.length >= 8 },
  { key: 'upper',   label: 'Maj.',      test: p => /[A-Z]/.test(p) },
  { key: 'number',  label: 'Chiffre',   test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'Spécial',   test: p => /[^A-Za-z0-9]/.test(p) },
]
const S_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E']
const S_LABELS = ['Faible', 'Passable', 'Bon', 'Fort']

function PasswordStrength({ password }) {
  if (!password) return null
  const results = PWD_RULES.map(r => ({ ...r, ok: r.test(password) }))
  const score = results.filter(r => r.ok).length
  const color = S_COLORS[score - 1] || S_COLORS[0]
  return (
    <div className="flex flex-col gap-1.5 -mt-1">
      <div className="flex gap-1.5">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? color : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: score > 0 ? color : 'transparent' }}>
          {score > 0 ? S_LABELS[score - 1] : '—'}
        </span>
        <div className="flex gap-3">
          {results.map(r => (
            <span key={r.key} className="text-xs transition-colors"
              style={{ color: r.ok ? '#22C55E' : 'var(--color-muted)' }}>
              {r.ok ? '✓' : '·'} {r.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, loading }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className="relative inline-flex w-11 h-6 rounded-full transition-colors duration-250 focus:outline-none flex-shrink-0"
      style={{ background: checked ? '#D4AF37' : 'rgba(156,163,175,0.3)', opacity: loading ? 0.6 : 1 }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-250"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

const KYC_STAGES = [
  'Début du téléversement…',
  'Envoi des données…',
  'Traitement en cours…',
  'C\'est bientôt fini…',
]

export default function Profile() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useLang()

  // Profil
  const [profile, setProfile] = useState({ profession: '', adresse: '', date_naissance: '' })
  const [niveauCompte, setNiveauCompte] = useState('standard')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // KYC
  const [kyc, setKyc] = useState({ type_piece: '', numero_piece: '', date_expiration: '' })
  const [kycFile, setKycFile] = useState(null)
  const [kycStatus, setKycStatus] = useState('en_attente')
  const [kycProgress, setKycProgress] = useState('')
  const [kycSubmitting, setKycSubmitting] = useState(false)
  const [existingIdentite, setExistingIdentite] = useState(null)
  const [agentAssigne, setAgentAssigne] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(false)
  const [showReplaceForm, setShowReplaceForm] = useState(false)
  const kycTimerRef = useRef(null)

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaExpanded, setMfaExpanded] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaSentTo, setMfaSentTo] = useState('')
  const [mfaDisablePwd, setMfaDisablePwd] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  // Mot de passe
  const [pwdStep, setPwdStep] = useState(1)
  const [pwd, setPwd] = useState({ old_password: '', new_password: '', new_password_confirm: '' })
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    getMyProfile()
      .then(p => {
        setProfile({ profession: p.profession || '', adresse: p.adresse || '', date_naissance: p.date_naissance || '' })
        if (p.niveau_compte) setNiveauCompte(p.niveau_compte)
        if (p.identites?.length) {
          const last = p.identites[p.identites.length - 1]
          setExistingIdentite(last)
          setKycStatus(last.statut_verification)
        } else {
          setKycStatus(p.kyc_valid ? 'valide' : 'en_attente')
        }
        if (p.agent_assigne) setAgentAssigne(p.agent_assigne)
        setMfaEnabled(!!user?.mfa_enabled)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [user?.mfa_enabled])

  // ── KYC ──────────────────────────────────────────────────────────────
  const handleViewDoc = async () => {
    if (!existingIdentite?.document_scan) return
    setViewingDoc(true)
    try {
      const blobUrl = await fetchKycFile(existingIdentite.document_scan)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error('Impossible d\'afficher le document : ' + err.message)
    } finally {
      setViewingDoc(false)
    }
  }

  const handleSubmitKyc = async (e) => {
    e.preventDefault()
    setKycSubmitting(true)
    setKycProgress(KYC_STAGES[0])
    let idx = 0
    kycTimerRef.current = setInterval(() => {
      idx++
      if (idx < KYC_STAGES.length) setKycProgress(KYC_STAGES[idx])
    }, 900)

    const fd = new FormData()
    fd.append('type_piece', KYC_TYPE_MAP[kyc.type_piece] || kyc.type_piece)
    fd.append('numero_piece', kyc.numero_piece)
    fd.append('date_expiration', kyc.date_expiration)
    if (kycFile) fd.append('document_scan', kycFile)

    try {
      const res = await submitKyc(fd)
      clearInterval(kycTimerRef.current)
      setKycProgress('C\'est prêt !')
      setKycStatus('en_attente')
      if (res?.data) setExistingIdentite(res.data)
      setShowReplaceForm(false)
      setKycFile(null)
      setTimeout(() => setKycProgress(''), 2000)
      toast.success('Document KYC soumis — vérification par un agent sous 48h.')
    } catch (err) {
      clearInterval(kycTimerRef.current)
      setKycProgress('')
      toast.error(err.message)
    } finally {
      setKycSubmitting(false)
    }
  }

  // ── MFA ──────────────────────────────────────────────────────────────
  const handleMfaToggle = async () => {
    if (mfaExpanded) {
      // Fermer / annuler
      setMfaExpanded(false)
      setMfaCode('')
      setMfaSentTo('')
      setMfaDisablePwd('')
      return
    }
    if (!mfaEnabled) {
      // Activer : envoyer OTP immédiatement, puis ouvrir le champ
      setMfaLoading(true)
      try {
        const res = await mfaSetupApi()
        setMfaSentTo(res.data?.otp_sent_to || 'votre e-mail')
        setMfaExpanded(true)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setMfaLoading(false)
      }
    } else {
      // Désactiver : ouvrir le champ mot de passe
      setMfaExpanded(true)
    }
  }

  const handleMfaConfirmActivation = async (e) => {
    e.preventDefault()
    if (mfaCode.length !== 6) { toast.error('Code à 6 chiffres requis.'); return }
    setMfaLoading(true)
    try {
      await mfaVerifyApi(mfaCode)
      toast.success('MFA activé.')
      setMfaEnabled(true)
      setMfaExpanded(false)
      setMfaCode('')
      setMfaSentTo('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaConfirmDisable = async (e) => {
    e.preventDefault()
    if (!mfaDisablePwd) { toast.error('Mot de passe requis.'); return }
    setMfaLoading(true)
    try {
      await mfaDisableApi(mfaDisablePwd)
      toast.success('MFA désactivé.')
      setMfaEnabled(false)
      setMfaExpanded(false)
      setMfaDisablePwd('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  // ── Profil ────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      await updateMyProfile(profile)
      setSaved(true)
      toast.success('Profil enregistré.')
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ── Mot de passe ──────────────────────────────────────────────────────
  const handlePwdNext = (e) => {
    e.preventDefault()
    if (!pwd.old_password) { toast.error('Mot de passe actuel requis.'); return }
    setPwdStep(2)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwd.new_password !== pwd.new_password_confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    setPwdLoading(true)
    try {
      const res = await changePasswordApi(pwd)
      toast.success(res.message || 'Mot de passe mis à jour.')
      setPwd({ old_password: '', new_password: '', new_password_confirm: '' })
      setPwdStep(1)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <DashboardLayout title="Mon profil & KYC">
      {loading && <p className="text-sm text-muted mb-4">Chargement…</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Informations personnelles ── */}
        <form onSubmit={handleSaveProfile} className="neu-flat p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <User size={20} style={{ color: '#D4AF37' }} />
            <h2 className="font-display font-bold text-blanc">Informations personnelles</h2>
          </div>
          <div className="neu-inset p-4 rounded-xl flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blanc">{user?.name}</p>
              <p className="text-xs text-muted">{user?.telephone}</p>
              {user?.email && <p className="text-xs text-muted">{user.email}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{ background: '#D4AF3720', color: '#D4AF37', border: '1px solid #D4AF3740' }}>
                <Award size={12} />
                {niveauCompte === 'pro_plus' ? 'Pro+' : niveauCompte.charAt(0).toUpperCase() + niveauCompte.slice(1)}
              </div>
              <p className="text-xs text-muted">Niveau compte</p>
            </div>
          </div>
          <FormField label="Profession" icon={Briefcase} value={profile.profession}
            onChange={e => setProfile(p => ({ ...p, profession: e.target.value }))} />
          <FormField label="Adresse" icon={MapPin} value={profile.adresse}
            onChange={e => setProfile(p => ({ ...p, adresse: e.target.value }))} />
          <FormField label="Date de naissance" type="date" value={profile.date_naissance}
            onChange={e => setProfile(p => ({ ...p, date_naissance: e.target.value }))} />
          <Button type="submit">{saved ? 'Enregistré ✓' : 'Enregistrer le profil'}</Button>
        </form>

        {/* ── Vérification KYC ── */}
        <div className="neu-flat p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck size={20} style={{ color: '#D4AF37' }} />
              <h2 className="font-display font-bold text-blanc">Vérification KYC</h2>
            </div>
            <Badge label={kycStatus === 'valide' ? 'valide' : kycStatus === 'rejete' ? 'rejete' : 'en_attente'} />
          </div>

          {kycStatus === 'valide' && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle size={16} />
              <span>Identité validée — éligible aux crédits Simbisa</span>
            </div>
          )}

          {/* Agent assigné */}
          {agentAssigne && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl neu-inset">
              <UserCheck size={16} style={{ color: '#D4AF37' }} className="flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted">Agent de crédit assigné</p>
                <p className="text-sm font-semibold text-blanc truncate">{agentAssigne.full_name}</p>
                <p className="text-xs text-muted">{agentAssigne.telephone}</p>
              </div>
            </div>
          )}

          {/* Pièce actuellement soumise */}
          {existingIdentite?.document_scan && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl neu-inset gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted">Pièce soumise</p>
                <p className="text-sm font-medium text-blanc truncate">
                  {existingIdentite.type_piece?.replace('_', ' ')} — {existingIdentite.numero_piece}
                </p>
                {existingIdentite.rejection_reason && (
                  <p className="text-xs text-danger mt-0.5">{existingIdentite.rejection_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="ghost" icon={Eye} loading={viewingDoc} onClick={handleViewDoc}>
                  Voir
                </Button>
                <Button size="sm" variant="secondary" icon={RefreshCw}
                  onClick={() => setShowReplaceForm(v => !v)}>
                  {showReplaceForm ? 'Annuler' : 'Remplacer'}
                </Button>
              </div>
            </div>
          )}

          {/* Formulaire soumission / remplacement */}
          {(!existingIdentite?.document_scan || showReplaceForm) && (
            <form onSubmit={handleSubmitKyc} className="flex flex-col gap-4">
              {showReplaceForm && (
                <p className="text-xs text-warning">Une nouvelle soumission remplacera la pièce actuelle pour revalidation.</p>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-widest">Type de pièce</label>
                <select value={kyc.type_piece} onChange={e => setKyc(p => ({ ...p, type_piece: e.target.value }))}
                  className="w-full bg-surface text-blanc text-sm rounded-xl px-4 py-3.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none" required>
                  <option value="">Sélectionner…</option>
                  {KYC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <FormField label="Numéro de pièce" value={kyc.numero_piece}
                onChange={e => setKyc(p => ({ ...p, numero_piece: e.target.value }))} required />
              <FormField label="Date d'expiration" type="date" value={kyc.date_expiration}
                onChange={e => setKyc(p => ({ ...p, date_expiration: e.target.value }))} required />
              <div className="neu-inset p-4 rounded-xl border border-dashed border-or/20 text-center">
                <Upload size={24} className="mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">
                  {kycFile ? kycFile.name : 'Scanner la pièce d\'identité (PDF/JPG/PNG)'}
                </p>
                <input type="file" accept="image/*,.pdf" className="mt-2 text-xs text-muted w-full"
                  onChange={e => setKycFile(e.target.files?.[0] || null)} />
              </div>

              {kycProgress && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--color-surface)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  {kycProgress === 'C\'est prêt !' ? (
                    <CheckCircle size={16} className="text-success flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-or border-t-transparent animate-spin flex-shrink-0" />
                  )}
                  <span className="text-sm" style={{ color: kycProgress === 'C\'est prêt !' ? 'var(--color-success)' : '#D4AF37' }}>
                    {kycProgress}
                  </span>
                </div>
              )}

              <Button type="submit" icon={FileCheck} loading={kycSubmitting}>
                {kycSubmitting ? 'En cours…' : showReplaceForm ? 'Remplacer la pièce' : 'Soumettre le KYC'}
              </Button>
            </form>
          )}
        </div>

        {/* ── Sécurité MFA ── */}
        <div className="neu-flat p-6 flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} style={{ color: '#D4AF37' }} />
              <div>
                <h2 className="font-display font-bold text-blanc">Authentification à deux facteurs</h2>
                <p className="text-xs text-muted mt-0.5">
                  {mfaEnabled ? 'OTP requis à chaque connexion.' : `E-mail : ${user?.email || 'ajoutez un e-mail au profil'}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: mfaEnabled ? '#22C55E' : 'var(--color-muted)' }}>
                {mfaEnabled ? 'Activé' : 'Inactif'}
              </span>
              <Toggle checked={mfaEnabled} onChange={handleMfaToggle} loading={mfaLoading} />
            </div>
          </div>

          {/* Panneau dépliable MFA */}
          {mfaExpanded && (
            <div className="flex flex-col gap-3 p-4 rounded-xl"
              style={{ background: 'var(--color-surface)', border: '1px solid rgba(212,175,55,0.15)' }}>
              {!mfaEnabled ? (
                /* Activation */
                <form onSubmit={handleMfaConfirmActivation} className="flex flex-col gap-3">
                  {mfaSentTo && (
                    <p className="text-xs text-muted">Code envoyé à <span className="text-or">{mfaSentTo}</span>.</p>
                  )}
                  <FormField
                    label="Code OTP reçu par e-mail"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                  />
                  <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={handleMfaToggle}>Annuler</Button>
                    <Button type="submit" loading={mfaLoading}>Confirmer l&apos;activation</Button>
                  </div>
                </form>
              ) : (
                /* Désactivation */
                <form onSubmit={handleMfaConfirmDisable} className="flex flex-col gap-3">
                  <p className="text-xs text-muted">Confirmez votre mot de passe pour désactiver le MFA.</p>
                  <FormField label="Mot de passe" type="password" value={mfaDisablePwd}
                    onChange={e => setMfaDisablePwd(e.target.value)} placeholder="••••••••" />
                  <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={handleMfaToggle}>Annuler</Button>
                    <Button type="submit" variant="danger" loading={mfaLoading}>Confirmer la désactivation</Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── Apparence & Langue ── */}
        <div className="neu-flat p-6 flex flex-col gap-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Globe size={20} style={{ color: '#D4AF37' }} />
            <h2 className="font-display font-bold text-blanc">{t('profile.appearance')}</h2>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl neu-inset">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={16} className="text-muted" /> : <Sun size={16} className="text-muted" />}
              <span className="text-sm text-blanc">{theme === 'dark' ? t('ui.theme.dark') : t('ui.theme.light')}</span>
            </div>
            <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-3">{t('lang.label')}</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(LANGS).map(([code, info]) => (
                <button key={code} type="button" onClick={() => setLang(code)}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-3 rounded-xl border text-sm font-medium transition-all overflow-hidden"
                  style={lang === code
                    ? { background: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.5)', color: '#D4AF37' }
                    : { background: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.06)', color: 'var(--color-muted)' }
                  }>
                  <span className="text-base flex-shrink-0">{info.flag}</span>
                  <span className="truncate">{info.label}</span>
                  {lang === code && <span className="ml-auto flex-shrink-0 text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Changer le mot de passe ── */}
        <div className="neu-flat p-6 flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock size={20} style={{ color: '#D4AF37' }} />
              <h2 className="font-display font-bold text-blanc">Changer le mot de passe</h2>
            </div>
            {pwdStep === 2 && (
              <button type="button" onClick={() => { setPwdStep(1); setPwd(p => ({ ...p, new_password: '', new_password_confirm: '' })) }}
                className="text-xs text-muted hover:text-blanc transition-colors underline underline-offset-2">
                Retour
              </button>
            )}
          </div>

          {pwdStep === 1 ? (
            <form onSubmit={handlePwdNext} className="flex flex-col gap-4">
              <FormField label="Mot de passe actuel" type="password" icon={Lock}
                value={pwd.old_password} onChange={e => setPwd(p => ({ ...p, old_password: e.target.value }))} required />
              <Button type="submit" className="self-start">Continuer</Button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <FormField label="Nouveau mot de passe" type="password" icon={Lock}
                  value={pwd.new_password} onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} required />
                <PasswordStrength password={pwd.new_password} />
              </div>
              <FormField label="Confirmer le nouveau" type="password" icon={Lock}
                value={pwd.new_password_confirm} onChange={e => setPwd(p => ({ ...p, new_password_confirm: e.target.value }))} required />
              <Button type="submit" loading={pwdLoading} icon={Lock} className="self-start">
                Mettre à jour le mot de passe
              </Button>
            </form>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
