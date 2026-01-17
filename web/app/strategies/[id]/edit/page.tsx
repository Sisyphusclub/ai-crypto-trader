'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import StrategyForm from '../../StrategyForm'
import { fetchStrategy, updateStrategy } from '../../../lib/api'
import { Strategy, StrategyCreate } from '../../../types/strategy'

export default function EditStrategyPage() {
  const params = useParams()
  const id = params.id as string
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStrategy(id)
        setStrategy(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSubmit = async (data: StrategyCreate) => {
    await updateStrategy(id, data)
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

  const initialData: Partial<StrategyCreate> = {
    name: strategy.name,
    exchange_scope: strategy.exchange_scope,
    symbols: strategy.symbols,
    timeframe: strategy.timeframe,
    indicators: strategy.indicators_json,
    triggers: strategy.triggers_json,
    risk: {
      ...strategy.risk_json,
      cooldown_seconds: strategy.cooldown_seconds,
    },
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Edit Strategy</h1>
        <StrategyForm
          initialData={initialData}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      </div>
    </main>
  )
}
