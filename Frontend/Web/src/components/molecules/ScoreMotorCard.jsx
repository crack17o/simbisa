import React from 'react'

const motorColors = {
  'Règles':         '#D4AF37',
  'Comportemental': '#60A5FA',
  'Mobile Money':   '#A78BFA',
  'IA XGBoost':     '#34D399',
}

export default function ScoreMotorCard({ name, score, weight, details = [] }) {
  const color = motorColors[name] || '#D4AF37'
  const pct = Math.min(Math.max(score, 0), 100)

  return (
    <div className="neu-flat p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span className="text-sm font-semibold text-blanc">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Poids: {weight}%</span>
          <span
            className="text-sm font-bold"
            style={{ color }}
          >
            {pct}/100
          </span>
        </div>
      </div>

      <div className="neu-inset h-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>

      {details.length > 0 && (
        <ul className="flex flex-col gap-1">
          {details.map((d, i) => (
            <li key={i} className="text-xs text-muted flex justify-between">
              <span>{d.label}</span>
              <span className="text-blanc font-medium">{d.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
