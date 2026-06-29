import { toast as sonner } from 'sonner'
import { normalizeError } from './errorMessages'

const base = {
  borderRadius: '14px',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  padding: '14px 16px',
}

export const toast = {
  success: (msg, opts) => sonner.success(msg, {
    style: {
      ...base,
      background: 'var(--toast-bg)',
      color: 'var(--color-blanc)',
      border: '1px solid var(--color-success)',
      borderLeft: '4px solid var(--color-success)',
    },
    ...opts,
  }),

  error: (msg, opts) => sonner.error(msg, {
    style: {
      ...base,
      background: 'var(--toast-bg)',
      color: 'var(--color-blanc)',
      border: '1px solid var(--color-danger)',
      borderLeft: '4px solid var(--color-danger)',
    },
    duration: 5000,
    ...opts,
  }),

  warning: (msg, opts) => sonner.warning(msg, {
    style: {
      ...base,
      background: 'var(--toast-bg)',
      color: 'var(--color-blanc)',
      border: '1px solid var(--color-warning)',
      borderLeft: '4px solid var(--color-warning)',
    },
    ...opts,
  }),

  info: (msg, opts) => sonner.info(msg, {
    style: {
      ...base,
      background: 'var(--toast-bg)',
      color: 'var(--color-blanc)',
      border: '1px solid var(--color-info)',
      borderLeft: '4px solid var(--color-info)',
    },
    ...opts,
  }),

  apiError: (err, opts) => toast.error(normalizeError(err), opts),
}
