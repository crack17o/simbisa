import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, Copy, RefreshCw, Check, Wifi, WifiOff } from 'lucide-react'
import Button from '@/components/atoms/Button'
import { generateMemo, getRagStatus } from '@/api/rag'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/constants/roles'

const FALLBACK_MEMO = `Aucune explication disponible pour cette demande. Soumettez une demande de crédit pour obtenir une analyse IA détaillée.`

export default function AIMemoPanel({ memo: memoProp, demandeId }) {
  const { user } = useAuth()
  const isAgent = [ROLES.AGENT, ROLES.MANAGER].includes(user?.role)
  const [generating, setGenerating] = useState(false)
  const [memo, setMemo] = useState(memoProp || null)
  const [copied, setCopied] = useState(false)
  const [ragOnline, setRagOnline] = useState(null)

  useEffect(() => {
    if (memoProp) setMemo(memoProp)
  }, [memoProp])

  useEffect(() => {
    getRagStatus()
      .then(res => setRagOnline(res.data?.status === 'ok'))
      .catch(() => setRagOnline(false))
  }, [])

  const generate = async () => {
    if (!demandeId) {
      setMemo(FALLBACK_MEMO)
      return
    }
    setGenerating(true)
    try {
      if (isAgent) {
        const res = await generateMemo(demandeId)
        setMemo(res.data.memo)
      } else {
        setMemo(memoProp || FALLBACK_MEMO)
      }
    } catch (err) {
      toast.error(err.message || 'Génération du mémo impossible.')
      setMemo(memoProp || FALLBACK_MEMO)
    } finally {
      setGenerating(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(memo || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="neu-flat p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: '#D4AF37' }} />
          <h2 className="font-display font-bold text-blanc">Mémo IA</h2>
        </div>
        {ragOnline !== null && (
          <span className={`flex items-center gap-1 text-xs ${ragOnline ? 'text-success' : 'text-muted'}`}>
            {ragOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {ragOnline ? 'IA disponible' : 'IA hors-ligne'}
          </span>
        )}
      </div>

      {!memo && !generating && (
        <div className="neu-inset rounded-xl p-6 flex flex-col items-center gap-4 text-center">
          <p className="text-muted text-sm">
            {memoProp ? 'Explication du scoring disponible ci-dessous.' : 'Générez une explication IA ou soumettez une demande de crédit.'}
          </p>
          <Button onClick={generate} icon={Sparkles} disabled={!ragOnline && isAgent}>
            {isAgent && demandeId ? 'Générer le mémo' : 'Afficher explication'}
          </Button>
        </div>
      )}

      {generating && (
        <div className="neu-inset rounded-xl p-6 flex items-center justify-center gap-3">
          <RefreshCw size={18} className="animate-spin text-or" />
          <span className="text-sm text-muted">Génération…</span>
        </div>
      )}

      {memo && !generating && (
        <div className="neu-inset rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">Mémo / explication</span>
            <div className="flex gap-2">
              <button onClick={copy} className="text-muted hover:text-or">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
              {isAgent && demandeId && (
                <button onClick={generate} className="text-muted hover:text-or"><RefreshCw size={14} /></button>
              )}
            </div>
          </div>
          <div className="text-sm text-blanc/85 leading-relaxed whitespace-pre-wrap">{memo}</div>
        </div>
      )}
    </div>
  )
}
