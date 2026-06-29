import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LogOut, User, LayoutDashboard, Shield, Sun, Moon, Globe } from 'lucide-react'
import Avatar from '@/components/atoms/Avatar'
import Input from '@/components/atoms/Input'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { LANGS } from '@/lib/i18n'
import { getNavItems, getRoleLabel } from '@/constants/navigation'
import { ROLES } from '@/constants/roles'
import clsx from 'clsx'

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export default function TopBar({ title, user }) {
  const navigate = useNavigate()
  const { logout, homeRoute } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useLang()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const searchRef = useRef(null)
  const menuRef = useRef(null)
  const langRef = useRef(null)

  const navItems = useMemo(() => getNavItems(user?.role), [user?.role])

  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return navItems.slice(0, 6)
    return navItems.filter(item => normalize(item.label).includes(q))
  }, [navItems, query])

  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const goTo = (path) => {
    navigate(path)
    setQuery('')
    setSearchOpen(false)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      goTo(results[0].to)
    }
    if (e.key === 'Escape') {
      setSearchOpen(false)
      setQuery('')
    }
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-panel/80 backdrop-blur-sm">
      <div>
        <h1 className="font-display font-bold text-xl text-blanc">{title}</h1>
        <p className="text-xs text-muted mt-0.5">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Globe — sélecteur de langue */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen(o => !o)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-or transition-colors neu-sm"
            title={t('lang.label')}
            aria-label="Choisir la langue"
          >
            <Globe size={16} />
          </button>

          {langOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-44 z-50 neu-flat rounded-xl overflow-hidden border border-white/5"
              style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
            >
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-xs text-muted uppercase tracking-widest">{t('lang.label')}</p>
              </div>
              {Object.entries(LANGS).map(([code, info]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => { setLang(code); setLangOpen(false) }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    lang === code
                      ? 'text-or bg-or/5 font-semibold'
                      : 'text-blanc hover:bg-white/5'
                  )}
                >
                  <span className="text-base">{info.flag}</span>
                  <span>{info.label}</span>
                  {lang === code && <span className="ml-auto text-or text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-or transition-colors neu-sm"
          title={theme === 'dark' ? t('ui.theme.light') : t('ui.theme.dark')}
        >
          {theme === 'dark'
            ? <Sun size={16} />
            : <Moon size={16} />
          }
        </button>

        <div ref={searchRef} className="hidden md:block w-60 relative">
          <Input
            placeholder={t('label.search')}
            icon={Search}
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchOpen && results.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 z-50 neu-flat rounded-xl overflow-hidden border border-white/5"
              style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
            >
              {results.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => goTo(item.to)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-blanc hover:bg-white/5 transition-colors"
                  >
                    <Icon size={16} className="text-or flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          )}
          {searchOpen && query && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 neu-flat rounded-xl px-4 py-3 text-sm text-muted">
              {t('label.no_result')}
            </div>
          )}
        </div>

        {user && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="rounded-xl transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-or/40"
              aria-label="Menu utilisateur"
            >
              <Avatar name={user.name} size="md" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 z-50 neu-flat rounded-xl overflow-hidden border border-white/5"
                style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
              >
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="font-semibold text-blanc truncate">{user.name}</p>
                  <p className="text-xs text-muted truncate">{getRoleLabel(user.role)}</p>
                  <p className="text-xs text-muted truncate mt-0.5">{user.telephone}</p>
                  {user.mfa_enabled && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-success">
                      <Shield size={12} /> MFA activé
                    </span>
                  )}
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); navigate(homeRoute) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blanc hover:bg-white/5"
                  >
                    <LayoutDashboard size={16} className="text-muted" />
                    Tableau de bord
                  </button>

                  {user.role === ROLES.CLIENT && (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); navigate('/profile') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blanc hover:bg-white/5"
                    >
                      <User size={16} className="text-muted" />
                      Mon profil & KYC
                    </button>
                  )}
                </div>

                <div className="border-t border-white/5 py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm',
                      'text-danger hover:bg-danger/10 transition-colors'
                    )}
                  >
                    <LogOut size={16} />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
