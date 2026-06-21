import React from 'react'
import clsx from 'clsx'

const variants = {
  primary: `
    bg-gradient-to-br from-or-light to-or-dark text-noir font-semibold
    shadow-neu hover:shadow-neu-gold active:shadow-neu-pressed
    hover:from-or hover:to-or-dark
  `,
  secondary: `
    bg-panel text-blanc font-medium
    shadow-neu hover:shadow-neu-sm active:shadow-neu-pressed
    border border-transparent hover:border-or/20
  `,
  ghost: `
    bg-transparent text-muted hover:text-or font-medium
    transition-colors duration-200
  `,
  danger: `
    bg-panel text-danger font-semibold
    shadow-neu hover:shadow-neu-sm active:shadow-neu-pressed
    border border-danger/20
  `,
}

const sizes = {
  sm:  'px-4 py-2 text-sm rounded-xl',
  md:  'px-6 py-3 text-sm rounded-xl2',
  lg:  'px-8 py-4 text-base rounded-xl2',
  xl:  'px-10 py-5 text-lg rounded-xl3 w-full',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPos = 'left',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2',
        'transition-all duration-200 cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      )}
      {!loading && Icon && iconPos === 'left' && <Icon size={16} />}
      {children}
      {!loading && Icon && iconPos === 'right' && <Icon size={16} />}
    </button>
  )
}
