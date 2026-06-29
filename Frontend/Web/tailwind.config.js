/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        noir:       'var(--color-noir)',
        surface:    'var(--color-surface)',
        panel:      'var(--color-panel)',
        or:         'var(--color-or)',
        'or-light': 'var(--color-or-light)',
        'or-dark':  'var(--color-or-dark)',
        blanc:      'var(--color-blanc)',
        muted:      'var(--color-muted)',
        success:    'var(--color-success)',
        warning:    'var(--color-warning)',
        danger:     'var(--color-danger)',
        info:       'var(--color-info)',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
      boxShadow: {
        'neu':         '6px 6px 14px var(--shadow-dark), -6px -6px 14px var(--shadow-light)',
        'neu-inset':   'inset 4px 4px 10px var(--shadow-dark), inset -4px -4px 10px var(--shadow-light)',
        'neu-sm':      '3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)',
        'neu-gold':    '0 0 16px rgba(212,175,55,0.35)',
        'neu-pressed': 'inset 2px 2px 6px var(--shadow-dark), inset -2px -2px 6px var(--shadow-light)',
      },
      borderRadius: {
        'xl2': '1.25rem',
        'xl3': '1.75rem',
      },
      animation: {
        'fade-in-up':    'fadeInUp 0.5s ease both',
        'fade-in-scale': 'fadeInScale 0.4s ease both',
        'slide-right':   'slideInRight 0.4s ease both',
        'float':         'float 4s ease-in-out infinite',
        'spin-slow':     'spin-slow 8s linear infinite',
        'blob':          'blob 8s ease-in-out infinite',
        'pulse-gold':    'pulse-gold 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
