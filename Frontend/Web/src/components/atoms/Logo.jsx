import React from 'react'
import clsx from 'clsx'

export default function Logo({ size = 'md', className = '' }) {
  const sizes = {
    sm: { text: 'text-lg', mark: 'w-6 h-6' },
    md: { text: 'text-2xl', mark: 'w-8 h-8' },
    lg: { text: 'text-4xl', mark: 'w-12 h-12' },
  }
  const s = sizes[size]

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div
        className={clsx(
          s.mark,
          'rounded-lg flex items-center justify-center neu-gold-glow',
          'bg-panel shadow-neu'
        )}
        style={{
          background: 'linear-gradient(145deg, #1e1e1e, #121212)',
          boxShadow: '3px 3px 8px #050505, -3px -3px 8px #232323, 0 0 12px rgba(212,175,55,0.4)',
        }}
      >
        <span
          className={clsx('font-display font-bold', size === 'sm' ? 'text-sm' : 'text-base')}
          style={{ color: '#D4AF37' }}
        >
          S
        </span>
      </div>

      <span
        className={clsx('font-display font-bold tracking-wide text-gradient-gold', s.text)}
      >
        Simbisa
      </span>
    </div>
  )
}
