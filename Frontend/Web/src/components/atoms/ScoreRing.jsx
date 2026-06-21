import React from 'react'

export default function ScoreRing({ score = 0, size = 120, label = 'Score' }) {
  const r = (size - 20) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(Math.max(score, 0), 100)
  const dash = (pct / 100) * circ

  const color = pct >= 70 ? '#22C55E' : pct >= 45 ? '#F59E0B' : '#EF4444'
  const glowColor = pct >= 70
    ? 'rgba(34,197,94,0.4)'
    : pct >= 45
    ? 'rgba(245,158,11,0.4)'
    : 'rgba(239,68,68,0.4)'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#232323"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text
          x="50%"
          y="45%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={size * 0.22}
          fontFamily="Sora, sans-serif"
          fontWeight="700"
        >
          {pct}
        </text>
        <text
          x="50%"
          y="68%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#9CA3AF"
          fontSize={size * 0.1}
          fontFamily="Inter, sans-serif"
        >
          /100
        </text>
      </svg>
      <span className="text-xs text-muted uppercase tracking-widest">{label}</span>
    </div>
  )
}
