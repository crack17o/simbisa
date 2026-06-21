import React from 'react'
import Sidebar from '@/components/organisms/Sidebar'
import TopBar from '@/components/organisms/TopBar'
import { useAuth } from '@/context/AuthContext'

export default function DashboardLayout({ children, title }) {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={title} user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
