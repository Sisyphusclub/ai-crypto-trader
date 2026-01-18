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
    <section className="glass-card p-4" aria-labelledby="signals-heading">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 id="signals-heading" className="text-base font-display font-semibold text-white">
            Recent Signals
          </h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter({})}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              !filter.side
                ? 'bg-primary text-surface-700 shadow-lg shadow-primary/20'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter({ side: 'long' })}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filter.side === 'long'
                ? 'bg-success text-surface-700 shadow-lg shadow-success/20'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Long
          </button>
          <button
            onClick={() => setFilter({ side: 'short' })}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filter.side === 'short'
                ? 'bg-danger text-white shadow-lg shadow-danger/20'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Short
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm mb-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-white/40">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading signals...</span>
          </div>
        </div>
      ) : signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-white/40 text-sm mb-2">No signals yet</p>
          <Link
            href="/strategies"
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            Configure strategies →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {signals.map((s) => (
            <div
              key={s.id}
              className={`p-3 rounded-lg border backdrop-blur-sm transition-all hover:scale-[1.01] ${
                s.side === 'long'
                  ? 'border-success/30 bg-success/5 hover:border-success/50'
                  : 'border-danger/30 bg-danger/5 hover:border-danger/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${
                      s.side === 'long'
                        ? 'bg-success text-surface-700'
                        : 'bg-danger text-white'
                    }`}
                  >
                    {s.side === 'long' ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                    {s.side.toUpperCase()}
                  </span>
                  <span className="text-white font-medium">{s.symbol}</span>
                  <span className="px-1.5 py-0.5 text-xs rounded bg-white/5 text-white/50">{s.timeframe}</span>
                </div>
                <span className="text-white/30 text-xs font-mono">
                  {new Date(s.created_at).toLocaleTimeString()}
                </span>
              </div>
              {s.reason_summary && (
                <p className="text-white/40 text-sm mt-2 truncate" title={s.reason_summary}>
                  {s.reason_summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/5 text-center">
        <Link
          href="/signals"
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
        >
          View all signals
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
