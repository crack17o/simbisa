import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { AlertTriangle, Info } from 'lucide-react'
import { listExceptions, resolveException } from '@/api/manager'

export default function ManagerExceptions() {
  const [exceptions, setExceptions] = useState([])
  const [hasError, setHasError] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setHasError(false)
    listExceptions()
      .then(res => setExceptions(res.data || []))
      .catch(err => { toast.error(err.message); setHasError(true) })
  }, [])

  useEffect(() => { load() }, [load])

  const handleResolve = async (id, statut) => {
    setBusyId(id)
    try {
      await resolveException(id, { statut, observation: '' })
      toast.success(statut === 'approuvee' ? 'Exception accordée.' : 'Exception refusée.')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout title="Gestion des exceptions">
      <div className="flex flex-col gap-4">
        <div className="neu-flat p-4 rounded-xl flex items-start gap-3 border-l-2 border-warning">
          <Info size={16} className="text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted leading-relaxed">
            <span className="font-semibold text-blanc">Qu'est-ce qu'une exception ?</span>{' '}
            Une exception est une demande de crédit dont le montant dépasse le plafond standard autorisé pour l'agent ou le niveau de compte du client.
            Ces dossiers remontent automatiquement au responsable crédit pour validation manuelle.
            Accorder ou refuser une exception engage la responsabilité du superviseur.
          </div>
        </div>

        {exceptions.length === 0 && !hasError && (
          <p className="text-sm text-muted">Aucune exception enregistrée.</p>
        )}
        {exceptions.map(ex => (
          <div key={ex.id} className="neu-flat p-5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted">{ex.ref} · {ex.client}</p>
                <p className="font-semibold text-blanc">{ex.type_label || ex.type_exception}</p>
                <p className="text-sm text-muted">{ex.motif}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={ex.statut} />
              {ex.statut === 'ouverte' && (
                <>
                  <Button
                    size="sm"
                    loading={busyId === ex.id}
                    onClick={() => handleResolve(ex.id, 'approuvee')}
                  >
                    Accorder
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busyId === ex.id}
                    onClick={() => handleResolve(ex.id, 'rejetee')}
                  >
                    Refuser
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
