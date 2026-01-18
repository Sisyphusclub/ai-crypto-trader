'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../../components/layout'
import { useAuth } from '../../../contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ExchangeAccount {
  id: string
  exchange: string
  label: string
  api_key_masked: string
  is_testnet: boolean
  created_at: string
}

export default function ExchangesPage() {
  const t = useTranslations('settings.exchanges')
  const tCommon = useTranslations('common')
  const { locale } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshOnboarding } = useAuth()
  const fromOnboarding = searchParams.get('from') === 'onboarding'

  const [accounts, setAccounts] = useState<ExchangeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [exchange, setExchange] = useState('binance')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [isTestnet, setIsTestnet] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/exchanges`, { credentials: 'include' })
      if (res.ok) setAccounts(await res.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/exchanges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchange, label, api_key: apiKey, api_secret: apiSecret, is_testnet: isTestnet }),
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to create')
      }
      await loadAccounts()
      await refreshOnboarding()
      setShowForm(false)
      setLabel('')
      setApiKey('')
      setApiSecret('')

      if (fromOnboarding) {
        const step = searchParams.get('step')
        router.push(`/${locale}/onboarding?step=${step ? parseInt(step) + 1 : 2}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-gray-400 text-sm">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            {t('add')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400">{tCommon('loading')}</div>
        ) : accounts.length === 0 && !showForm ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">No exchange accounts configured</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              {t('add')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{acc.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                      {acc.exchange.toUpperCase()}
                    </span>
                    {acc.is_testnet && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/50 text-yellow-400">
                        TESTNET
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm font-mono mt-1">{acc.api_key_masked}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">{t('add')}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Exchange</label>
                  <select
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="binance">Binance</option>
                    <option value="gate">Gate.io</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="My Binance Account"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">API Secret</label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="testnet"
                    checked={isTestnet}
                    onChange={(e) => setIsTestnet(e.target.checked)}
                    className="rounded bg-gray-800 border-gray-700"
                  />
                  <label htmlFor="testnet" className="text-sm text-gray-300">Testnet</label>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition"
                  >
                    {saving ? tCommon('loading') : tCommon('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
