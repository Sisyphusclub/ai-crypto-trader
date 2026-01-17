'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Strategy, Signal, StrategyValidation } from '../../types/strategy'
import { fetchStrategy, toggleStrategy, validateStrategy, deleteStrategy } from '../../lib/api'

export default function StrategyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [validation, setValidation] = useState<StrategyValidation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchStrategy(id)
      setStrategy(data)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const signalsRes = await fetch(`${apiUrl}/api/v1/strategies/${id}/signals?limit=10`, { cache: 'no-store' })
      if (signalsRes.ok) {
        setSignals(await signalsRes.json())
      }

      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleValidate = async () => {
    try {
      const result = await validateStrategy(id)
      setValidation(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    }
  }

  const handleToggle = async () => {
    try {
      await toggleStrategy(id)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed')
    }
  }

  const handleDelete = async () => {
    if (!strategy || !confirm(`Delete strategy "${strategy.name}"?`)) return
    try {
      await deleteStrategy(id)
      router.push('/strategies')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="text-gray-400">Loading...</div>
      </main>
    )
  }

  if (!strategy) {
    return (
      <main className="min-h-screen p-8">
        <div className="text-red-400">Strategy not found</div>
      </main>
    )
  }

  const indicators = strategy.indicators_json?.indicators || []
  const rules = strategy.triggers_json?.rules || []

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{strategy.name}</h1>
            <p className="text-gray-400 text-sm">
              Created {new Date(strategy.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/strategies" className="px-4 py-2 text-gray-400 hover:text-white transition">
              Back
            </Link>
            <button
              onClick={handleValidate}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Validate
            </button>
            <button
              onClick={handleToggle}
              className={`px-4 py-2 rounded-lg transition ${
                strategy.enabled
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {strategy.enabled ? 'Disable' : 'Enable'}
            </button>
            <Link
              href={`/strategies/${id}/edit`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Edit
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {validation && (
          <div className={`mb-4 p-3 rounded-lg border ${
            validation.valid
              ? 'bg-green-900/30 border-green-700'
              : 'bg-red-900/30 border-red-700'
          }`}>
            <div className={validation.valid ? 'text-green-400' : 'text-red-400'}>
              {validation.valid ? 'Strategy is valid' : 'Strategy has errors'}
            </div>
            {validation.errors.map((e, i) => (
              <div key={i} className="text-red-300 text-sm mt-1">• {e}</div>
            ))}
            {validation.warnings.map((w, i) => (
              <div key={i} className="text-yellow-300 text-sm mt-1">• {w}</div>
            ))}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Configuration</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Status</dt>
                <dd className={strategy.enabled ? 'text-green-400' : 'text-gray-400'}>
                  {strategy.enabled ? 'Enabled' : 'Disabled'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Exchanges</dt>
                <dd className="text-gray-200">{strategy.exchange_scope.join(', ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Symbols</dt>
                <dd className="text-gray-200">{strategy.symbols.join(', ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Timeframe</dt>
                <dd className="text-gray-200">{strategy.timeframe}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Cooldown</dt>
                <dd className="text-gray-200">{strategy.cooldown_seconds}s</dd>
              </div>
            </dl>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Indicators</h3>
            {indicators.length === 0 ? (
              <p className="text-gray-400 text-sm">No indicators configured</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {indicators.map((ind: { type: string; period: number; name?: string }, i: number) => (
                  <li key={i} className="text-gray-200">
                    {ind.type}({ind.period}) = {ind.name || `${ind.type.toLowerCase()}_${ind.period}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-gray-900 rounded-lg p-4 md:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-3">Trigger Rules</h3>
            {rules.length === 0 ? (
              <p className="text-gray-400 text-sm">No trigger rules configured</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule: { side: string; conditions: { indicator: string; operator: string; value?: number; compare_to?: string }[] }, i: number) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      rule.side === 'long' ? 'bg-green-900/20' : 'bg-red-900/20'
                    }`}
                  >
                    <div className={rule.side === 'long' ? 'text-green-400' : 'text-red-400'}>
                      {rule.side.toUpperCase()} when:
                    </div>
                    <ul className="text-gray-200 text-sm mt-1">
                      {rule.conditions.map((c, j: number) => (
                        <li key={j}>
                          {c.indicator} {c.operator} {c.value ?? c.compare_to}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900 rounded-lg p-4 md:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-3">Recent Signals</h3>
            {signals.length === 0 ? (
              <p className="text-gray-400 text-sm">No signals generated yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-left py-2">Side</th>
                      <th className="text-left py-2">Score</th>
                      <th className="text-left py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((s) => (
                      <tr key={s.id} className="border-b border-gray-800">
                        <td className="py-2 text-gray-300">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 text-gray-200">{s.symbol}</td>
                        <td className={`py-2 ${s.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                          {s.side.toUpperCase()}
                        </td>
                        <td className="py-2 text-gray-200">{s.score}</td>
                        <td className="py-2 text-gray-400">{s.reason_summary || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800">
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-400 hover:text-red-300 transition"
          >
            Delete Strategy
          </button>
        </div>
      </div>
    </main>
  )
}
