import React from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

export default function NavItem({ to, icon: Icon, label, collapsed = false, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
          'group relative overflow-hidden',
          isActive
            ? 'shadow-neu-pressed text-or-light'
            : 'text-muted hover:text-blanc',
          isActive
            ? 'bg-surface'
            : 'hover:bg-panel/60'
        )
      }
      style={({ isActive }) => isActive
        ? { boxShadow: 'inset 2px 2px 6px #050505, inset -2px -2px 6px #232323, 0 0 12px rgba(212,175,55,0.15)' }
        : {}
      }
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div
              className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
              style={{ background: 'linear-gradient(180deg, #F0C040, #D4AF37)' }}
            />
          )}
          <div className="relative shrink-0">
            <Icon
              size={18}
              style={isActive ? { color: '#D4AF37', filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.5))' } : {}}
            />
            {badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full
                               bg-danger text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          {!collapsed && (
            <span className="text-sm font-medium truncate flex-1">{label}</span>
          )}
          {!collapsed && badge > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-danger/20 text-danger
                             text-[10px] font-semibold flex items-center justify-center">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
