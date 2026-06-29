import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Home, LogIn, RefreshCw, AlertTriangle, ShieldOff, ServerCrash, Search } from 'lucide-react'

const ERROR_CONFIG = {
  404: {
    icon: Search,
    color: '#60A5FA',
    glow: 'rgba(96,165,250,0.2)',
    badge: 'bg-info/10 text-info border-info/30',
    title: 'Page introuvable',
    message: 'La page que vous cherchez n\'existe pas ou a été déplacée.',
    tip: 'Vérifiez l\'URL ou utilisez le menu de navigation.',
  },
  403: {
    icon: ShieldOff,
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.2)',
    badge: 'bg-warning/10 text-warning border-warning/30',
    title: 'Accès refusé',
    message: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
    tip: 'Contactez votre administrateur si vous pensez qu\'il s\'agit d\'une erreur.',
  },
  500: {
    icon: ServerCrash,
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.2)',
    badge: 'bg-danger/10 text-danger border-danger/30',
    title: 'Erreur serveur',
    message: 'Une erreur est survenue de notre côté. Nos équipes en sont informées.',
    tip: 'Réessayez dans quelques instants.',
  },
  default: {
    icon: AlertTriangle,
    color: '#D4AF37',
    glow: 'rgba(212,175,55,0.2)',
    badge: 'bg-or/10 text-or border-or/30',
    title: 'Quelque chose s\'est mal passé',
    message: 'Une erreur inattendue est survenue.',
    tip: 'Réessayez ou retournez à l\'accueil.',
  },
}

export default function ErrorPage({ code, title: titleProp, message: messageProp }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [visible, setVisible] = useState(false)

  const errorCode = code || location.state?.code || 404
  const cfg = ERROR_CONFIG[errorCode] || ERROR_CONFIG.default
  const Icon = cfg.icon

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-surface px-4 overflow-hidden relative"
      style={{ transition: 'opacity 0.4s ease', opacity: visible ? 1 : 0 }}
    >
      {/* Blob décoratif animé */}
      <div
        className="absolute w-96 h-96 rounded-full pointer-events-none animate-blob"
        style={{
          background: cfg.glow,
          filter: 'blur(80px)',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 0,
        }}
      />

      <div
        className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
        style={{
          animation: visible ? 'fadeInUp 0.5s ease both' : 'none',
        }}
      >
        {/* Badge code erreur */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold mb-6 ${cfg.badge}`}
          style={{ animation: 'fadeInScale 0.4s 0.1s ease both', opacity: 0, animationFillMode: 'both' }}
        >
          Erreur {errorCode}
        </div>

        {/* Icône animée */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 animate-float"
          style={{
            background: `radial-gradient(circle, ${cfg.glow}, transparent 70%)`,
            border: `2px solid ${cfg.color}30`,
            boxShadow: `0 0 40px ${cfg.glow}`,
          }}
        >
          <Icon size={40} style={{ color: cfg.color }} />
        </div>

        {/* Titre */}
        <h1
          className="font-display font-bold text-3xl text-blanc mb-3"
          style={{ animation: 'fadeInUp 0.5s 0.15s ease both', opacity: 0, animationFillMode: 'both' }}
        >
          {titleProp || cfg.title}
        </h1>

        {/* Message */}
        <p
          className="text-muted text-base leading-relaxed mb-2"
          style={{ animation: 'fadeInUp 0.5s 0.25s ease both', opacity: 0, animationFillMode: 'both' }}
        >
          {messageProp || cfg.message}
        </p>

        {/* Tip */}
        <p
          className="text-muted/60 text-sm mb-10"
          style={{ animation: 'fadeInUp 0.5s 0.3s ease both', opacity: 0, animationFillMode: 'both' }}
        >
          {cfg.tip}
        </p>

        {/* Boutons */}
        <div
          className="flex flex-col sm:flex-row gap-3 w-full justify-center"
          style={{ animation: 'fadeInUp 0.5s 0.38s ease both', opacity: 0, animationFillMode: 'both' }}
        >
          {isAuthenticated ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium
                         border border-white/10 text-muted hover:text-blanc hover:border-white/20 transition-all"
            >
              <RefreshCw size={15} />
              Réessayer
            </button>
          ) : null}

          <button
            onClick={() => navigate(isAuthenticated ? '/' : '/login')}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                       text-noir transition-all hover:opacity-90 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}
          >
            {isAuthenticated
              ? <><Home size={15} /> Retour à l'accueil</>
              : <><LogIn size={15} /> Se connecter</>
            }
          </button>
        </div>

        {/* Code petit en bas */}
        <p
          className="mt-12 text-xs text-muted/30 font-mono"
          style={{ animation: 'fadeInUp 0.5s 0.5s ease both', opacity: 0, animationFillMode: 'both' }}
        >
          HTTP {errorCode} · Simbisa Rawbank
        </p>
      </div>
    </div>
  )
}
