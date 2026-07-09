import React from 'react'
import clsx from 'clsx'

const PREFIX = '+243'

/**
 * Champ téléphone avec indicatif RDC non-éditable.
 * value / onChange utilisent le numéro complet (+243XXXXXXXXX).
 */
export default function PhoneInput({
  value = '',
  onChange,
  error,
  label = 'Téléphone',
  name,
  required,
  disabled,
}) {
  const localPart = value.startsWith(PREFIX) ? value.slice(PREFIX.length) : value

  const handleChange = (e) => {
    const local = e.target.value.replace(/[^\d\s]/g, '')
    onChange({ target: { name, value: PREFIX + local } })
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-muted uppercase tracking-widest">
          {label}
        </label>
      )}
      <div className={clsx(
        'flex rounded-xl overflow-hidden',
        'shadow-neu-inset',
        'border border-transparent',
        'focus-within:border-or/40 focus-within:shadow-neu-gold',
        'transition-all duration-200',
        error && 'border-danger/50',
      )}>
        <div className="flex items-center gap-1.5 px-3 bg-panel border-r border-white/8 shrink-0 select-none">
          <span className="text-base leading-none">🇨🇩</span>
          <span className="text-sm font-medium text-muted">{PREFIX}</span>
        </div>
        <input
          type="tel"
          name={name}
          value={localPart}
          onChange={handleChange}
          placeholder="8XX XXX XXX"
          required={required}
          disabled={disabled}
          className={clsx(
            'flex-1 bg-surface text-blanc text-sm',
            'px-4 py-3.5',
            'placeholder-muted/50',
            'focus:outline-none',
            'transition-all duration-200',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
