import React from 'react'
import ScoreRing from '@/components/atoms/ScoreRing'
import ScoreMotorCard from '@/components/molecules/ScoreMotorCard'
import Badge from '@/components/atoms/Badge'

const MOTORS = [
  { name: 'Règles',         weight: 25 },
  { name: 'Comportemental', weight: 25 },
  { name: 'Mobile Money',   weight: 25 },
  { name: 'IA XGBoost',     weight: 25 },
]

export default function ScoringPanel({ scores, globalScore, riskLevel }) {
  const motors = MOTORS.map((m, i) => ({
    ...m,
    score: scores?.[i] ?? 0,
  }))

  return (
    <div className="neu-flat p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-blanc text-lg">Scoring Multi-Moteur</h2>
        <Badge label={riskLevel || 'faible'} />
      </div>

      <div className="flex flex-col items-center py-2">
        <ScoreRing score={globalScore ?? 0} size={140} label="Score global" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {motors.map(m => (
          <ScoreMotorCard key={m.name} {...m} />
        ))}
      </div>
    </div>
  )
}
