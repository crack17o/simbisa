import React, { useEffect, useState } from 'react'
import { UserPlus, Users, FileCheck, Pencil } from 'lucide-react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import FormField from '@/components/molecules/FormField'
import Button from '@/components/atoms/Button'
import Badge from '@/components/atoms/Badge'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/constants/roles'
import { listClients, createClientByAgent, updateClientByAgent, verifyKyc } from '@/api/clients'

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
  const isAgent = user?.role === ROLES.AGENT
  const [clients, setClients] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
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
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadClients() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setMsg('')
    try {
      await createClientByAgent(form)
      setMsg('Client enregistré dans votre portefeuille.')
      setForm({ telephone: '', prenom: '', nom: '', postnom: '', email: '', password: '', profession: '', adresse: '' })
      setShowForm(false)
      loadClients()
    } catch (err) {
      setError(err.message)
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
    setError('')
    try {
      await updateClientByAgent(editId, editForm)
      setMsg('Client mis à jour.')
      setEditId(null)
      loadClients()
    } catch (err) {
      setError(err.message)
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
      setMsg(`KYC ${statut} pour ${client.utilisateur?.full_name || 'client'}.`)
      loadClients()
    } catch (err) {
      setError(err.message)
    }
  }

  const pendingKyc = clients.flatMap(c =>
    (c.identites || [])
      .filter(i => i.statut_verification === 'en_attente')
      .map(i => ({ client: c, identite: i }))
  )

  return (
    <DashboardLayout title={isAgent ? 'Mes clients' : 'Tous les clients'}>
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      {msg && <p className="text-sm text-success mb-4">{msg}</p>}

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
            <FormField label="Téléphone (+243)" value={form.telephone} required
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
                    <p className="text-xs text-muted">{client.commune_label} · {identite.type_piece} {identite.numero_piece}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleVerifyKyc(client, identite.id, 'valide')}>Valider</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleVerifyKyc(client, identite.id, 'rejete')}>Rejeter</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-semibold text-blanc mb-3 flex items-center gap-2">
            <Users size={18} className="text-or" /> Clients ({clients.length})
          </h2>
          {loading && <p className="text-sm text-muted">Chargement…</p>}
          {!loading && clients.length === 0 && (
            <p className="text-sm text-muted">Aucun client dans votre portefeuille.</p>
          )}
          <div className="flex flex-col gap-3">
            {clients.map(c => {
              const lastId = c.identites?.[c.identites.length - 1]
              const kyc = lastId?.statut_verification || (c.kyc_valid ? 'valide' : 'en_attente')
              return (
                <div key={c.id} className="neu-flat p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-blanc">{c.utilisateur?.full_name}</p>
                    <p className="text-xs text-muted">
                      {c.utilisateur?.telephone} · {c.commune_label || c.commune_kinshasa}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={kyc} variant={KYC_BADGE[kyc] || 'default'} />
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
