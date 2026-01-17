'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Strategy } from '../types/strategy'
import { fetchStrategies, toggleStrategy, deleteStrategy } from '../lib/api'

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStrategies = async () => {
    try {
      setLoading(true)
      const data = await fetchStrategies()
      setStrategies(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStrategies()
  }, [])

  const handleToggle = async (id: string) => {
    try {
      await toggleStrategy(id)
      await loadStrategies()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete strategy "${name}"?`)) return
    try {
      await deleteStrategy(id)
      await loadStrategies()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Strategies</h1>
            <p className="text-gray-400 text-sm">Configure trading strategies and triggers</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 text-gray-400 hover:text-white transition">
              Back
            </Link>
            <Link
              href="/strategies/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              New Strategy
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
        ) : strategies.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">No strategies configured yet</p>
            <Link
              href="/strategies/new"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Create your first strategy
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Exchanges</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Symbols</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Timeframe</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {strategies.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/strategies/${s.id}`} className="text-blue-400 hover:text-blue-300">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(s.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          s.enabled
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {s.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {s.exchange_scope.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {s.symbols.slice(0, 3).join(', ')}
                      {s.symbols.length > 3 && ` +${s.symbols.length - 3}`}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{s.timeframe}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/strategies/${s.id}/edit`}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
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
