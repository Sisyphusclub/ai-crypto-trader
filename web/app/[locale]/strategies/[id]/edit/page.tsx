'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../../../components/layout'
import { fetchStrategy, updateStrategy } from '../../../../lib/api'
import {
  Strategy,
  IndicatorConfig,
  TriggerRule,
  TriggerCondition,
  StrategyUpdate,
} from '../../../../types/strategy'

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
const INDICATOR_TYPES = ['EMA', 'RSI', 'ATR'] as const
const OPERATORS = ['<', '>', 'crosses_above', 'crosses_below'] as const

export default function EditStrategyPage() {
  const t = useTranslations('strategies')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { locale, id } = useParams()

  // Operator display labels (translated)
  const operatorLabels: Record<string, string> = {
    '<': t('operators.lt'),
    '>': t('operators.gt'),
    'crosses_above': t('operators.crossesAbove'),
    'crosses_below': t('operators.crossesBelow'),
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [symbols, setSymbols] = useState('')
  const [timeframe, setTimeframe] = useState('1h')
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([])
  const [rules, setRules] = useState<TriggerRule[]>([])
  const [maxLeverage, setMaxLeverage] = useState(5)
  const [cooldownSeconds, setCooldownSeconds] = useState(300)
  const [tpAtrMultiplier, setTpAtrMultiplier] = useState(2)
  const [slAtrMultiplier, setSlAtrMultiplier] = useState(1)

  useEffect(() => {
    const load = async () => {
      try {
        const data: Strategy = await fetchStrategy(id as string)
        setName(data.name)
        setSymbols(data.symbols.join(', '))
        setTimeframe(data.timeframe)
        setIndicators(data.indicators_json.indicators)
        setRules(data.triggers_json.rules)
        setMaxLeverage(data.risk_json.max_leverage)
        setCooldownSeconds(data.risk_json.cooldown_seconds)
        setTpAtrMultiplier(data.risk_json.tp_atr_multiplier || 2)
        setSlAtrMultiplier(data.risk_json.sl_atr_multiplier || 1)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const addIndicator = () => {
    setIndicators([...indicators, { type: 'EMA', period: 20, name: `ind_${indicators.length}` }])
  }

  const removeIndicator = (index: number) => {
    setIndicators(indicators.filter((_, i) => i !== index))
  }

  const updateIndicator = (index: number, field: keyof IndicatorConfig, value: string | number) => {
    const updated = [...indicators]
    updated[index] = { ...updated[index], [field]: value }
    setIndicators(updated)
  }

  const addRule = () => {
    setRules([...rules, { side: 'long', logic: 'AND', conditions: [{ indicator: '', operator: '>', value: 0 }] }])
  }

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, field: keyof TriggerRule, value: unknown) => {
    const updated = [...rules]
    updated[index] = { ...updated[index], [field]: value }
    setRules(updated)
  }

  const addCondition = (ruleIndex: number) => {
    const updated = [...rules]
    updated[ruleIndex].conditions.push({ indicator: '', operator: '>', value: 0 })
    setRules(updated)
  }

  const removeCondition = (ruleIndex: number, condIndex: number) => {
    const updated = [...rules]
    updated[ruleIndex].conditions = updated[ruleIndex].conditions.filter((_, i) => i !== condIndex)
    setRules(updated)
  }

  const updateCondition = (
    ruleIndex: number,
    condIndex: number,
    field: keyof TriggerCondition,
    value: string | number | undefined
  ) => {
    const updated = [...rules]
    const cond = { ...updated[ruleIndex].conditions[condIndex], [field]: value }
    if (field === 'operator' && (value === 'crosses_above' || value === 'crosses_below')) {
      delete cond.value
    } else if (field === 'operator') {
      delete cond.compare_to
    }
    updated[ruleIndex].conditions[condIndex] = cond
    setRules(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const payload: StrategyUpdate = {
        name,
        symbols: symbols.split(',').map((s) => s.trim().toUpperCase()),
        timeframe,
        indicators: { indicators },
        triggers: { rules },
        risk: {
          max_leverage: maxLeverage,
          cooldown_seconds: cooldownSeconds,
          tp_atr_multiplier: tpAtrMultiplier,
          sl_atr_multiplier: slAtrMultiplier,
        },
      }

      await updateStrategy(id as string, payload)
      router.push(`/${locale}/strategies/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update strategy')
    } finally {
      setSaving(false)
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

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/${locale}/strategies/${id}`}
            className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{tCommon('edit')} {t('title')}</h1>
            <p className="text-white/40 text-sm">{t('configureIndicators')}</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger flex items-center gap-3 mb-6">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {t('basicInfo')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">{t('name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">{t('symbols')}</label>
                <input
                  type="text"
                  value={symbols}
                  onChange={(e) => setSymbols(e.target.value)}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">{t('timeframe')}</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="input-field w-full"
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Indicators */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                {t('indicators')}
              </h2>
              <button type="button" onClick={addIndicator} className="btn-ghost text-sm">
                + {t('addIndicator')}
              </button>
            </div>
            <div className="space-y-3">
              {indicators.map((ind, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 flex-wrap">
                  <input
                    type="text"
                    value={ind.name || ''}
                    onChange={(e) => updateIndicator(i, 'name', e.target.value)}
                    className="input-field w-36"
                    placeholder={t('indicatorName')}
                  />
                  <select
                    value={ind.type}
                    onChange={(e) => updateIndicator(i, 'type', e.target.value)}
                    className="input-field w-28"
                  >
                    {INDICATOR_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-sm">{t('period')}:</span>
                    <input
                      type="number"
                      value={ind.period}
                      onChange={(e) => updateIndicator(i, 'period', parseInt(e.target.value) || 0)}
                      className="input-field w-20"
                      min={1}
                    />
                  </div>
                  <button type="button" onClick={() => removeIndicator(i)} className="ml-auto text-danger hover:text-danger/80">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger Rules */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                {t('triggerRules')}
              </h2>
              <button type="button" onClick={addRule} className="btn-ghost text-sm">
                + {t('addRule')}
              </button>
            </div>
            <div className="space-y-4">
              {rules.map((rule, ri) => (
                <div key={ri} className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <select
                        value={rule.side}
                        onChange={(e) => updateRule(ri, 'side', e.target.value)}
                        className={`input-field w-28 ${rule.side === 'long' ? 'text-success' : 'text-danger'}`}
                      >
                        <option value="long">LONG</option>
                        <option value="short">SHORT</option>
                      </select>
                      <span className="text-white/40 text-sm">{t('whenAllMatch')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => addCondition(ri)} className="text-primary text-sm">+ {t('addCondition')}</button>
                      <button type="button" onClick={() => removeRule(ri)} className="text-danger">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {rule.conditions.map((cond, ci) => (
                      <div key={ci} className="flex items-center gap-2 flex-wrap">
                        <select
                          value={cond.indicator}
                          onChange={(e) => updateCondition(ri, ci, 'indicator', e.target.value)}
                          className="input-field w-36"
                        >
                          <option value="">{t('selectIndicator')}</option>
                          {indicators.map((ind) => (
                            <option key={ind.name} value={ind.name}>{ind.name}</option>
                          ))}
                        </select>
                        <select
                          value={cond.operator}
                          onChange={(e) => updateCondition(ri, ci, 'operator', e.target.value)}
                          className="input-field w-44"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op} value={op}>{operatorLabels[op]}</option>
                          ))}
                        </select>
                        {cond.operator === 'crosses_above' || cond.operator === 'crosses_below' ? (
                          <select
                            value={cond.compare_to || ''}
                            onChange={(e) => updateCondition(ri, ci, 'compare_to', e.target.value)}
                            className="input-field w-36"
                          >
                            <option value="">{t('compareTo')}</option>
                            {indicators.map((ind) => (
                              <option key={ind.name} value={ind.name}>{ind.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={cond.value ?? ''}
                            onChange={(e) => updateCondition(ri, ci, 'value', parseFloat(e.target.value) || 0)}
                            className="input-field w-24"
                          />
                        )}
                        {rule.conditions.length > 1 && (
                          <button type="button" onClick={() => removeCondition(ri, ci)} className="text-white/40 hover:text-danger">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
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
              <div>
                <label className="block text-sm text-white/60 mb-2">{t('maxLeverage')}</label>
                <input type="number" value={maxLeverage} onChange={(e) => setMaxLeverage(parseInt(e.target.value) || 1)} className="input-field w-full" min={1} max={125} />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">{t('cooldownSec')}</label>
                <input type="number" value={cooldownSeconds} onChange={(e) => setCooldownSeconds(parseInt(e.target.value) || 0)} className="input-field w-full" min={0} />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">{t('tpAtrMulti')}</label>
                <input type="number" value={tpAtrMultiplier} onChange={(e) => setTpAtrMultiplier(parseFloat(e.target.value) || 0)} className="input-field w-full" step="0.1" min={0} />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">{t('slAtrMulti')}</label>
                <input type="number" value={slAtrMultiplier} onChange={(e) => setSlAtrMultiplier(parseFloat(e.target.value) || 0)} className="input-field w-full" step="0.1" min={0} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link href={`/${locale}/strategies/${id}`} className="btn-ghost">{tCommon('cancel')}</Link>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {tCommon('save')}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
