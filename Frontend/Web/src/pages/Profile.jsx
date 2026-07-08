import React, { useEffect, useState } from 'react'
import { User, MapPin, Briefcase, FileCheck, Upload, CheckCircle, Lock, Award, Globe, Sun, Moon } from 'lucide-react'
import { toast } from '@/lib/toast'
import DashboardLayout from '@/components/templates/DashboardLayout'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { LANGS } from '@/lib/i18n'
import { getMyProfile, updateMyProfile, submitKyc } from '@/api/clients'
import { mfaSetupApi, mfaVerifyApi, mfaDisableApi, changePasswordApi } from '@/api/auth'
import { KYC_TYPE_MAP } from '@/constants/roles'

const KYC_TYPES = Object.keys(KYC_TYPE_MAP)

export default function Profile() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useLang()
  const [profile, setProfile] = useState({ profession: '', adresse: '', date_naissance: '' })
  const [niveauCompte, setNiveauCompte] = useState('standard')
  const [kyc, setKyc] = useState({ type_piece: '', numero_piece: '', date_expiration: '' })
  const [kycFile, setKycFile] = useState(null)
  const [kycStatus, setKycStatus] = useState('en_attente')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaSentTo, setMfaSentTo] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaDisableOpen, setMfaDisableOpen] = useState(false)
  const [mfaDisablePwd, setMfaDisablePwd] = useState('')
  const [pwd, setPwd] = useState({ old_password: '', new_password: '', new_password_confirm: '' })
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    getMyProfile()
      .then(p => {
        setProfile({ profession: p.profession || '', adresse: p.adresse || '', date_naissance: p.date_naissance || '' })
        if (p.niveau_compte) setNiveauCompte(p.niveau_compte)
        if (p.identites?.length) {
          setKycStatus(p.identites[p.identites.length - 1].statut_verification)
        } else {
          setKycStatus(p.kyc_valid ? 'valide' : 'en_attente')
        }
        setMfaEnabled(!!user?.mfa_enabled)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [user?.mfa_enabled])

  const handleMfaSetup = async () => {
    setMfaLoading(true)
    try {
      const res = await mfaSetupApi()
      setMfaSentTo(res.data?.otp_sent_to || 'votre e-mail')
      toast.info(`Code envoyé à ${res.data?.otp_sent_to || 'votre e-mail'}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaVerify = async (e) => {
    e.preventDefault()
    if (mfaCode.length !== 6) { toast.error('Code à 6 chiffres requis.'); return }
    setMfaLoading(true)
    try {
      const res = await mfaVerifyApi(mfaCode)
      toast.success(res.message || 'MFA activé.')
      setMfaEnabled(true)
      setMfaCode('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaDisable = async (e) => {
    e.preventDefault()
    if (!mfaDisablePwd) { toast.error('Mot de passe requis.'); return }
    setMfaLoading(true)
    try {
      const res = await mfaDisableApi(mfaDisablePwd)
      toast.success(res.message || 'MFA désactivé.')
      setMfaEnabled(false)
      setMfaDisableOpen(false)
      setMfaDisablePwd('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

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
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPwdLoading(false)
    }
  }

  const handleSubmitKyc = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('type_piece', KYC_TYPE_MAP[kyc.type_piece] || kyc.type_piece)
    fd.append('numero_piece', kyc.numero_piece)
    fd.append('date_expiration', kyc.date_expiration)
    if (kycFile) fd.append('document_scan', kycFile)
    try {
      await submitKyc(fd)
      setKycStatus('en_attente')
      toast.success('Document KYC soumis — vérification par un agent sous 48h.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <DashboardLayout title="Mon profil & KYC">
      {loading && <p className="text-sm text-muted mb-4">Chargement…</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <form onSubmit={handleSubmitKyc} className="flex flex-col gap-4">
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
              <p className="text-sm text-muted">Scanner la pièce d'identité (PDF/JPG)</p>
              <input type="file" accept="image/*,.pdf" className="mt-2 text-xs text-muted w-full"
                onChange={e => setKycFile(e.target.files?.[0] || null)} />
            </div>
            <Button type="submit" icon={FileCheck}>Soumettre le KYC</Button>
          </form>
        </div>

        <div className="neu-flat p-6 flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-blanc">Sécurité — MFA par e-mail</h2>
            <Badge label={mfaEnabled ? 'activé' : 'inactif'} />
          </div>
          <p className="text-sm text-muted">
            Chaque connexion enverra un code OTP à votre e-mail ({user?.email || 'ajoutez un e-mail au profil'}).
          </p>
          {mfaSentTo && !mfaEnabled && (
            <p className="text-xs text-muted">Code envoyé à {mfaSentTo}.</p>
          )}
          {!mfaEnabled ? (
            <form onSubmit={handleMfaVerify} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <FormField label="Code reçu par e-mail" value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
              </div>
              <Button type="button" variant="secondary" loading={mfaLoading} onClick={handleMfaSetup}>Envoyer le code</Button>
              <Button type="submit" loading={mfaLoading}>Activer MFA</Button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-success">MFA activé — OTP requis à chaque connexion.</p>
              {!mfaDisableOpen ? (
                <button
                  type="button"
                  onClick={() => setMfaDisableOpen(true)}
                  className="self-start text-xs text-muted underline underline-offset-2 hover:text-blanc transition-colors"
                >
                  Désactiver le MFA
                </button>
              ) : (
                <form onSubmit={handleMfaDisable} className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <FormField
                      label="Confirmez votre mot de passe"
                      type="password"
                      value={mfaDisablePwd}
                      onChange={e => setMfaDisablePwd(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => { setMfaDisableOpen(false); setMfaDisablePwd('') }}>
                    Annuler
                  </Button>
                  <Button type="submit" loading={mfaLoading} variant="danger">
                    Confirmer
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Apparence & Langue */}
        <div className="neu-flat p-6 flex flex-col gap-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Globe size={20} style={{ color: '#D4AF37' }} />
            <h2 className="font-display font-bold text-blanc">{t('profile.appearance')}</h2>
          </div>

          {/* Thème */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl neu-inset">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={16} className="text-muted" /> : <Sun size={16} className="text-muted" />}
              <span className="text-sm text-blanc">{theme === 'dark' ? t('ui.theme.dark') : t('ui.theme.light')}</span>
            </div>
            <button
              onClick={toggleTheme}
              className="relative inline-flex w-11 h-6 rounded-full transition-colors duration-250 focus:outline-none"
              style={{ background: theme === 'dark' ? '#D4AF37' : 'rgba(156,163,175,0.3)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-250"
                style={{ transform: theme === 'dark' ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          {/* Langue */}
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-3">{t('lang.label')}</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(LANGS).map(([code, info]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all"
                  style={lang === code
                    ? { background: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.5)', color: '#D4AF37' }
                    : { background: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.06)', color: 'var(--color-muted)' }
                  }
                >
                  <span className="text-base">{info.flag}</span>
                  <span>{info.label}</span>
                  {lang === code && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="neu-flat p-6 flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Lock size={20} style={{ color: '#D4AF37' }} />
            <h2 className="font-display font-bold text-blanc">Changer le mot de passe</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Mot de passe actuel" type="password" icon={Lock} value={pwd.old_password}
              onChange={e => setPwd(p => ({ ...p, old_password: e.target.value }))} required />
            <FormField label="Nouveau mot de passe" type="password" icon={Lock} value={pwd.new_password}
              onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} required />
            <FormField label="Confirmer le nouveau" type="password" icon={Lock} value={pwd.new_password_confirm}
              onChange={e => setPwd(p => ({ ...p, new_password_confirm: e.target.value }))} required />
          </div>
          <Button type="submit" loading={pwdLoading} icon={Lock} className="self-start">Mettre à jour le mot de passe</Button>
        </form>
      </div>
    </DashboardLayout>
  )
}
