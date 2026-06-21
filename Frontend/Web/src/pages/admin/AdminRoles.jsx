import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import { listAdminRoles } from '@/api/admin'

export default function AdminRoles() {
  const [roles, setRoles] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    listAdminRoles()
      .then(res => setRoles(res.data || []))
      .catch(err => setError(err.message))
  }, [])

  return (
    <DashboardLayout title="Gestion des rôles">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <div className="flex flex-col gap-4">
        {roles.map(r => (
          <div key={r.name} className="neu-flat p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-display font-bold text-blanc">{r.name}</p>
              <p className="text-sm text-muted">{r.desc}</p>
            </div>
            <Badge label={`${r.users} utilisateur${r.users > 1 ? 's' : ''}`} variant="gold" />
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
