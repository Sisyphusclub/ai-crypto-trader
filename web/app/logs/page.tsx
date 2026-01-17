'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DecisionLog, LogStats } from '../types/trader'
import { fetchDecisions, fetchLogStats, fetchTraders } from '../lib/api'
import { Trader } from '../types/trader'

export default function LogsPage() {
  const [decisions, setDecisions] = useState<DecisionLog[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    trader_id: '',
    status: '',
    is_paper: undefined as boolean | undefined,
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = { limit: 100 }
      if (filters.trader_id) params.trader_id = filters.trader_id
      if (filters.status) params.status = filters.status
      if (filters.is_paper !== undefined) params.is_paper = filters.is_paper

      const [d, s, t] = await Promise.all([
        fetchDecisions(params),
        fetchLogStats(filters.trader_id || undefined),
        fetchTraders(),
      ])
      setDecisions(d)
      setStats(s)
      setTraders(t)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filters])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed': return 'bg-green-900/50 text-green-400'
      case 'blocked': return 'bg-yellow-900/50 text-yellow-400'
      case 'failed': return 'bg-red-900/50 text-red-400'
      case 'allowed': return 'bg-blue-900/50 text-blue-400'
      default: return 'bg-gray-700 text-gray-400'
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Decision Logs</h1>
            <p className="text-gray-400 text-sm">AI trading decisions and executions</p>
          </div>
          <Link href="/" className="px-4 py-2 text-gray-400 hover:text-white transition">
            Back
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-gray-400 text-sm">Total</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{stats.executed}</div>
              <div className="text-gray-400 text-sm">Executed</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{stats.blocked}</div>
              <div className="text-gray-400 text-sm">Blocked</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-gray-400 text-sm">Failed</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-300">{stats.paper}</div>
              <div className="text-gray-400 text-sm">Paper</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-300">{stats.live}</div>
              <div className="text-gray-400 text-sm">Live</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-4 flex-wrap">
          <select
            value={filters.trader_id}
            onChange={e => setFilters({ ...filters, trader_id: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="">All Traders</option>
            {traders.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="allowed">Allowed</option>
            <option value="blocked">Blocked</option>
            <option value="executed">Executed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filters.is_paper === undefined ? '' : String(filters.is_paper)}
            onChange={e => setFilters({
              ...filters,
              is_paper: e.target.value === '' ? undefined : e.target.value === 'true'
            })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="">All Modes</option>
            <option value="true">Paper</option>
            <option value="false">Live</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : decisions.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400">No decision logs found</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trader</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Confidence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {decisions.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {d.trader_name || d.trader_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        d.is_paper
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {d.is_paper ? 'PAPER' : 'LIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {d.confidence ? `${(parseFloat(d.confidence) * 100).toFixed(0)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {d.model_provider ? `${d.model_provider}/${d.model_name}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate" title={d.reason_summary || d.execution_error || ''}>
                      {d.reason_summary || d.execution_error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
