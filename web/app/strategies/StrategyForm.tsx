'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  StrategyCreate,
  IndicatorConfig,
  TriggerRule,
  TriggerCondition,
} from '../../types/strategy'

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
const EXCHANGES = ['binance', 'gate']
const INDICATOR_TYPES = ['EMA', 'RSI', 'ATR'] as const

interface StrategyFormProps {
  initialData?: Partial<StrategyCreate>
  onSubmit: (data: StrategyCreate) => Promise<void>
  submitLabel: string
}

export default function StrategyForm({ initialData, onSubmit, submitLabel }: StrategyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialData?.name || '')
  const [exchanges, setExchanges] = useState<string[]>(initialData?.exchange_scope || ['binance'])
  const [symbols, setSymbols] = useState(initialData?.symbols?.join(', ') || 'BTCUSDT')
  const [timeframe, setTimeframe] = useState(initialData?.timeframe || '1h')

  const [indicators, setIndicators] = useState<IndicatorConfig[]>(
    initialData?.indicators?.indicators || [{ type: 'RSI', period: 14 }]
  )

  const [rules, setRules] = useState<TriggerRule[]>(
    initialData?.triggers?.rules || []
  )

  const [maxLeverage, setMaxLeverage] = useState(initialData?.risk?.max_leverage || 1)
  const [cooldown, setCooldown] = useState(initialData?.risk?.cooldown_seconds || 3600)

  const addIndicator = () => {
    setIndicators([...indicators, { type: 'EMA', period: 20 }])
  }

  const removeIndicator = (idx: number) => {
    setIndicators(indicators.filter((_, i) => i !== idx))
  }

  const updateIndicator = (idx: number, field: keyof IndicatorConfig, value: string | number) => {
    const updated = [...indicators]
    updated[idx] = { ...updated[idx], [field]: value }
    setIndicators(updated)
  }

  const addRule = (side: 'long' | 'short') => {
    setRules([...rules, { side, conditions: [{ indicator: '', operator: '>', value: 0 }], logic: 'AND' }])
  }

  const removeRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx))
  }

  const addCondition = (ruleIdx: number) => {
    const updated = [...rules]
    updated[ruleIdx].conditions.push({ indicator: '', operator: '>', value: 0 })
    setRules(updated)
  }

  const removeCondition = (ruleIdx: number, condIdx: number) => {
    const updated = [...rules]
    updated[ruleIdx].conditions = updated[ruleIdx].conditions.filter((_, i) => i !== condIdx)
    setRules(updated)
  }

  const updateCondition = (
    ruleIdx: number,
    condIdx: number,
    field: keyof TriggerCondition,
    value: string | number | undefined
  ) => {
    const updated = [...rules]
    updated[ruleIdx].conditions[condIdx] = {
      ...updated[ruleIdx].conditions[condIdx],
      [field]: value,
    }
    setRules(updated)
  }

  const indicatorNames = indicators.map(
    (ind) => ind.name || `${ind.type.toLowerCase()}_${ind.period}`
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data: StrategyCreate = {
        name,
        exchange_scope: exchanges,
        symbols: symbols.split(',').map((s) => s.trim()).filter(Boolean),
        timeframe,
        indicators: { indicators },
        triggers: { rules },
        risk: {
          max_leverage: maxLeverage,
          cooldown_seconds: cooldown,
        },
      }
      await onSubmit(data)
      router.push('/strategies')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Basic Info</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Strategy Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Universe</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Exchanges</label>
            <div className="flex gap-3">
              {EXCHANGES.map((ex) => (
                <label key={ex} className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={exchanges.includes(ex)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExchanges([...exchanges, ex])
                      } else {
                        setExchanges(exchanges.filter((x) => x !== ex))
                      }
                    }}
                    className="rounded bg-gray-800 border-gray-600"
                  />
                  {ex}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Symbols (comma-separated)</label>
            <input
              type="text"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder="BTCUSDT, ETHUSDT"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Indicators</h3>
          <button
            type="button"
            onClick={addIndicator}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            + Add
          </button>
        </div>
        <div className="space-y-3">
          {indicators.map((ind, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              <select
                value={ind.type}
                onChange={(e) => updateIndicator(idx, 'type', e.target.value as 'EMA' | 'RSI' | 'ATR')}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                {INDICATOR_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="number"
                value={ind.period}
                onChange={(e) => updateIndicator(idx, 'period', parseInt(e.target.value) || 1)}
                min={1}
                max={500}
                className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
              <span className="text-gray-400 text-sm">
                = {ind.name || `${ind.type.toLowerCase()}_${ind.period}`}
              </span>
              <button
                type="button"
                onClick={() => removeIndicator(idx)}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Trigger Rules</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addRule('long')}
              className="px-3 py-1 text-sm bg-green-900/50 hover:bg-green-800/50 text-green-400 rounded"
            >
              + Long Rule
            </button>
            <button
              type="button"
              onClick={() => addRule('short')}
              className="px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded"
            >
              + Short Rule
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {rules.map((rule, ruleIdx) => (
            <div
              key={ruleIdx}
              className={`p-3 rounded-lg border ${
                rule.side === 'long' ? 'border-green-800 bg-green-900/20' : 'border-red-800 bg-red-900/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={rule.side === 'long' ? 'text-green-400' : 'text-red-400'}>
                  {rule.side.toUpperCase()} Signal (all conditions must match)
                </span>
                <button
                  type="button"
                  onClick={() => removeRule(ruleIdx)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-2">
                {rule.conditions.map((cond, condIdx) => (
                  <div key={condIdx} className="flex gap-2 items-center flex-wrap">
                    <select
                      value={cond.indicator}
                      onChange={(e) => updateCondition(ruleIdx, condIdx, 'indicator', e.target.value)}
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    >
                      <option value="">Select indicator</option>
                      {indicatorNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(ruleIdx, condIdx, 'operator', e.target.value)}
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    >
                      <option value="<">&lt; (less than)</option>
                      <option value=">">&gt; (greater than)</option>
                      <option value="crosses_above">crosses above</option>
                      <option value="crosses_below">crosses below</option>
                    </select>
                    {['<', '>'].includes(cond.operator) ? (
                      <input
                        type="number"
                        value={cond.value ?? ''}
                        onChange={(e) => updateCondition(ruleIdx, condIdx, 'value', parseFloat(e.target.value))}
                        placeholder="value"
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                    ) : (
                      <select
                        value={cond.compare_to || ''}
                        onChange={(e) => updateCondition(ruleIdx, condIdx, 'compare_to', e.target.value)}
                        className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      >
                        <option value="">Select indicator</option>
                        {indicatorNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    )}
                    {rule.conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCondition(ruleIdx, condIdx)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addCondition(ruleIdx)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  + Add Condition
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Risk Parameters</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Leverage</label>
            <input
              type="number"
              value={maxLeverage}
              onChange={(e) => setMaxLeverage(parseInt(e.target.value) || 1)}
              min={1}
              max={125}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cooldown (seconds)</label>
            <input
              type="number"
              value={cooldown}
              onChange={(e) => setCooldown(parseInt(e.target.value) || 0)}
              min={0}
              max={86400}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/strategies')}
          className="px-4 py-2 text-gray-400 hover:text-white transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
