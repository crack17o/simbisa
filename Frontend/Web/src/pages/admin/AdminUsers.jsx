import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { Search } from 'lucide-react'
import {
  listAdminUsers, listAdminCommunes, listAdminRoles,
  updateAdminUserCommune, updateAdminUserRole, updateAdminUserStatut,
} from '@/api/admin'

const STATUTS = [
  { value: 'actif', label: 'Actif' },
  { value: 'bloque', label: 'Bloqué' },
  { value: 'suspendu', label: 'Suspendu' },
]

const ROLE_TABS = [
  { value: 'all',              label: 'Tous' },
  { value: 'Client',           label: 'Clients' },
  { value: 'Agent de crédit',  label: 'Agents' },
  { value: 'Analyste risque',  label: 'Analystes' },
  { value: 'Responsable crédit', label: 'Responsables' },
  { value: 'Auditeur',         label: 'Auditeurs' },
  { value: 'Administrateur',   label: 'Admins' },
]

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [communes, setCommunes] = useState([])
  const [roles, setRoles] = useState([])
  const [editing, setEditing] = useState(null)
  const [editState, setEditState] = useState({})
  const [search, setSearch] = useState('')
  const [roleTab, setRoleTab] = useState('all')

  const load = () => {
    Promise.all([listAdminUsers(), listAdminCommunes(), listAdminRoles()])
      .then(([usersRes, communesRes, rolesRes]) => {
        setUsers(usersRes.data || [])
        setCommunes(communesRes.data || [])
        setRoles((rolesRes.data || []).map(r => r.name))
      })
      .catch(err => toast.error(err.message))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      if (roleTab !== 'all' && u.role !== roleTab) return false
      if (q) {
        const name = (u.name || u.full_name || '').toLowerCase()
        const phone = (u.telephone || '').toLowerCase()
        if (!name.includes(q) && !phone.includes(q)) return false
      }
      return true
    })
  }, [users, search, roleTab])

  const communeLabel = (code) => communes.find(c => c.code === code)?.label || code || '—'

  const startEdit = (u) => {
    setEditing(u.id)
    setEditState({
      commune_kinshasa: u.commune_kinshasa || '',
      role: u.role || '',
      statut: u.statut || 'actif',
    })
  }

  const cancelEdit = () => { setEditing(null); setEditState({}) }

  const saveUser = async (u) => {
    try {
      const patches = []
      if (editState.role !== (u.role || '')) {
        patches.push(updateAdminUserRole(u.id, editState.role))
      }
      if (editState.statut !== (u.statut || 'actif')) {
        patches.push(updateAdminUserStatut(u.id, editState.statut))
      }
      if (editState.commune_kinshasa !== (u.commune_kinshasa || '')) {
        patches.push(updateAdminUserCommune(u.id, editState.commune_kinshasa))
      }
      await Promise.all(patches)
      toast.success(`Utilisateur ${u.name || u.full_name} mis à jour.`)
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <DashboardLayout title="Gestion des utilisateurs">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Gérez les rôles, statuts et communes des utilisateurs Simbisa.
        </p>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou téléphone…"
            className="w-full neu-inset rounded-xl pl-9 pr-4 py-2.5 text-sm text-blanc placeholder-muted/50 outline-none bg-transparent"
          />
        </div>

        {/* Role tabs */}
        <div className="flex flex-wrap gap-2">
          {ROLE_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setRoleTab(t.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                roleTab === t.value
                  ? 'bg-or text-noir'
                  : 'neu-sm text-muted hover:text-blanc'
              }`}
            >
              {t.label}
              {t.value !== 'all' && (
                <span className="ml-1.5 opacity-60">
                  ({users.filter(u => u.role === t.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted">
          {filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== users.length ? ` sur ${users.length}` : ''}
        </p>

        {filtered.length === 0 && (
          <p className="text-sm text-muted">Aucun utilisateur ne correspond.</p>
        )}

        {filtered.map(u => (
          <div key={u.id} className="neu-flat p-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-blanc">{u.name || u.full_name}</p>
                <p className="text-xs text-muted">{u.telephone}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge label={u.role || '—'} />
                  <Badge label={u.statut || 'actif'} />
                  {(u.role === 'Agent de crédit') && u.commune_kinshasa && (
                    <span className="text-xs text-or">{communeLabel(u.commune_kinshasa)}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {editing === u.id ? (
                  <>
                    <Button size="sm" onClick={() => saveUser(u)}>Enregistrer</Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>Annuler</Button>
                  </>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => startEdit(u)}>Modifier</Button>
                )}
              </div>
            </div>

            {editing === u.id && (
              <div className="neu-inset p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted uppercase tracking-widest">Rôle</label>
                  <select
                    value={editState.role}
                    onChange={e => setEditState(s => ({ ...s, role: e.target.value }))}
                    className="bg-surface text-blanc text-sm rounded-xl px-3 py-2.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none"
                  >
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted uppercase tracking-widest">Statut</label>
                  <select
                    value={editState.statut}
                    onChange={e => setEditState(s => ({ ...s, statut: e.target.value }))}
                    className="bg-surface text-blanc text-sm rounded-xl px-3 py-2.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none"
                  >
                    {STATUTS.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                  </select>
                </div>

                {editState.role === 'Agent de crédit' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted uppercase tracking-widest">Commune Kinshasa</label>
                    <select
                      value={editState.commune_kinshasa}
                      onChange={e => setEditState(s => ({ ...s, commune_kinshasa: e.target.value }))}
                      className="bg-surface text-blanc text-sm rounded-xl px-3 py-2.5 shadow-neu-inset border border-transparent focus:border-or/40 outline-none"
                    >
                      <option value="">Aucune</option>
                      {communes.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
