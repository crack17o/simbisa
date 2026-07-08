import React, { forwardRef } from 'react'
import clsx from 'clsx'

const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, iconRight, className = '', id, name, ...props },
  ref
) {
  const inputId = id || name
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted uppercase tracking-widest">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-4 text-muted pointer-events-none">
            <Icon size={16} />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          className={clsx(
            'w-full bg-surface text-blanc text-sm',
            'rounded-xl px-4 py-3.5',
            'placeholder-muted/50',
            'border border-transparent',
            'shadow-neu-inset',
            'focus:outline-none focus:border-or/40 focus:shadow-neu-gold',
            'transition-all duration-200',
            Icon && 'pl-11',
            iconRight && 'pr-11',
            error && 'border-danger/50 focus:border-danger',
            className
          )}
          {...props}
        />

        {iconRight && (
          <div className="absolute right-4 text-muted">
            {iconRight}
          </div>
        )}
      </div>

      {error && <span className="text-xs text-danger">{error}</span>}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
    </div>
  )
})

export default Input
