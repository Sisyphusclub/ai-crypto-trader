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
      <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />

      {/* Gradient orbs for visual depth */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

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
