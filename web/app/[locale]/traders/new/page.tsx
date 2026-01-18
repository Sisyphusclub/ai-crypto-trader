'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../../components/layout'
import { createTrader, fetchExchangeAccounts, fetchModelConfigs, fetchStrategies } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'
import { TraderCreate, ExchangeAccount, ModelConfig } from '../../../types/trader'
import { Strategy } from '../../../types/strategy'

export default function NewTraderPage() {
  const t = useTranslations('traders')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { locale } = useParams()
  const searchParams = useSearchParams()
  const { refreshOnboarding } = useAuth()

  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [exchanges, setExchanges] = useState<ExchangeAccount[]>([])
  const [models, setModels] = useState<ModelConfig[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])

  const [name, setName] = useState('')
  const [exchangeAccountId, setExchangeAccountId] = useState('')
  const [modelConfigId, setModelConfigId] = useState('')
  const [strategyId, setStrategyId] = useState(searchParams.get('strategy') || '')
  const [mode, setMode] = useState<'paper' | 'live'>('paper')
  const [maxConcurrentPositions, setMaxConcurrentPositions] = useState(3)
  const [dailyLossCap, setDailyLossCap] = useState<number | undefined>(undefined)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ex, mod, strat] = await Promise.all([
          fetchExchangeAccounts(),
          fetchModelConfigs(),
          fetchStrategies(),
        ])
        setExchanges(ex)
        setModels(mod)
        setStrategies(strat)

        if (ex.length > 0) setExchangeAccountId(ex[0].id)
        if (mod.length > 0) setModelConfigId(mod[0].id)
        if (!strategyId && strat.length > 0) setStrategyId(strat[0].id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load resources')
      } finally {
        setDataLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload: TraderCreate = {
        name,
        exchange_account_id: exchangeAccountId,
        model_config_id: modelConfigId,
        strategy_id: strategyId,
        mode,
        max_concurrent_positions: maxConcurrentPositions,
        daily_loss_cap: dailyLossCap,
      }

      await createTrader(payload)
      refreshOnboarding()
      router.push(`/${locale}/traders`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create trader')
    } finally {
      setLoading(false)
    }
  }

  const selectedStrategy = strategies.find((s) => s.id === strategyId)

  if (dataLoading) {
    return (
      <AppLayout locale={locale as string} mode="paper">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  const missingResources = exchanges.length === 0 || models.length === 0 || strategies.length === 0

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/${locale}/traders`}
            className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{t('newTrader')}</h1>
            <p className="text-white/40 text-sm">{t('configureSubtitle')}</p>
          </div>
        </div>

        {/* Missing Resources Warning */}
        {missingResources && (
          <div className="glass-card p-6 mb-6 border border-warning/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">{t('missingResources')}</h3>
                <p className="text-white/60 text-sm mb-4">
                  {t('missingResourcesDesc')}
                </p>
                <div className="space-y-2">
                  {exchanges.length === 0 && (
                    <Link href={`/${locale}/settings/exchanges`} className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {t('addExchange')}
                    </Link>
                  )}
                  {models.length === 0 && (
                    <Link href={`/${locale}/settings/models`} className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {t('addModel')}
                    </Link>
                  )}
                  {strategies.length === 0 && (
                    <Link href={`/${locale}/strategies/new`} className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {t('createStrategy')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger flex items-center gap-3 mb-6">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!missingResources && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                {t('traderDetails')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">{t('name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field w-full"
                    placeholder="My AI Trader"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">{t('mode')}</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('paper')}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition border ${
                        mode === 'paper'
                          ? 'bg-primary text-surface-700 border-primary'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      {t('paperTrading')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('live')}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition border ${
                        mode === 'live'
                          ? 'bg-danger text-white border-danger'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      {t('liveTrading')}
                    </button>
                  </div>
                  {mode === 'live' && (
                    <p className="text-danger text-xs mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                      {t('liveWarning')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                {t('resources')}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">{t('exchange')}</label>
                  <select
                    value={exchangeAccountId}
                    onChange={(e) => setExchangeAccountId(e.target.value)}
                    className="input-field w-full"
                    required
                  >
                    {exchanges.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.label} ({ex.exchange}{ex.is_testnet ? ' - Testnet' : ''})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">{t('model')}</label>
                  <select
                    value={modelConfigId}
                    onChange={(e) => setModelConfigId(e.target.value)}
                    className="input-field w-full"
                    required
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.provider} / {m.model_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">{t('strategy')}</label>
                  <select
                    value={strategyId}
                    onChange={(e) => setStrategyId(e.target.value)}
                    className="input-field w-full"
                    required
                  >
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.symbols.slice(0, 2).join(', ')}{s.symbols.length > 2 ? '...' : ''})
                      </option>
                    ))}
                  </select>
                  {selectedStrategy && (
                    <div className="mt-2 p-3 rounded-lg bg-white/5 text-sm">
                      <div className="flex items-center gap-4 text-white/60">
                        <span>{t('timeframe')}: <span className="text-white">{selectedStrategy.timeframe}</span></span>
                        <span>{t('symbols')}: <span className="text-white">{selectedStrategy.symbols.length}</span></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Settings */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                {t('riskSettings')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">{t('maxConcurrentPositions')}</label>
                  <input
                    type="number"
                    value={maxConcurrentPositions}
                    onChange={(e) => setMaxConcurrentPositions(parseInt(e.target.value) || 1)}
                    className="input-field w-full"
                    min={1}
                    max={20}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">{t('dailyLossCap')}</label>
                  <input
                    type="number"
                    value={dailyLossCap || ''}
                    onChange={(e) => setDailyLossCap(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="input-field w-full"
                    placeholder={t('optional')}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Link href={`/${locale}/traders`} className="flex-1 py-3 px-4 text-center rounded-lg text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 font-medium transition">
                {tCommon('cancel')}
              </Link>
              <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-lg bg-primary hover:bg-primary-400 text-surface-700 font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50">
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {tCommon('create')}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
