import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import {
  listAdminUsers, listAdminCommunes, listAdminRoles,
  updateAdminUserCommune, updateAdminUserRole, updateAdminUserStatut,
} from '@/api/admin'

const STATUTS = [
  { value: 'actif', label: 'Actif' },
  { value: 'bloque', label: 'Bloqué' },
  { value: 'suspendu', label: 'Suspendu' },
]

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [communes, setCommunes] = useState([])
  const [roles, setRoles] = useState([])
  const [editing, setEditing] = useState(null)
  const [editState, setEditState] = useState({})

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
      <p className="text-sm text-muted mb-4">
        Gérez les rôles, statuts et communes des utilisateurs Simbisa.
      </p>
      <div className="flex flex-col gap-4">
        {users.length === 0 && (
          <p className="text-sm text-muted">Aucun utilisateur.</p>
        )}
        {users.map(u => (
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
