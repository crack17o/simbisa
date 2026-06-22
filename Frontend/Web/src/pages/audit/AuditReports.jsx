import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/templates/DashboardLayout'
import Button from '@/components/atoms/Button'
import { FileText, Download } from 'lucide-react'
import { listAuditReports, generateAuditReport } from '@/api/audit'

export default function AuditReports() {
  const [reports, setReports] = useState([])
  const [generating, setGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState(null)

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
      setLastGenerated(res.data)
      toast.success(`Rapport ${res.data?.report_id || ''} généré.`)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const downloadJson = (report) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
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
          {reports.map(r => (
            <div key={r.id} className="neu-flat p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted">{r.id} · {r.date}</p>
                <p className="font-semibold text-blanc">{r.titre}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() => downloadJson(lastGenerated || { id: r.id, titre: r.titre, type: r.type })}
              >
                JSON
              </Button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
