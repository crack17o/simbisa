import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Users, FileCheck, Pencil, Eye, Search } from 'lucide-react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import FormField from '@/components/molecules/FormField'
import PhoneInput from '@/components/molecules/PhoneInput'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/constants/roles'
import { listClients, createClientByAgent, updateClientByAgent, verifyKyc, fetchKycFile } from '@/api/clients'

const KYC_BADGE = {
  valide: 'success',
  en_attente: 'warning',
  rejete: 'danger',
}

const emptyEdit = {
  profession: '', adresse: '', prenom: '', nom: '', postnom: '', email: '',
}

export default function AgentClients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAgent = user?.role === ROLES.AGENT
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kycFilter, setKycFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(emptyEdit)
  const [form, setForm] = useState({
    telephone: '', prenom: '', nom: '', postnom: '', email: '', password: '', profession: '', adresse: '',
  })

  const loadClients = () => {
    setLoading(true)
    listClients()
      .then(res => setClients(Array.isArray(res.data) ? res.data : res.results || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadClients() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createClientByAgent(form)
      toast.success('Client enregistré dans votre portefeuille.')
      setForm({ telephone: '', prenom: '', nom: '', postnom: '', email: '', password: '', profession: '', adresse: '' })
      setShowForm(false)
      loadClients()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (c) => {
    setEditId(c.id)
    setEditForm({
      profession: c.profession || '',
      adresse: c.adresse || '',
      prenom: c.utilisateur?.prenom || '',
      nom: c.utilisateur?.nom || '',
      postnom: c.utilisateur?.postnom || '',
      email: c.utilisateur?.email || '',
    })
    setShowForm(false)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateClientByAgent(editId, editForm)
      toast.success('Client mis à jour.')
      setEditId(null)
      loadClients()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyKyc = async (client, identiteId, statut) => {
    const rejection_reason = statut === 'rejete'
      ? window.prompt('Motif du rejet :') || 'Document non conforme'
      : ''
    try {
      await verifyKyc(identiteId, { statut, rejection_reason })
      toast.success(`KYC ${statut} pour ${client.utilisateur?.full_name || 'client'}.`)
      loadClients()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const openKycDoc = async (url) => {
    try {
      const blobUrl = await fetchKycFile(url)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error('Impossible d\'afficher le document : ' + err.message)
    }
  }

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter(c => {
      const name = (c.utilisateur?.full_name || '').toLowerCase()
      const phone = (c.utilisateur?.telephone || '').toLowerCase()
      const matchesSearch = !q || name.includes(q) || phone.includes(q)
      if (!matchesSearch) return false
      if (kycFilter === 'all') return true
      const lastId = c.identites?.[c.identites.length - 1]
      const kyc = lastId?.statut_verification || (c.kyc_valid ? 'valide' : 'en_attente')
      return kyc === kycFilter
    })
  }, [clients, search, kycFilter])

  const pendingKyc = clients.flatMap(c =>
    (c.identites || [])
      .filter(i => i.statut_verification === 'en_attente')
      .map(i => ({ client: c, identite: i }))
  )

  return (
    <DashboardLayout title={isAgent ? 'Mes clients' : 'Tous les clients'}>
      <div className="flex flex-col gap-6">
        {isAgent && (
          <div className="flex justify-end">
            <Button icon={UserPlus} onClick={() => { setShowForm(v => !v); setEditId(null) }}>
              {showForm ? 'Annuler' : 'Ajouter un client'}
            </Button>
          </div>
        )}

        {showForm && isAgent && (
          <form onSubmit={handleCreate} className="neu-flat p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhoneInput name="telephone" value={form.telephone} required
              onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} />
            <FormField label="Prénom" value={form.prenom} required
              onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} />
            <FormField label="Nom" value={form.nom} required
              onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} />
            <FormField label="Post-nom" value={form.postnom}
              onChange={e => setForm(p => ({ ...p, postnom: e.target.value }))} />
            <FormField label="Email" type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <FormField label="Mot de passe temporaire" type="password" value={form.password} required
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            <FormField label="Profession" value={form.profession}
              onChange={e => setForm(p => ({ ...p, profession: e.target.value }))} />
            <FormField label="Adresse (quartier, rue)" value={form.adresse}
              onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))} />
            <div className="md:col-span-2">
              <Button type="submit" loading={creating}>Enregistrer le client</Button>
            </div>
          </form>
        )}

        {editId && isAgent && (
          <form onSubmit={handleUpdate} className="neu-flat p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border border-or/30">
            <p className="md:col-span-2 text-sm text-or font-medium">Modifier le client</p>
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
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" loading={saving}>Enregistrer</Button>
              <Button type="button" variant="ghost" onClick={() => setEditId(null)}>Annuler</Button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou téléphone…"
              className="w-full neu-inset rounded-xl pl-9 pr-4 py-2.5 text-sm text-blanc placeholder-muted/50 outline-none bg-transparent"
            />
          </div>
          <select
            value={kycFilter}
            onChange={e => setKycFilter(e.target.value)}
            className="neu-inset rounded-xl px-4 py-2.5 text-sm text-blanc outline-none bg-surface"
          >
            <option value="all">Tous (KYC)</option>
            <option value="valide">KYC validé</option>
            <option value="en_attente">En attente</option>
            <option value="rejete">Rejeté</option>
          </select>
        </div>

        {pendingKyc.length > 0 && (
          <section>
            <h2 className="font-semibold text-blanc mb-3 flex items-center gap-2">
              <FileCheck size={18} className="text-or" /> KYC en attente ({pendingKyc.length})
            </h2>
            <div className="flex flex-col gap-3">
              {pendingKyc.map(({ client, identite }) => (
                <div key={identite.id} className="neu-flat p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-blanc">{client.utilisateur?.full_name}</p>
                    <p className="text-xs text-muted">
                      {client.commune_label} · {identite.type_piece?.replace('_', ' ')} {identite.numero_piece}
                    </p>
                    {identite.date_expiration && (
                      <p className="text-xs text-muted">Expire : {identite.date_expiration}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {identite.document_scan && (
                      <Button size="sm" variant="secondary" icon={Eye}
                        onClick={() => openKycDoc(identite.document_scan)}>
                        Voir la pièce
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleVerifyKyc(client, identite.id, 'valide')}>Valider</Button>
                    <Button size="sm" variant="danger" onClick={() => handleVerifyKyc(client, identite.id, 'rejete')}>Rejeter</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-semibold text-blanc mb-3 flex items-center gap-2">
            <Users size={18} className="text-or" /> Clients ({filteredClients.length}{filteredClients.length !== clients.length ? ` / ${clients.length}` : ''})
          </h2>
          {loading && <p className="text-sm text-muted">Chargement…</p>}
          {!loading && clients.length === 0 && (
            <p className="text-sm text-muted">Aucun client dans votre portefeuille.</p>
          )}
          {!loading && clients.length > 0 && filteredClients.length === 0 && (
            <p className="text-sm text-muted">Aucun client ne correspond aux filtres.</p>
          )}
          <div className="flex flex-col gap-3">
            {filteredClients.map(c => {
              const lastId = c.identites?.[c.identites.length - 1]
              const kyc = lastId?.statut_verification || (c.kyc_valid ? 'valide' : 'en_attente')
              return (
                <div key={c.id}
                  className="neu-flat p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-panel/60 transition-colors"
                  onClick={() => navigate(`/agent/clients/${c.id}`)}
                >
                  <div>
                    <p className="font-medium text-blanc">{c.utilisateur?.full_name}</p>
                    <p className="text-xs text-muted">
                      {c.utilisateur?.telephone} · {c.commune_label || c.commune_kinshasa}
                    </p>
                    {lastId && (
                      <p className="text-xs text-muted mt-0.5">
                        {lastId.type_piece?.replace('_', ' ')} — {lastId.numero_piece}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={kyc} variant={KYC_BADGE[kyc] || 'default'} />
                    {lastId?.document_scan && (
                      <Button size="sm" variant="ghost" icon={Eye}
                        onClick={() => openKycDoc(lastId.document_scan)}>
                        Pièce
                      </Button>
                    )}
                    {isAgent && (
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => startEdit(c)}>Modifier</Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
