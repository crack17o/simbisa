import React from 'react'
import Logo from '@/components/atoms/Logo'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface flex">
      <div
        className="hidden lg:flex flex-col justify-between w-2/5 p-12"
        style={{
          background: 'linear-gradient(160deg, var(--color-noir) 0%, var(--color-panel) 100%)',
          borderRight: '1px solid rgba(212,175,55,0.15)',
        }}
      >
        <Logo size="lg" />
        <div className="flex flex-col gap-4">
          <h2 className="text-4xl font-display font-bold text-blanc leading-tight">
            Au-delà d&apos;un simple<br />
            <span className="text-gradient-gold">accès au crédit.</span>
          </h2>
          <p className="text-muted text-base max-w-xs leading-relaxed">
            Votre historique Mobile Money devient votre garantie. Conçu pour Kinshasa, pensé pour tous.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { v: 'Rapidité',  l: 'Décision en moins de 3 secondes' },
            { v: 'Respect',   l: 'Confidentialité et transparence' },
            { v: 'Rigueur',   l: 'Scoring à 4 moteurs certifiés' },
          ].map(s => (
            <div key={s.v} className="neu-flat p-4 text-center">
              <p className="text-gradient-gold font-display font-bold text-xl">{s.v}</p>
              <p className="text-xs text-muted mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
