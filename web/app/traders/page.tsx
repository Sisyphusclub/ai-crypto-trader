'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trader } from '../types/trader'
import { fetchTraders, startTrader, stopTrader, deleteTrader } from '../lib/api'

export default function TradersPage() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTraders = async () => {
    try {
      setLoading(true)
      const data = await fetchTraders()
      setTraders(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTraders()
  }, [])

  const handleStart = async (trader: Trader) => {
    try {
      const needConfirm = trader.mode === 'live'
      if (needConfirm && !confirm('Start LIVE trading? This will execute real trades.')) {
        return
      }
      await startTrader(trader.id, needConfirm)
      await loadTraders()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Start failed')
    }
  }

  const handleStop = async (id: string) => {
    try {
      await stopTrader(id)
      await loadTraders()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stop failed')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete trader "${name}"?`)) return
    try {
      await deleteTrader(id)
      await loadTraders()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Traders</h1>
            <p className="text-gray-400 text-sm">Manage automated trading bots</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 text-gray-400 hover:text-white transition">
              Back
            </Link>
            <Link
              href="/traders/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              New Trader
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : traders.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">No traders configured yet</p>
            <Link
              href="/traders/new"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Create your first trader
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Strategy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {traders.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/traders/${t.id}`} className="text-blue-400 hover:text-blue-300">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        t.mode === 'live'
                          ? 'bg-red-900/50 text-red-400'
                          : 'bg-yellow-900/50 text-yellow-400'
                      }`}>
                        {t.mode === 'live' ? 'LIVE' : 'PAPER'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        t.enabled
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {t.enabled ? 'Running' : 'Stopped'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {t.strategy_name || t.strategy_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {t.model_label || t.model_config_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {t.enabled ? (
                          <button
                            onClick={() => handleStop(t.id)}
                            className="text-yellow-400 hover:text-yellow-300 text-sm"
                          >
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStart(t)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
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
