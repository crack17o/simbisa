import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { listAdminUsers, listAdminCommunes, updateAdminUserCommune } from '@/api/admin'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [communes, setCommunes] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editCommune, setEditCommune] = useState('')

  const load = () => {
    Promise.all([listAdminUsers(), listAdminCommunes()])
      .then(([usersRes, communesRes]) => {
        setUsers(usersRes.data || [])
        setCommunes(communesRes.data || [])
      })
      .catch(err => setError(err.message))
  }

  useEffect(() => { load() }, [])

  const communeLabel = (code) => communes.find(c => c.code === code)?.label || code || '—'

  const saveCommune = async (userId) => {
    setError('')
    try {
      await updateAdminUserCommune(userId, editCommune)
      setMsg('Commune agent mise à jour.')
      setEditingId(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <DashboardLayout title="Gestion des utilisateurs">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      {msg && <p className="text-sm text-success mb-4">{msg}</p>}
      <p className="text-sm text-muted mb-4">
        Créez les comptes agents via Django admin, puis assignez leur commune Kinshasa ici.
      </p>
      <div className="flex flex-col gap-4">
        {users.length === 0 && !error && (
          <p className="text-sm text-muted">Aucun utilisateur.</p>
        )}
        {users.map(u => (
          <div key={u.id} className="neu-flat p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-blanc">{u.name || u.full_name}</p>
              <p className="text-xs text-muted">{u.telephone} · {u.role || u.role_name}</p>
              {(u.role || u.role_name) === 'Agent de crédit' && (
                <p className="text-xs text-or mt-1">Commune : {communeLabel(u.commune_kinshasa)}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge label={u.statut} />
              {(u.role || u.role_name) === 'Agent de crédit' && (
                editingId === u.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-surface border border-white/10 rounded-lg px-2 py-1 text-sm text-blanc"
                      value={editCommune}
                      onChange={e => setEditCommune(e.target.value)}
                    >
                      <option value="">Aucune</option>
                      {communes.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => saveCommune(u.id)}>OK</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => {
                    setEditingId(u.id)
                    setEditCommune(u.commune_kinshasa || '')
                  }}>
                    Commune
                  </Button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
