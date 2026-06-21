/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        noir:    '#0A0A0A',
        surface: '#141414',
        panel:   '#1A1A1A',
        or:      '#D4AF37',
        'or-light': '#F0C040',
        'or-dark':  '#A8861F',
        blanc:   '#F5F5F5',
        muted:   '#9CA3AF',
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
      boxShadow: {
        'neu':         '6px 6px 14px #050505, -6px -6px 14px #232323',
        'neu-inset':   'inset 4px 4px 10px #050505, inset -4px -4px 10px #232323',
        'neu-sm':      '3px 3px 8px #050505, -3px -3px 8px #232323',
        'neu-gold':    '0 0 16px rgba(212,175,55,0.35)',
        'neu-pressed': 'inset 2px 2px 6px #050505, inset -2px -2px 6px #232323',
      },
      borderRadius: {
        'xl2': '1.25rem',
        'xl3': '1.75rem',
      }
    },
  },
  plugins: [],
}
