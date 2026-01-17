'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { fetchReplayDecision, fetchReplayTrade, getReplayExportUrl, fetchDecisions } from '../lib/api'
import { ReplayChain, ReplayChainStep } from '../types/replay'

const stepTypeLabels: Record<string, string> = {
  signal: 'Signal',
  market_snapshot: 'Market Snapshot',
  ai_decision: 'AI Decision',
  risk_report: 'Risk Report',
  trade_plan: 'Trade Plan',
  execution: 'Execution',
}

const stepTypeColors: Record<string, string> = {
  signal: 'border-blue-600 bg-blue-900/30',
  market_snapshot: 'border-purple-600 bg-purple-900/30',
  ai_decision: 'border-cyan-600 bg-cyan-900/30',
  risk_report: 'border-yellow-600 bg-yellow-900/30',
  trade_plan: 'border-green-600 bg-green-900/30',
  execution: 'border-orange-600 bg-orange-900/30',
}

function ChainStepCard({ step }: { step: ReplayChainStep }) {
  const [expanded, setExpanded] = useState(false)
  const colorClass = stepTypeColors[step.type] || 'border-gray-600 bg-gray-900/30'

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">Step {step.step}</span>
          <span className="text-white font-medium">{stepTypeLabels[step.type] || step.type}</span>
        </div>
        <button className="text-gray-400 hover:text-white">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(step.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function RecentDecisionsList({
  onSelect,
}: {
  onSelect: (id: string, type: 'decision' | 'trade') => void
}) {
  const [decisions, setDecisions] = useState<Array<{ id: string; status: string; created_at: string; trade_plan_id?: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDecisions({ limit: 20 })
      .then((data) => setDecisions(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading recent decisions...</div>
  }

  if (decisions.length === 0) {
    return <div className="text-gray-400 text-sm">No decisions found</div>
  }

  return (
    <div className="space-y-2">
      {decisions.map((d) => (
        <div
          key={d.id}
          className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer"
          onClick={() => onSelect(d.id, 'decision')}
        >
          <div className="flex items-center justify-between">
            <span className={`px-2 py-0.5 text-xs rounded ${
              d.status === 'executed' ? 'bg-green-700' :
              d.status === 'rejected' ? 'bg-red-700' :
              'bg-gray-600'
            } text-white`}>
              {d.status}
            </span>
            <span className="text-gray-500 text-xs">
              {d.created_at ? new Date(d.created_at).toLocaleString() : '-'}
            </span>
          </div>
          <div className="text-gray-400 text-xs mt-1 font-mono truncate">{d.id}</div>
        </div>
      ))}
    </div>
  )
}

export default function ReplayPage() {
  const searchParams = useSearchParams()
  const [chain, setChain] = useState<ReplayChain | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [currentType, setCurrentType] = useState<'decision' | 'trade'>('decision')

  const loadReplay = useCallback(async (id: string, type: 'decision' | 'trade') => {
    setLoading(true)
    setError(null)
    setCurrentId(id)
    setCurrentType(type)
    try {
      const data = type === 'decision'
        ? await fetchReplayDecision(id)
        : await fetchReplayTrade(id)
      setChain(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load replay')
      setChain(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const decisionId = searchParams.get('decision')
    const tradeId = searchParams.get('trade')
    if (decisionId) {
      loadReplay(decisionId, 'decision')
    } else if (tradeId) {
      loadReplay(tradeId, 'trade')
    }
  }, [searchParams, loadReplay])

  const handleSelect = (id: string, type: 'decision' | 'trade') => {
    loadReplay(id, type)
  }

  const handleExport = () => {
    if (!currentId) return
    const url = getReplayExportUrl(currentType, currentId)
    window.open(url, '_blank')
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Trade Replay / Audit</h1>
            <p className="text-gray-400 text-sm">Trace complete trade execution chain</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm">
              Dashboard
            </Link>
            <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
              Home
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-100 mb-3">Recent Decisions</h2>
              <RecentDecisionsList onSelect={handleSelect} />
            </div>
          </div>

          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-gray-900 rounded-lg p-8 text-center">
                <div className="text-gray-400">Loading replay chain...</div>
              </div>
            ) : error ? (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            ) : chain ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-gray-400 text-sm">
                    Generated: {new Date(chain.generated_at).toLocaleString()}
                  </div>
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
                  >
                    Export JSON
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />
                  <div className="space-y-4">
                    {chain.chain.map((step, i) => (
                      <div key={i} className="relative pl-12">
                        <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-gray-600 border-2 border-gray-400" />
                        <ChainStepCard step={step} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-8 text-center">
                <p className="text-gray-400">Select a decision from the list to view its replay chain</p>
                <p className="text-gray-500 text-sm mt-2">
                  Or use URL params: ?decision=UUID or ?trade=UUID
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
