import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import Logo from '@/components/atoms/Logo'
import Avatar from '@/components/atoms/Avatar'
import NavItem from '@/components/molecules/NavItem'
import clsx from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LangContext'
import { getNavItems, getRoleLabel } from '@/constants/navigation'
import { ROLES } from '@/constants/roles'

export default function Sidebar({ user }) {
  const [collapsed, setCollapsed] = useState(false)
  const { logout } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()

  const navItems = getNavItems(user?.role)
  const showSettings = user?.role === ROLES.ADMIN

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-panel transition-all duration-300',
        'border-r border-white/5',
        collapsed ? 'w-20' : 'w-64'
      )}
      style={{ boxShadow: '4px 0 20px rgba(0,0,0,0.4)' }}
    >
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        {!collapsed && <Logo size="sm" />}
        {collapsed && (
          <div className="mx-auto w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg, #1e1e1e, #121212)', boxShadow: '3px 3px 8px #050505, -3px -3px 8px #232323' }}
          >
            <span className="font-display font-bold text-or text-sm">S</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(p => !p)}
          className={clsx(
            'w-7 h-7 rounded-lg flex items-center justify-center',
            'text-muted hover:text-or transition-colors',
            'shadow-neu-sm bg-panel',
            collapsed && 'hidden'
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
        {navItems.map(item => (
          <NavItem key={item.to} {...item} label={t(item.key) || item.label} collapsed={collapsed} />
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 flex flex-col gap-2">
        {showSettings && (
          <NavItem to="/admin/settings" icon={Settings} label="Paramètres" collapsed={collapsed} />
        )}

        {user && (
          <div className={clsx('flex items-center gap-3 px-2 py-3 rounded-xl mt-1', 'neu-sm')}>
            <Avatar name={user.name} size="sm" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blanc truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">{getRoleLabel(user.role)}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="text-muted hover:text-danger transition-colors"
                title={t('action.logout')}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 flex gap-3 justify-center">
          <Link to="/privacy" className="text-[10px] text-muted hover:text-or transition-colors">{t('ui.privacy')}</Link>
          <span className="text-muted text-[10px]">·</span>
          <Link to="/terms" className="text-[10px] text-muted hover:text-or transition-colors">{t('ui.terms')}</Link>
        </div>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mb-4 w-8 h-8 rounded-lg flex items-center justify-center
                     text-muted hover:text-or shadow-neu-sm bg-panel transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </aside>
  )
}
