import React, { useState } from 'react'
import { Sparkles, Copy, RefreshCw, Check } from 'lucide-react'
import Button from '@/components/atoms/Button'
import { generateMemo } from '@/api/rag'
import { useAuth } from '@/context/AuthContext'
import { ROLES } from '@/constants/roles'

const MOCK_MEMO = `Mémo non disponible — connectez-vous en agent et fournissez un demande_id, ou consultez explication_ia du scoring.`

export default function AIMemoPanel({ memo: memoProp, demandeId }) {
  const { user } = useAuth()
  const isAgent = [ROLES.AGENT, ROLES.MANAGER].includes(user?.role)
  const [generating, setGenerating] = useState(false)
  const [memo, setMemo] = useState(memoProp || null)
  const [copied, setCopied] = useState(false)

  React.useEffect(() => {
    if (memoProp) setMemo(memoProp)
  }, [memoProp])

  const generate = async () => {
    if (!demandeId) {
      setMemo(MOCK_MEMO)
      return
    }
    setGenerating(true)
    try {
      if (isAgent) {
        const res = await generateMemo(demandeId)
        setMemo(res.data.memo)
      } else {
        setMemo(memoProp || MOCK_MEMO)
      }
    } catch {
      setMemo(memoProp || MOCK_MEMO)
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
          <h2 className="font-display font-bold text-blanc">Mémo IA (RAG)</h2>
        </div>
        {isAgent && demandeId && (
          <span className="text-xs text-muted">POST /rag/memo/{demandeId}/</span>
        )}
      </div>

      {!memo && !generating && (
        <div className="neu-inset rounded-xl p-6 flex flex-col items-center gap-4 text-center">
          <p className="text-muted text-sm">
            {memoProp ? 'Explication du scoring disponible ci-dessous.' : 'Générez un mémo RAG (agent) ou soumettez une demande crédit.'}
          </p>
          <Button onClick={generate} icon={Sparkles}>
            {isAgent && demandeId ? 'Générer via API RAG' : 'Afficher explication'}
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
