'use client'

import StrategyForm from '../StrategyForm'
import { createStrategy } from '../../lib/api'
import { StrategyCreate } from '../../types/strategy'

export default function NewStrategyPage() {
  const handleSubmit = async (data: StrategyCreate) => {
    await createStrategy(data)
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Create Strategy</h1>
        <StrategyForm onSubmit={handleSubmit} submitLabel="Create Strategy" />
      </div>
    </main>
  )
}
