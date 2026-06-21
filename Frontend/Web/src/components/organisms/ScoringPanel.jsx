import React from 'react'
import ScoreRing from '@/components/atoms/ScoreRing'
import ScoreMotorCard from '@/components/molecules/ScoreMotorCard'
import Badge from '@/components/atoms/Badge'

const MOTORS = [
  {
    name: 'Règles',
    weight: 25,
    details: [
      { label: 'KYC validé',      value: '✓' },
      { label: 'Âge',             value: '28 ans' },
      { label: 'Arriérés actifs', value: 'Aucun' },
    ]
  },
  {
    name: 'Comportemental',
    weight: 25,
    details: [
      { label: 'Objectif épargne atteint', value: '78%' },
      { label: 'Crédits remboursés',       value: '2/2' },
      { label: 'Activité plateforme',      value: 'Élevée' },
    ]
  },
  {
    name: 'Mobile Money',
    weight: 25,
    details: [
      { label: 'Flux entrants moy.',  value: '$340/mois' },
      { label: 'Régularité revenus',  value: '87%' },
      { label: 'Solde moyen mensuel', value: '$120' },
    ]
  },
  {
    name: 'IA XGBoost',
    weight: 25,
    details: [
      { label: 'Proba. défaut',  value: '12.4%' },
      { label: 'Niveau risque',  value: 'Faible' },
      { label: 'Modèle version', value: 'v2.3.1' },
    ]
  },
]

export default function ScoringPanel({ scores, globalScore, riskLevel }) {
  const motors = MOTORS.map((m, i) => ({
    ...m,
    score: scores?.[i] ?? Math.floor(55 + Math.random() * 40),
  }))

  return (
    <div className="neu-flat p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-blanc text-lg">Scoring Multi-Moteur</h2>
        <Badge label={riskLevel || 'faible'} />
      </div>

      <div className="flex flex-col items-center py-2">
        <ScoreRing score={globalScore || 74} size={140} label="Score global" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {motors.map(m => (
          <ScoreMotorCard key={m.name} {...m} />
        ))}
      </div>
    </div>
  )
}
