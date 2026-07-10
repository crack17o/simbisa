import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Smartphone, X, Download } from 'lucide-react'

export default function DownloadAppFab() {
  const [expanded, setExpanded] = useState(false)
  const { pathname } = useLocation()

  if (!['/login', '/register'].includes(pathname)) return null

  const fab = (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
      {expanded && (
        <div
          style={{
            background: 'var(--color-panel)',
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.1)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '256px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--color-blanc)' }}>
              Application mobile
            </span>
            <button
              onClick={() => setExpanded(false)}
              style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 0 }}
            >
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>
            Accédez à Simbisa depuis votre téléphone Android — scoring, crédits et Mobile Money en un seul endroit.
          </p>
          <a
            href="/simbisa.apk"
            download="Simbisa.apk"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(240,192,64,0.1))',
              border: '1px solid rgba(212,175,55,0.4)',
              color: '#D4AF37',
            }}
          >
            <Download size={15} />
            Télécharger l'APK
          </a>
          <p style={{ fontSize: '10px', color: 'var(--color-muted)', textAlign: 'center', margin: 0 }}>
            Android 5.0+ · 53 Mo
          </p>
        </div>
      )}

      <button
        onClick={() => setExpanded(o => !o)}
        aria-label="Télécharger l'application mobile"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: '16px',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          border: 'none',
          background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
          color: '#0A0A0A',
          boxShadow: '0 4px 20px rgba(212,175,55,0.35), 0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <Smartphone size={16} />
        <span>Télécharger l'app</span>
      </button>
    </div>
  )

  return createPortal(fab, document.body)
}
