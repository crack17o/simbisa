import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronRight, Pencil, CheckCircle, XCircle, Eye, ArrowLeft, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import FormField from '@/components/molecules/FormField'
import { getClientById, updateClientByAgent, verifyKyc, fetchKycFile } from '@/api/clients'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/constants/roles'

const KYC_BADGE = {
  valide: 'success',
  en_attente: 'warning',
  rejete: 'danger',
}

const NIVEAU_LABELS = {
  standard: 'Standard',
  pro: 'Pro',
  pro_plus: 'Pro+',
  premium: 'Premium',
}

const NIVEAUX = Object.entries(NIVEAU_LABELS)

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAgent = user?.role === ROLES.AGENT || user?.role === ROLES.MANAGER

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [verifyingKyc, setVerifyingKyc] = useState(false)
  const [openingDoc, setOpeningDoc] = useState(false)
  const [editForm, setEditForm] = useState({})

  const loadClient = async () => {
    setLoading(true)
    try {
      const res = await getClientById(id)
      const c = res.data || res
      setClient(c)
      setEditForm({
        prenom:      c.utilisateur?.prenom  || '',
        nom:         c.utilisateur?.nom     || '',
        postnom:     c.utilisateur?.postnom || '',
        email:       c.utilisateur?.email   || '',
        profession:  c.profession           || '',
        adresse:     c.adresse              || '',
        niveau_compte: c.niveau_compte      || 'standard',
      })
    } catch (err) {
      toast.error(err.message)
      navigate('/agent/clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadClient() }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateClientByAgent(id, editForm)
      toast.success('Client mis à jour.')
      setEditing(false)
      loadClient()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyKyc = async (identiteId, statut) => {
    const rejection_reason = statut === 'rejete'
      ? window.prompt('Motif du rejet :') || 'Document non conforme'
      : ''
    setVerifyingKyc(true)
    try {
      await verifyKyc(identiteId, { statut, rejection_reason })
      toast.success(`KYC ${statut}.`)
      loadClient()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setVerifyingKyc(false)
    }
  }

  const openDoc = async (url) => {
    setOpeningDoc(true)
    try {
      const blobUrl = await fetchKycFile(url)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error('Impossible d\'ouvrir le document : ' + err.message)
    } finally {
      setOpeningDoc(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Détail client">
        <p className="text-sm text-muted">Chargement…</p>
      </DashboardLayout>
    )
  }

  if (!client) return null

  const lastId = client.identites?.[client.identites.length - 1]
  const kyc = lastId?.statut_verification || (client.kyc_valid ? 'valide' : 'en_attente')
  const fullName = client.utilisateur?.full_name || `${client.utilisateur?.prenom} ${client.utilisateur?.nom}`

  return (
    <DashboardLayout title="Détail client">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-xs text-muted mb-6">
        <Link to="/agent/clients" className="hover:text-or transition-colors">
          Clients de ma zone
        </Link>
        <ChevronRight size={12} />
        <span className="text-blanc font-medium truncate max-w-[200px]">{fullName}</span>
      </nav>

      <div className="flex flex-col gap-6 max-w-3xl">

        {/* ── Identité ── */}
        <div className="neu-flat p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display font-bold text-xl text-blanc">{fullName}</h2>
              <p className="text-sm text-muted mt-0.5">{client.utilisateur?.telephone}</p>
              <p className="text-xs text-muted mt-0.5">{client.commune_label || client.commune_kinshasa}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge label={NIVEAU_LABELS[client.niveau_compte] || client.niveau_compte} variant="default" />
              <Badge label={kyc} variant={KYC_BADGE[kyc] || 'default'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <InfoRow label="Profession" value={client.profession || '—'} />
            <InfoRow label="Adresse" value={client.adresse || '—'} />
            <InfoRow label="Date inscription" value={client.date_inscription ? new Date(client.date_inscription).toLocaleDateString('fr-FR') : '—'} />
            <InfoRow label="Plafond crédit" value={`${client.plafond_credit_usd ?? '—'} USD`} />
            <InfoRow label="Durée max" value={`${client.plafond_duree_mois ?? '—'} mois`} />
            <InfoRow label="Niveau risque" value={client.niveau_risque || '—'} />
          </div>

          {isAgent && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <Button size="sm" icon={Pencil} onClick={() => setEditing(v => !v)} variant={editing ? 'ghost' : 'secondary'}>
                {editing ? 'Annuler' : 'Modifier les informations'}
              </Button>
            </div>
          )}
        </div>

        {/* ── Formulaire d'édition ── */}
        {editing && isAgent && (
          <form onSubmit={handleSave} className="neu-flat p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border border-or/20">
            <p className="md:col-span-2 text-sm text-or font-medium">Modifier le dossier client</p>
            <FormField label="Prénom" value={editForm.prenom} required
              onChange={e => setEditForm(p => ({ ...p, prenom: e.target.value }))} />
            <FormField label="Nom" value={editForm.nom} required
              onChange={e => setEditForm(p => ({ ...p, nom: e.target.value }))} />
            <FormField label="Post-nom" value={editForm.postnom}
              onChange={e => setEditForm(p => ({ ...p, postnom: e.target.value }))} />
            <FormField label="Email" type="email" value={editForm.email}
              onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
            <FormField label="Profession" value={editForm.profession}
              onChange={e => setEditForm(p => ({ ...p, profession: e.target.value }))} />
            <FormField label="Adresse" value={editForm.adresse}
              onChange={e => setEditForm(p => ({ ...p, adresse: e.target.value }))} />

            {/* Niveau de compte — agent peut le modifier */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-widest">
                Niveau de compte
              </label>
              <select
                value={editForm.niveau_compte}
                onChange={e => setEditForm(p => ({ ...p, niveau_compte: e.target.value }))}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-blanc text-sm focus:outline-none focus:border-or/50"
              >
                {NIVEAUX.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" icon={Save} loading={saving}>Enregistrer</Button>
              <Button type="button" variant="ghost" icon={X} onClick={() => setEditing(false)}>Annuler</Button>
            </div>
          </form>
        )}

        {/* ── Documents KYC ── */}
        <div className="neu-flat p-6">
          <h3 className="font-semibold text-blanc mb-4">Documents d'identité</h3>
          {(!client.identites || client.identites.length === 0) ? (
            <p className="text-sm text-muted">Aucun document soumis.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {client.identites.map((identite, idx) => (
                <div key={identite.id ?? idx} className="neu-inset p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge label={identite.statut_verification} variant={KYC_BADGE[identite.statut_verification] || 'default'} />
                      {idx === client.identites.length - 1 && (
                        <span className="text-[10px] text-or font-medium uppercase tracking-wide">Dernier</span>
                      )}
                    </div>
                    <p className="text-sm text-blanc">{identite.type_piece?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted">N° {identite.numero_piece}</p>
                    {identite.date_expiration && (
                      <p className="text-xs text-muted">Expire : {identite.date_expiration}</p>
                    )}
                    {identite.rejection_reason && (
                      <p className="text-xs text-danger mt-1">Motif rejet : {identite.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm" variant="secondary" icon={Eye}
                      loading={openingDoc}
                      disabled={!identite.document_scan}
                      onClick={() => identite.document_scan && openDoc(identite.document_scan)}
                    >
                      Voir la pièce
                    </Button>
                    {isAgent && identite.statut_verification === 'en_attente' && (
                      <>
                        <Button
                          size="sm" icon={CheckCircle}
                          loading={verifyingKyc}
                          onClick={() => handleVerifyKyc(identite.id, 'valide')}
                        >
                          Valider
                        </Button>
                        <Button
                          size="sm" variant="danger" icon={XCircle}
                          loading={verifyingKyc}
                          onClick={() => handleVerifyKyc(identite.id, 'rejete')}
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/agent/clients')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className="text-blanc">{value}</span>
    </div>
  )
}
