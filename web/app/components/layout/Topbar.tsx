'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '../../contexts/AuthContext'
import { fetchAlerts, fetchAlertStats, acknowledgeAllAlerts, AlertItem, AlertStats } from '../../lib/api'

interface TopbarProps {
  locale: string
  mode: 'paper' | 'live'
}

const NAV_ITEMS = [
  { key: 'overview', href: '' },
  { key: 'traders', href: '/traders' },
  { key: 'strategies', href: '/strategies' },
  { key: 'logs', href: '/logs' },
  { key: 'alerts', href: '/alerts' },
  { key: 'settings', href: '/settings' },
]

function formatTimeAgo(dateStr: string, t: (key: string, values?: { count: number }) => string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return t('justNow')
  if (diffMins < 60) return t('minutesAgo', { count: diffMins })
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return t('hoursAgo', { count: diffHours })
  return date.toLocaleDateString()
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-danger text-white'
    case 'warning': return 'bg-warning text-surface-700'
    case 'info': return 'bg-info text-white'
    default: return 'bg-white/20 text-white'
  }
}

export default function Topbar({ locale, mode }: TopbarProps) {
  const t = useTranslations('topbar')
  const tNav = useTranslations('nav')
  const tAuth = useTranslations('auth')
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [langOpen, setLangOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null)

  const langRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const [alertsData, statsData] = await Promise.all([
          fetchAlerts({ acknowledged: false, limit: 5 }),
          fetchAlertStats()
        ])
        setAlerts(alertsData)
        setAlertStats(statsData)
      } catch {
        // ignore
      }
    }
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const results: { type: string; label: string; href: string }[] = []

    NAV_ITEMS.forEach(item => {
      const label = tNav(item.key)
      if (label.toLowerCase().includes(q)) {
        results.push({ type: 'nav', label, href: `/${locale}${item.href}` })
      }
    })

    return results.slice(0, 8)
  }, [searchQuery, locale, tNav])

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
      ? pathname.replace(`/${locale}`, `/${newLocale}`)
      : `/${newLocale}`
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    router.push(newPath)
    setLangOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push(`/${locale}/login`)
  }

  const handleMarkAllRead = async () => {
    try {
      await acknowledgeAllAlerts()
      setAlerts([])
      setAlertStats(prev => prev ? { ...prev, unacknowledged: 0 } : null)
    } catch {
      // ignore
    }
  }

  const handleSearchSelect = (href: string) => {
    router.push(href)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const unreadCount = alertStats?.unacknowledged || 0

  return (
    <header className="h-14 bg-surface-700/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Mode Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm ${
          mode === 'paper'
            ? 'bg-warning/20 text-warning border border-warning/30'
            : 'bg-danger/20 text-danger border border-danger/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${mode === 'paper' ? 'bg-warning' : 'bg-danger animate-pulse'}`} />
          {mode === 'paper' ? t('paper') : t('live')}
        </div>

        {/* Search Bar */}
        <div ref={searchRef} className="relative">
          <div
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface-300/50 border border-white/5 rounded-lg w-64 cursor-text"
            onClick={() => {
              setSearchOpen(true)
              setTimeout(() => searchInputRef.current?.focus(), 100)
            }}
          >
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search')}
              className="bg-transparent border-none outline-none text-sm text-white/70 placeholder:text-white/30 w-full"
              onFocus={() => setSearchOpen(true)}
            />
            <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] text-white/30 bg-surface-50 rounded border border-white/10">
              /
            </kbd>
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 mt-2 w-80 glass-card rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-xs text-white/40">{t('searchResults')}</span>
              </div>
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-white/40 text-sm">
                  {t('noSearchResults')}
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchSelect(result.href)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      <div>
                        <span className="text-sm text-white">{result.label}</span>
                        <span className="text-xs text-white/30 ml-2">{t('goTo')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 glass-card rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-medium text-white">{t('notifications')}</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {t('markAllRead')}
                  </button>
                )}
              </div>

              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <svg className="w-10 h-10 text-white/20 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <p className="text-white/40 text-sm">{t('noNotifications')}</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{alert.title}</p>
                          <p className="text-xs text-white/40 truncate">{alert.message}</p>
                          <p className="text-xs text-white/30 mt-1">{formatTimeAgo(alert.created_at, t)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-4 py-2 border-t border-white/5">
                <Link
                  href={`/${locale}/alerts`}
                  onClick={() => setNotifOpen(false)}
                  className="block text-center text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {t('viewAllAlerts')}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* Language Switch */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-2 px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <span className="text-sm font-medium uppercase">{locale}</span>
            <svg className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-2 w-36 glass-card rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in">
              <button
                onClick={() => switchLocale('zh')}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors ${locale === 'zh' ? 'text-primary' : 'text-white/70'}`}
              >
                <span>🇨🇳</span>
                <span>中文</span>
                {locale === 'zh' && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => switchLocale('en')}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors ${locale === 'en' ? 'text-primary' : 'text-white/70'}`}
              >
                <span>🇺🇸</span>
                <span>English</span>
                {locale === 'en' && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* User Menu */}
        {user && (
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold shadow-glow">
                {user.username[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-white">{user.username}</p>
                <p className="text-[10px] text-white/40">{t('trader')}</p>
              </div>
              <svg className={`w-3 h-3 text-white/40 transition-transform ${userOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userOpen && (
              <div className="absolute right-0 mt-2 w-48 glass-card rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-medium text-white">{user.username}</p>
                  <p className="text-xs text-white/40">{t('trader')}</p>
                </div>
                <Link
                  href={`/${locale}/settings`}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setUserOpen(false)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('profile')}
                </Link>
                <div className="border-t border-white/5">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    {tAuth('logout')}
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
