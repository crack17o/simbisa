import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Badge from '@/components/atoms/Badge'
import Button from '@/components/atoms/Button'
import { X, ChevronRight } from 'lucide-react'
import { listAuditDecisions, getAuditDecision } from '@/api/audit'
import { formatDate } from '@/utils/formatters'
import { formatMoney } from '@/utils/apiHelpers'

function DetailModal({ id, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuditDecision(id)
      .then(res => setDetail(res.data))
      .catch(err => { toast.error(err.message); onClose() })
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="neu-flat w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-blanc text-lg">
            Décision {detail?.ref ?? `#${id}`}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-blanc transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading && <p className="text-sm text-muted">Chargement…</p>}

        {detail && (
          <>
            {/* Décision */}
            <Section title="Décision">
              <Row label="Résultat"><Badge label={detail.decision} /></Row>
              <Row label="Score global">{detail.score_global} / 100</Row>
              <Row label="Date">{formatDate(detail.date_decision)}</Row>
              <Row label="Type">{detail.is_automatic ? 'Automatique (IA)' : 'Manuelle'}</Row>
              <Row label="Agent">{detail.agent ?? '—'}{detail.agent_telephone ? ` · ${detail.agent_telephone}` : ''}</Row>
              <Row label="Recommandation IA">{detail.recommandation_ia ?? '—'}</Row>
              {detail.motif && <Row label="Motif">{detail.motif}</Row>}
            </Section>

            {/* Demande */}
            <Section title="Demande de crédit">
              <Row label="Réf">{detail.ref}</Row>
              <Row label="Montant">{formatMoney(detail.montant_demande, detail.devise)}</Row>
              <Row label="Durée">{detail.duree_mois} mois</Row>
              <Row label="Date demande">{formatDate(detail.date_demande)}</Row>
              <Row label="Statut demande">{detail.statut_demande}</Row>
              {detail.motif_demande && <Row label="Motif client">{detail.motif_demande}</Row>}
            </Section>

            {/* Client */}
            <Section title="Client">
              <Row label="Nom">{detail.client}</Row>
              {detail.client_telephone && <Row label="Téléphone">{detail.client_telephone}</Row>}
              {detail.client_date_naissance && <Row label="Date naissance">{detail.client_date_naissance}</Row>}
              {detail.client_adresse && <Row label="Adresse">{detail.client_adresse}</Row>}
              {detail.client_profession && <Row label="Profession">{detail.client_profession}</Row>}
            </Section>

            {/* Score IA */}
            {detail.score_ia && (
              <Section title="Moteur IA (XGBoost)">
                <Row label="Score normalisé">{detail.score_ia.score_normalise} / 100</Row>
                <Row label="Probabilité défaut">{detail.score_ia.probabilite_defaut_pct} %</Row>
                <Row label="Niveau risque">{detail.score_ia.niveau_risque}</Row>
                <Row label="Modèle">{detail.score_ia.modele_utilise}</Row>
                {detail.score_ia.shap_values && Object.keys(detail.score_ia.shap_values).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted mb-2">Attributions SHAP</p>
                    <div className="flex flex-col gap-1">
                      {Object.entries(detail.score_ia.shap_values)
                        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                        .slice(0, 8)
                        .map(([feat, val]) => (
                          <div key={feat} className="flex justify-between text-xs">
                            <span className="text-muted">{feat}</span>
                            <span className={parseFloat(val) >= 0 ? 'text-success' : 'text-danger'}>
                              {parseFloat(val) >= 0 ? '+' : ''}{parseFloat(val).toFixed(3)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Explication IA */}
            {detail.explication_ia && (
              <Section title="Mémo IA (RAG)">
                <p className="text-sm text-blanc leading-relaxed">{detail.explication_ia}</p>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="neu-sm p-4 flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-blanc text-right">{children}</span>
    </div>
  )
}

export default function AuditDecisions() {
  const [decisions, setDecisions] = useState([])
  const [hasError, setHasError] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    listAuditDecisions()
      .then(res => setDecisions(res.data || []))
      .catch(err => { toast.error(err.message); setHasError(true) })
  }, [])

  return (
    <DashboardLayout title="Traçabilité des décisions crédit">
      <div className="flex flex-col gap-4">
        {decisions.length === 0 && !hasError && (
          <p className="text-sm text-muted">Aucune décision enregistrée.</p>
        )}
        {decisions.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedId(d.id)}
            className="neu-flat p-5 flex items-center justify-between gap-4 w-full text-left hover:shadow-neu transition-all"
          >
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
            <div className="flex items-center gap-3 shrink-0">
              <Badge label={d.decision} />
              <ChevronRight size={16} className="text-muted" />
            </div>
          </button>
        ))}
      </div>

      {selectedId && (
        <DetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </DashboardLayout>
  )
}
