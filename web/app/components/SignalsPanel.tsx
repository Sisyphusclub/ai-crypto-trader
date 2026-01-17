'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Signal } from '../types/strategy'
import { fetchSignals } from '../lib/api'

export default function SignalsPanel() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<{ side?: string }>({})

  const loadSignals = async () => {
    try {
      const data = await fetchSignals({ ...filter, limit: 20 })
      setSignals(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSignals()
    const interval = setInterval(loadSignals, 30000)
    return () => clearInterval(interval)
  }, [filter])

  return (
    <section className="bg-gray-900 rounded-lg p-4" aria-labelledby="signals-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="signals-heading" className="text-lg font-semibold text-gray-100">
          Recent Signals
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter({})}
            className={`px-2 py-1 text-xs rounded ${
              !filter.side ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter({ side: 'long' })}
            className={`px-2 py-1 text-xs rounded ${
              filter.side === 'long' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Long
          </button>
          <button
            onClick={() => setFilter({ side: 'short' })}
            className={`px-2 py-1 text-xs rounded ${
              filter.side === 'short' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Short
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-2">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : signals.length === 0 ? (
        <div className="text-gray-400 text-sm">
          No signals yet.{' '}
          <Link href="/strategies" className="text-blue-400 hover:text-blue-300">
            Configure strategies
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {signals.map((s) => (
            <div
              key={s.id}
              className={`p-3 rounded-lg border ${
                s.side === 'long'
                  ? 'border-green-800 bg-green-900/20'
                  : 'border-red-800 bg-red-900/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      s.side === 'long'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {s.side.toUpperCase()}
                  </span>
                  <span className="text-white font-medium">{s.symbol}</span>
                  <span className="text-gray-400 text-sm">{s.timeframe}</span>
                </div>
                <span className="text-gray-400 text-xs">
                  {new Date(s.created_at).toLocaleTimeString()}
                </span>
              </div>
              {s.reason_summary && (
                <p className="text-gray-400 text-sm mt-1 truncate" title={s.reason_summary}>
                  {s.reason_summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-center">
        <Link
          href="/signals"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          View all signals
        </Link>
      </div>
    </section>
  )
}
