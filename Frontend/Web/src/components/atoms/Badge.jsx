import React from 'react'
import clsx from 'clsx'

const variants = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger:  'bg-danger/10 text-danger border-danger/20',
  gold:    'bg-or/10 text-or-light border-or/20',
  muted:   'bg-white/5 text-muted border-white/10',
}

const riskMap = {
  faible:      'success',
  moyen:       'warning',
  élevé:       'danger',
  eleve:       'danger',
  rembourse:   'success',
  encours:     'gold',
  approuve:    'success',
  rejete:      'danger',
  enanalyse:   'gold',
  enattente:   'warning',
}

export default function Badge({ label, variant, className = '' }) {
  const v = variant || riskMap[label?.toLowerCase?.()?.replace(/\s/g, '')] || 'muted'
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold',
        'border tracking-wide uppercase',
        variants[v],
        className
      )}
    >
      {label}
    </span>
  )
}
