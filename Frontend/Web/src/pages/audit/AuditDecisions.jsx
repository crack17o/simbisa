import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import { listAuditDecisions } from '@/api/audit'
import { formatDate } from '@/utils/formatters'
import { formatMoney } from '@/utils/apiHelpers'

export default function AuditDecisions() {
  const [decisions, setDecisions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    listAuditDecisions()
      .then(res => setDecisions(res.data || []))
      .catch(err => setError(err.message))
  }, [])

  return (
    <DashboardLayout title="Traçabilité des décisions crédit">
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <div className="flex flex-col gap-4">
        {decisions.length === 0 && !error && (
          <p className="text-sm text-muted">Aucune décision enregistrée — lancez seed_demo avec scoring.</p>
        )}
        {decisions.map(d => (
          <div key={d.id} className="neu-flat p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted">
                {d.ref} · {formatDate(d.date_decision)} · {d.is_automatic ? 'auto' : 'manuelle'}
              </p>
              <p className="font-semibold text-blanc">
                {d.client} — {formatMoney(d.montant_demande, d.devise)}
              </p>
              <p className="text-xs text-muted">
                Agent : {d.agent || '—'} · Score {d.score_global}
              </p>
              {d.motif && <p className="text-xs text-muted mt-1">{d.motif}</p>}
            </div>
            <Badge label={d.decision} />
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
