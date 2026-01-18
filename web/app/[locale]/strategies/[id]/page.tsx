'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../../components/layout'
import { Strategy } from '../../../types/strategy'
import { fetchStrategy, toggleStrategy, validateStrategy } from '../../../lib/api'

export default function StrategyDetailPage() {
  const t = useTranslations('strategies')
  const tCommon = useTranslations('common')
  const { locale, id } = useParams()
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null)

  const loadStrategy = async () => {
    try {
      setLoading(true)
      const data = await fetchStrategy(id as string)
      setStrategy(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStrategy()
  }, [id])

  const handleToggle = async () => {
    if (!strategy) return
    try {
      await toggleStrategy(strategy.id)
      await loadStrategy()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed')
    }
  }

  const handleValidate = async () => {
    if (!strategy) return
    try {
      const result = await validateStrategy(strategy.id)
      setValidation(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    }
  }

  if (loading) {
    return (
      <AppLayout locale={locale as string} mode="paper">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (error || !strategy) {
    return (
      <AppLayout locale={locale as string} mode="paper">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white/60 mb-4">{error || t('strategyNotFound')}</p>
            <Link href={`/${locale}/strategies`} className="btn-primary">
              {tCommon('back')}
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/strategies`}
              className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold text-white">{strategy.name}</h1>
                <span className={strategy.enabled ? 'badge-success' : 'badge-warning'}>
                  {strategy.enabled ? t('enabled') : t('disabled')}
                </span>
              </div>
              <p className="text-white/40 text-sm">
                {t('createdAt')} {new Date(strategy.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleValidate} className="btn-ghost">
              {t('validate')}
            </button>
            <button onClick={handleToggle} className={strategy.enabled ? 'btn-ghost' : 'btn-primary'}>
              {strategy.enabled ? t('disable') : t('enable')}
            </button>
            <Link href={`/${locale}/strategies/${id}/edit`} className="btn-primary">
              {tCommon('edit')}
            </Link>
          </div>
        </div>

        {/* Validation Results */}
        {validation && (
          <div className={`glass-card p-4 border ${validation.valid ? 'border-success/30' : 'border-danger/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {validation.valid ? (
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`font-medium ${validation.valid ? 'text-success' : 'text-danger'}`}>
                {validation.valid ? t('strategyValid') : t('validationFailed')}
              </span>
            </div>
            {validation.errors.length > 0 && (
              <ul className="text-danger text-sm space-y-1">
                {validation.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
            {validation.warnings.length > 0 && (
              <ul className="text-warning text-sm space-y-1 mt-2">
                {validation.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-white/40 text-xs mb-1">{t('symbols')}</p>
            <p className="text-white font-medium">{strategy.symbols.join(', ')}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-white/40 text-xs mb-1">{t('timeframe')}</p>
            <p className="text-white font-medium">{strategy.timeframe}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-white/40 text-xs mb-1">{t('cooldown')}</p>
            <p className="text-white font-medium">{strategy.cooldown_seconds}s</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-white/40 text-xs mb-1">{t('exchanges')}</p>
            <p className="text-white font-medium">{strategy.exchange_scope.join(', ')}</p>
          </div>
        </div>

        {/* Indicators */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            {t('indicators')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {strategy.indicators_json.indicators.map((ind, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <span className="text-accent font-mono text-sm">{ind.name}</span>
                <span className="text-white/40 mx-2">•</span>
                <span className="text-white/60 text-sm">{ind.type}({ind.period})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trigger Rules */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {t('triggerRules')}
          </h2>
          <div className="space-y-3">
            {strategy.triggers_json.rules.map((rule, ri) => (
              <div key={ri} className={`p-4 rounded-lg border ${rule.side === 'long' ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${rule.side === 'long' ? 'bg-success text-surface-700' : 'bg-danger text-white'}`}>
                    {rule.side.toUpperCase()}
                  </span>
                  <span className="text-white/40 text-sm">{t('whenAllMatch')}:</span>
                </div>
                <div className="space-y-1 ml-4">
                  {rule.conditions.map((cond, ci) => (
                    <div key={ci} className="text-white/60 text-sm font-mono">
                      {cond.indicator} {cond.operator} {cond.compare_to || cond.value}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Management */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            {t('riskManagement')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-white/40 text-xs mb-1">{t('maxLeverage')}</p>
              <p className="text-white font-mono">{strategy.risk_json.max_leverage}x</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-white/40 text-xs mb-1">{t('cooldown')}</p>
              <p className="text-white font-mono">{strategy.risk_json.cooldown_seconds}s</p>
            </div>
            {strategy.risk_json.tp_atr_multiplier && (
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-white/40 text-xs mb-1">{t('tpAtrMulti')}</p>
                <p className="text-white font-mono">{strategy.risk_json.tp_atr_multiplier}x</p>
              </div>
            )}
            {strategy.risk_json.sl_atr_multiplier && (
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-white/40 text-xs mb-1">{t('slAtrMulti')}</p>
                <p className="text-white font-mono">{strategy.risk_json.sl_atr_multiplier}x</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <Link
            href={`/${locale}/traders/new?strategy=${id}`}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('createTrader')}
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
