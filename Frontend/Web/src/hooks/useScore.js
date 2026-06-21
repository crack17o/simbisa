import { useMemo } from 'react'

const DEFAULT_MOTORS = [
  { name: 'Règles', weight: 25 },
  { name: 'Comportemental', weight: 25 },
  { name: 'Mobile Money', weight: 25 },
  { name: 'IA XGBoost', weight: 25 },
]

export function useScore(scores = [85, 78, 72, 62]) {
  return useMemo(() => {
    const globalScore = Math.round(
      scores.reduce((sum, s, i) => sum + s * (DEFAULT_MOTORS[i]?.weight ?? 25), 0) / 100
    )

    const riskLevel =
      globalScore >= 70 ? 'faible' :
      globalScore >= 45 ? 'moyen' :
      'élevé'

    const motors = DEFAULT_MOTORS.map((m, i) => ({
      ...m,
      score: scores[i] ?? 0,
    }))

    return { globalScore, riskLevel, motors }
  }, [scores])
}
