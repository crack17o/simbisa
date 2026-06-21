import React, { useEffect, useState } from 'react'
import { User, MapPin, Briefcase, FileCheck, Upload, CheckCircle } from 'lucide-react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { useAuth } from '@/context/AuthContext'
import { getMyProfile, updateMyProfile, submitKyc } from '@/api/clients'
import { mfaSetupApi, mfaVerifyApi } from '@/api/auth'
import { KYC_TYPE_MAP } from '@/constants/roles'

const KYC_TYPES = Object.keys(KYC_TYPE_MAP)

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({
    profession: '',
    adresse: '',
    date_naissance: '',
  })
  const [kyc, setKyc] = useState({ type_piece: '', numero_piece: '', date_expiration: '' })
  const [kycFile, setKycFile] = useState(null)
  const [kycStatus, setKycStatus] = useState('en_attente')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kycMsg, setKycMsg] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaMsg, setMfaMsg] = useState('')
  const [mfaSentTo, setMfaSentTo] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)

  useEffect(() => {
    getMyProfile()
      .then(p => {
        setProfile({
          profession: p.profession || '',
          adresse: p.adresse || '',
          date_naissance: p.date_naissance || '',
        })
        if (p.identites?.length) {
          const last = p.identites[p.identites.length - 1]
          setKycStatus(last.statut_verification)
        } else {
          setKycStatus(p.kyc_valid ? 'valide' : 'en_attente')
        }
        setMfaEnabled(!!user?.mfa_enabled)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.mfa_enabled])

  const handleMfaSetup = async () => {
    setMfaLoading(true)
    setMfaMsg('')
    setError('')
    try {
      const res = await mfaSetupApi()
      setMfaSentTo(res.data?.otp_sent_to || 'votre e-mail')
      setMfaMsg(res.message || 'Code envoyé par e-mail.')
    } catch (err) {
      setError(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleMfaVerify = async (e) => {
    e.preventDefault()
    if (mfaCode.length !== 6) {
      setError('Code à 6 chiffres requis.')
      return
    }
    setMfaLoading(true)
    setError('')
    try {
      const res = await mfaVerifyApi(mfaCode)
      setMfaMsg(res.message)
      setMfaEnabled(true)
      setMfaCode('')
    } catch (err) {
      setError(err.message)
    } finally {
      setMfaLoading(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await updateMyProfile(profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmitKyc = async (e) => {
    e.preventDefault()
    setKycMsg('')
    setError('')
    const fd = new FormData()
    fd.append('type_piece', KYC_TYPE_MAP[kyc.type_piece] || kyc.type_piece)
    fd.append('numero_piece', kyc.numero_piece)
    fd.append('date_expiration', kyc.date_expiration)
    if (kycFile) fd.append('document_scan', kycFile)
    try {
      await submitKyc(fd)
      setKycStatus('en_attente')
      setKycMsg('Document KYC soumis — vérification par un agent sous 48h.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <DashboardLayout title="Mon profil & KYC">
      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {loading && <p className="text-sm text-muted mb-4">Chargement…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSaveProfile} className="neu-flat p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <User size={20} style={{ color: '#D4AF37' }} />
            <h2 className="font-display font-bold text-blanc">Informations personnelles</h2>
          </div>

          <div className="neu-inset p-4 rounded-xl">
            <p className="text-sm font-semibold text-blanc">{user?.name}</p>
            <p className="text-xs text-muted">{user?.telephone}</p>
            {user?.email && <p className="text-xs text-muted">{user.email}</p>}
          </div>

          <FormField label="Profession" icon={Briefcase} value={profile.profession}
            onChange={e => setProfile(p => ({ ...p, profession: e.target.value }))} />

          <FormField label="Adresse" icon={MapPin} value={profile.adresse}
            onChange={e => setProfile(p => ({ ...p, adresse: e.target.value }))} />

          <FormField label="Date de naissance" type="date" value={profile.date_naissance}
            onChange={e => setProfile(p => ({ ...p, date_naissance: e.target.value }))} />

          <Button type="submit">{saved ? 'Enregistré' : 'Enregistrer le profil'}</Button>
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

          {kycMsg && <p className="text-sm text-success">{kycMsg}</p>}

          <form onSubmit={handleSubmitKyc} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-widest">Type de pièce</label>
              <select
                value={kyc.type_piece}
                onChange={e => setKyc(p => ({ ...p, type_piece: e.target.value }))}
                className="w-full bg-surface text-blanc text-sm rounded-xl px-4 py-3.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none"
                required
              >
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
              <input
                type="file"
                accept="image/*,.pdf"
                className="mt-2 text-xs text-muted w-full"
                onChange={e => setKycFile(e.target.files?.[0] || null)}
              />
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
          {mfaMsg && <p className="text-sm text-success">{mfaMsg}</p>}
          {mfaSentTo && !mfaEnabled && (
            <p className="text-xs text-muted">Code envoyé à {mfaSentTo} — vérifiez la console backend en dev.</p>
          )}
          {!mfaEnabled ? (
            <form onSubmit={handleMfaVerify} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <FormField
                  label="Code reçu par e-mail"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />
              </div>
              <Button type="button" variant="secondary" loading={mfaLoading} onClick={handleMfaSetup}>
                Envoyer le code
              </Button>
              <Button type="submit" loading={mfaLoading}>Activer MFA</Button>
            </form>
          ) : (
            <p className="text-sm text-success">MFA activé — OTP requis à chaque connexion.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
