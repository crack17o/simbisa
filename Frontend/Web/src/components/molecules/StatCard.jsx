import React from 'react'
import clsx from 'clsx'

export default function StatCard({ label, value, sub, icon: Icon, trend, accentColor = '#D4AF37', className = '' }) {
  const isPositive = typeof trend === 'number' ? trend >= 0 : null

  return (
    <div
      className={clsx(
        'neu-flat p-5 flex flex-col gap-3 transition-all duration-200',
        'hover:shadow-neu-gold cursor-default',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted uppercase tracking-widest font-medium">
          {label}
        </span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: `${accentColor}15`,
              color: accentColor,
              boxShadow: `0 0 8px ${accentColor}30`,
            }}
          >
            <Icon size={15} />
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-display font-bold text-blanc">{value}</p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>

      {trend !== undefined && (
        <div
          className={clsx(
            'text-xs font-medium flex items-center gap-1',
            isPositive ? 'text-success' : 'text-danger'
          )}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
          <span className="text-muted font-normal">vs mois dernier</span>
        </div>
      )}
    </div>
  )
}
