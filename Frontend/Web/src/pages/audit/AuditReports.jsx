import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import { FileText, Download, ChevronDown, ChevronRight, Printer } from 'lucide-react'
import { listAuditReports, generateAuditReport } from '@/api/audit'
import { formatDate } from '@/utils/formatters'

function StatBar({ label, value, max, color = '#D4AF37' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-blanc">{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ReportDetail({ report }) {
  const d = report?.details || report || {}
  const total = d.total_demandes || 0
  const approved = d.approuvees || d.approuve || 0
  const rejected = d.rejetees || d.rejete || 0
  const avgScore = d.score_moyen != null ? Number(d.score_moyen).toFixed(1) : null

  if (!total && !approved && !rejected) {
    return <p className="text-xs text-muted mt-3">Aucune donnée statistique dans ce rapport.</p>
  }

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="neu-inset p-4 rounded-xl flex flex-col gap-3">
        <p className="text-xs text-muted uppercase tracking-widest">Synthèse</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total demandes', val: total },
            { label: 'Score moyen', val: avgScore ? `${avgScore}/100` : '—' },
            { label: 'Approuvées', val: approved },
            { label: 'Rejetées', val: rejected },
          ].map(s => (
            <div key={s.label} className="flex flex-col">
              <span className="text-xs text-muted">{s.label}</span>
              <span className="font-bold text-blanc text-lg">{s.val ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
      {total > 0 && (
        <div className="neu-inset p-4 rounded-xl flex flex-col gap-3">
          <p className="text-xs text-muted uppercase tracking-widest">Répartition</p>
          <StatBar label="Approuvées" value={approved} max={total} color="#34D399" />
          <StatBar label="Rejetées" value={rejected} max={total} color="#EF4444" />
          <StatBar label="Autres" value={total - approved - rejected} max={total} color="#D4AF37" />
        </div>
      )}
    </div>
  )
}

function exportHtml(report) {
  const d = report?.details || report || {}
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Rapport Audit ${report.report_id || report.id || ''}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #111; background: #fff; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .footer { margin-top: 40px; color: #999; font-size: 11px; }
</style></head><body>
<h1>${report.titre || 'Rapport d\'audit'}</h1>
<p class="meta">ID : ${report.report_id || report.id || '—'} · Généré le ${formatDate ? formatDate(report.date || report.created_at) : new Date().toLocaleDateString('fr-FR')}</p>
<table>
  <tr><th>Indicateur</th><th>Valeur</th></tr>
  ${Object.entries(d).map(([k, v]) => `<tr><td>${k}</td><td>${v != null ? v : '—'}</td></tr>`).join('')}
</table>
<p class="footer">Simbisa FinTech — Exporté le ${new Date().toLocaleString('fr-FR')}</p>
</body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${report.report_id || report.id || 'rapport'}.html`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditReports() {
  const [reports, setReports] = useState([])
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [fullData, setFullData] = useState({})

  const load = useCallback(() => {
    listAuditReports()
      .then(res => setReports(res.data || []))
      .catch(err => toast.error(err.message))
  }, [])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await generateAuditReport({ type: 'decisions_credit' })
      const generated = res.data
      toast.success(`Rapport ${generated?.report_id || ''} généré.`)
      if (generated) {
        setFullData(prev => ({ ...prev, [generated.report_id || generated.id]: generated }))
      }
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const downloadJson = (report, stored) => {
    const data = stored || { id: report.id, titre: report.titre, type: report.type }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.report_id || report.id || 'rapport'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout title="Rapports d'audit">
      <div className="flex flex-col gap-6">
        <Button icon={FileText} loading={generating} onClick={generate} className="self-start">
          Générer un nouveau rapport
        </Button>

        <div className="flex flex-col gap-4">
          {reports.length === 0 && (
            <p className="text-sm text-muted">Aucun rapport disponible.</p>
          )}
          {reports.map(r => {
            const key = r.report_id || r.id
            const stored = fullData[key]
            const isOpen = !!expanded[key]
            return (
              <div key={r.id} className="neu-flat p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <button
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                    onClick={() => toggleExpand(key)}
                  >
                    {isOpen
                      ? <ChevronDown size={16} className="text-or flex-shrink-0" />
                      : <ChevronRight size={16} className="text-muted flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{r.id} · {r.date}</p>
                      <p className="font-semibold text-blanc truncate">{r.titre}</p>
                    </div>
                  </button>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Download}
                      onClick={() => downloadJson(r, stored)}
                    >
                      JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Printer}
                      onClick={() => exportHtml(stored || r)}
                    >
                      HTML
                    </Button>
                  </div>
                </div>

                {isOpen && <ReportDetail report={stored || r} />}
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
