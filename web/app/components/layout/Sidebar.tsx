'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface NavItem {
  key: string
  href: string
  icon: React.ReactNode
  children?: { key: string; href: string }[]
}

const Icons = {
  overview: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  ),
  trading: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  signals: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  strategies: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  traders: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  ),
  logs: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  alerts: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  replay: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
}

const navItems: NavItem[] = [
  { key: 'overview', href: '', icon: Icons.overview },
  { key: 'trading', href: '/dashboard', icon: Icons.trading, children: [
    { key: 'positions', href: '/dashboard#positions' },
    { key: 'orders', href: '/dashboard#orders' },
  ]},
  { key: 'signals', href: '/signals', icon: Icons.signals },
  { key: 'strategies', href: '/strategies', icon: Icons.strategies },
  { key: 'traders', href: '/traders', icon: Icons.traders },
  { key: 'logs', href: '/logs', icon: Icons.logs, children: [
    { key: 'decisions', href: '/logs?tab=decisions' },
    { key: 'executions', href: '/logs?tab=executions' },
  ]},
  { key: 'alerts', href: '/alerts', icon: Icons.alerts },
  { key: 'replay', href: '/replay', icon: Icons.replay },
  { key: 'settings', href: '/settings', icon: Icons.settings, children: [
    { key: 'exchanges', href: '/settings/exchanges' },
    { key: 'models', href: '/settings/models' },
  ]},
]

export default function Sidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [hash, setHash] = useState('')

  // 监听 hash 变化
  useEffect(() => {
    const updateHash = () => setHash(window.location.hash)
    updateHash()
    window.addEventListener('hashchange', updateHash)
    return () => window.removeEventListener('hashchange', updateHash)
  }, [pathname])

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    navItems.forEach(item => {
      if (item.children) {
        const fullPath = `/${locale}${item.href}`
        if (pathname === fullPath || (item.href && pathname.startsWith(fullPath))) {
          initial.add(item.key)
        }
      }
    })
    return initial
  })

  const toggleExpand = useCallback((key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const isActive = useCallback((href: string) => {
    const fullPath = `/${locale}${href}`
    return pathname === fullPath || (href && pathname.startsWith(fullPath))
  }, [locale, pathname])

  return (
    <aside className="w-64 bg-surface-700/80 border-r border-white/5 min-h-screen flex flex-col">
      <div className="p-5 border-b border-white/5">
        <Link href={`/${locale}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-glow group-hover:shadow-lg transition-shadow">
            <svg className="w-6 h-6 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white tracking-wide">ACT</span>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">AI Crypto Trader</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const expanded = expandedItems.has(item.key)
          const hasChildren = !!item.children

          return (
            <div key={item.key}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={active ? 'text-primary' : ''}>{item.icon}</span>
                  <span className="font-medium text-sm">{t(item.key)}</span>
                  <svg
                    className={`w-4 h-4 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ) : (
                <Link
                  href={`/${locale}${item.href}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={active ? 'text-primary' : ''}>{item.icon}</span>
                  <span className="font-medium text-sm">{t(item.key)}</span>
                </Link>
              )}
              {hasChildren && expanded && (
                <div className="ml-6 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                  {item.children!.map((child) => {
                    // 计算子菜单是否激活
                    let childActive = false
                    const basePath = child.href.split('?')[0].split('#')[0]
                    const childHashPart = child.href.includes('#') ? '#' + child.href.split('#')[1] : ''
                    const childQueryPart = child.href.includes('?') ? child.href.split('?')[1].split('#')[0] : ''

                    if (pathname === `/${locale}${basePath}`) {
                      if (childHashPart && hash === childHashPart) {
                        childActive = true
                      } else if (childQueryPart && searchParams.get('tab') === childQueryPart.split('=')[1]) {
                        childActive = true
                      } else if (!childHashPart && !childQueryPart) {
                        childActive = true
                      }
                    }
                    return (
                      <Link
                        key={child.key}
                        href={`/${locale}${child.href}`}
                        className={`block px-3 py-1.5 text-sm rounded transition-colors ${
                          childActive
                            ? 'text-primary bg-primary/5'
                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                        }`}
                      >
                        {t(child.key)}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="bg-surface-600/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-white/60">System Status</span>
          </div>
          <p className="text-[10px] text-white/40">All systems operational</p>
        </div>
      </div>
    </aside>
  )
}
