'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Strategy } from '../../types/strategy'
import { ExchangeAccount, ModelConfig, TraderCreate } from '../../types/trader'
import { fetchStrategies, fetchExchangeAccounts, fetchModelConfigs, createTrader } from '../../lib/api'

export default function NewTraderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [exchanges, setExchanges] = useState<ExchangeAccount[]>([])
  const [models, setModels] = useState<ModelConfig[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])

  const [form, setForm] = useState<TraderCreate>({
    name: '',
    exchange_account_id: '',
    model_config_id: '',
    strategy_id: '',
    mode: 'paper',
    max_concurrent_positions: 3,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [ex, mo, st] = await Promise.all([
          fetchExchangeAccounts(),
          fetchModelConfigs(),
          fetchStrategies(),
        ])
        setExchanges(ex)
        setModels(mo)
        setStrategies(st)
        if (ex.length > 0) setForm(f => ({ ...f, exchange_account_id: ex[0].id }))
        if (mo.length > 0) setForm(f => ({ ...f, model_config_id: mo[0].id }))
        if (st.length > 0) setForm(f => ({ ...f, strategy_id: st[0].id }))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load resources')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.exchange_account_id || !form.model_config_id || !form.strategy_id) {
      setError('All fields are required')
      return
    }

    try {
      setSubmitting(true)
      await createTrader(form)
      router.push('/traders')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto text-gray-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">New Trader</h1>
          <Link href="/traders" className="text-gray-400 hover:text-white">
            Cancel
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="My Trader"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Exchange Account</label>
            <select
              value={form.exchange_account_id}
              onChange={e => setForm({ ...form, exchange_account_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {exchanges.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.label} ({ex.exchange}{ex.is_testnet ? ' - Testnet' : ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">AI Model</label>
            <select
              value={form.model_config_id}
              onChange={e => setForm({ ...form, model_config_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.provider} - {m.model_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Strategy</label>
            <select
              value={form.strategy_id}
              onChange={e => setForm({ ...form, strategy_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {strategies.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Trading Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="radio"
                  name="mode"
                  checked={form.mode === 'paper'}
                  onChange={() => setForm({ ...form, mode: 'paper' })}
                  className="text-blue-500"
                />
                Paper Trading
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="radio"
                  name="mode"
                  checked={form.mode === 'live'}
                  onChange={() => setForm({ ...form, mode: 'live' })}
                  className="text-blue-500"
                />
                <span className="text-red-400">Live Trading</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Max Concurrent Positions</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.max_concurrent_positions}
              onChange={e => setForm({ ...form, max_concurrent_positions: parseInt(e.target.value) || 3 })}
              className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Daily Loss Cap (USDT, optional)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.daily_loss_cap || ''}
              onChange={e => setForm({ ...form, daily_loss_cap: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="100"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition"
            >
              {submitting ? 'Creating...' : 'Create Trader'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
