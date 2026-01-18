'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const { locale } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError(t('usernameRequired'))
      return
    }
    if (!password) {
      setError(t('passwordRequired'))
      return
    }

    setLoading(true)
    try {
      await login(username.trim(), password)
      const rawRedirect = searchParams.get('redirect') || ''
      let redirect = `/${locale}`
      if (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) {
        try {
          const url = new URL(rawRedirect, window.location.origin)
          if (url.origin === window.location.origin) {
            redirect = rawRedirect
          }
        } catch {
          // Invalid URL, use default
        }
      }
      router.push(redirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-700 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-600 shadow-glow mb-4">
            <svg className="w-9 h-9 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-wide">{t('loginTitle')}</h1>
          <p className="text-white/40 mt-2">Welcome back to AI Crypto Trader</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
          {error && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="label">{t('username')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field pl-12"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="label">{t('password')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-12"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                {t('login')}
              </>
            )}
          </button>

          <div className="divider" />

          <div className="text-center text-sm text-white/50">
            {t('noAccount')}{' '}
            <Link href={`/${locale}/register`} className="text-primary hover:text-primary-400 font-medium transition">
              {t('register')}
            </Link>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-6">
          Secure trading platform powered by AI
        </p>
      </div>
    </div>
  )
}
