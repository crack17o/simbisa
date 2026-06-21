import React from 'react'
import clsx from 'clsx'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import Badge from '@/components/atoms/Badge'

const config = {
  approuve: {
    icon: CheckCircle,
    color: '#22C55E',
    glow: 'rgba(34,197,94,0.25)',
    title: 'Crédit Approuvé',
    bg: 'bg-success/5 border-success/20',
  },
  rejete: {
    icon: XCircle,
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.25)',
    title: 'Demande Rejetée',
    bg: 'bg-danger/5 border-danger/20',
  },
  enanalyse: {
    icon: Clock,
    color: '#D4AF37',
    glow: 'rgba(212,175,55,0.25)',
    title: 'En Cours d\'Analyse',
    bg: 'bg-or/5 border-or/20',
  },
  en_analyse: {
    icon: Clock,
    color: '#D4AF37',
    glow: 'rgba(212,175,55,0.25)',
    title: 'En Cours d\'Analyse',
    bg: 'bg-or/5 border-or/20',
  },
}

export default function CreditDecisionBanner({ decision, motif, explication, montant, duree }) {
  const c = config[decision] || config.enanalyse
  const Icon = c.icon

  return (
    <div
      className={clsx(
        'rounded-xl2 p-5 border flex flex-col gap-4',
        c.bg
      )}
      style={{ boxShadow: `0 0 20px ${c.glow}` }}
    >
      <div className="flex items-center gap-3">
        <Icon size={28} style={{ color: c.color }} />
        <div>
          <h3 className="font-display font-bold text-blanc text-lg">{c.title}</h3>
          {montant && (
            <p className="text-sm text-muted">
              {montant} USD · {duree} mois
            </p>
          )}
        </div>
        <div className="ml-auto">
          <Badge label={decision} />
        </div>
      </div>

      {motif && (
        <div className="neu-inset p-3 rounded-xl">
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Motif</p>
          <p className="text-sm text-blanc">{motif}</p>
        </div>
      )}

      {explication && (
        <div className="neu-inset p-3 rounded-xl">
          <p className="text-xs text-muted uppercase tracking-widest mb-1 flex items-center gap-1">
            <span className="text-or-light">✦</span> Analyse IA (RAG)
          </p>
          <p className="text-sm text-blanc/80 leading-relaxed">{explication}</p>
        </div>
      )}
    </div>
  )
}
