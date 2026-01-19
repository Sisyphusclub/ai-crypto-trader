'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface AppLayoutProps {
  children: ReactNode
  locale: string
  mode?: 'paper' | 'live'
}

export default function AppLayout({ children, locale, mode = 'paper' }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-surface-700">
      {/* Grid background pattern */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Layout */}
      <Sidebar locale={locale} />
      <div className="flex-1 flex flex-col relative">
        <Topbar locale={locale} mode={mode} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
