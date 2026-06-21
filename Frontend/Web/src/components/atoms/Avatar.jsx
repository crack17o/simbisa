import React from 'react'
import clsx from 'clsx'

export default function Avatar({ name = '', size = 'md', src, className = '' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' }
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div
      className={clsx(
        'rounded-xl flex items-center justify-center font-semibold',
        'bg-panel shadow-neu',
        sizes[size],
        className
      )}
      style={{ color: '#D4AF37' }}
    >
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover rounded-xl" />
        : initials
      }
    </div>
  )
}
