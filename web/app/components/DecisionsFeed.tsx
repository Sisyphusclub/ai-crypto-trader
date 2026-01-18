'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { StreamDecision } from '../types/dashboard'

interface DecisionsFeedProps {
  decisions: StreamDecision[]
  locale: string
  maxItems?: number
}

interface DecisionCycle {
  cycleNumber: number
  timestamp: string
  decisions: StreamDecision[]
  aiDuration?: number
}

function groupDecisionsByCycle(decisions: StreamDecision[]): DecisionCycle[] {
  const sorted = [...decisions].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )

  const cycles: DecisionCycle[] = []
  let currentCycle: StreamDecision[] = []
  let lastTime: Date | null = null

  sorted.forEach((d) => {
    const time = new Date(d.created_at || 0)
    if (lastTime && Math.abs(time.getTime() - lastTime.getTime()) > 60000) {
      if (currentCycle.length > 0) {
        cycles.push({
          cycleNumber: cycles.length + 1,
          timestamp: currentCycle[0].created_at || '',
          decisions: currentCycle,
        })
      }
      currentCycle = [d]
    } else {
      currentCycle.push(d)
    }
    lastTime = time
  })

  if (currentCycle.length > 0) {
    cycles.push({
      cycleNumber: cycles.length + 1,
      timestamp: currentCycle[0].created_at || '',
      decisions: currentCycle,
    })
  }

  return cycles.slice(0, 5).map((c, i) => ({ ...c, cycleNumber: i + 1 }))
}

function DecisionCycleCard({ cycle }: { cycle: DecisionCycle }) {
  const [expandedPrompt, setExpandedPrompt] = useState(false)
  const [expandedReasoning, setExpandedReasoning] = useState(false)
  const t = useTranslations('overview')

  const timestamp = cycle.timestamp
    ? new Date(cycle.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

  const hasExecuted = cycle.decisions.some((d) => d.status === 'executed')
  const hasRejected = cycle.decisions.some((d) => d.status === 'rejected' || d.status === 'risk_blocked')

  return (
    <div className="border border-white/5 rounded-lg bg-surface-500/20 overflow-hidden">
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">
              {t('cycle')} #{cycle.cycleNumber}
            </span>
            {hasExecuted && (
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            )}
            {hasRejected && !hasExecuted && (
              <span className="w-2 h-2 rounded-full bg-warning" />
            )}
          </div>
          <span className="text-white/40 text-xs">{timestamp}</span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <button
          onClick={() => setExpandedPrompt(!expandedPrompt)}
          className="w-full flex items-center gap-2 text-left text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expandedPrompt ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {t('inputPrompt')}
        </button>
        {expandedPrompt && (
          <div className="ml-5 p-2 bg-surface-400/50 rounded text-xs text-white/50 max-h-24 overflow-y-auto">
            {cycle.decisions[0]?.reason_summary || t('noPromptData')}
          </div>
        )}

        <button
          onClick={() => setExpandedReasoning(!expandedReasoning)}
          className="w-full flex items-center gap-2 text-left text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expandedReasoning ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {t('aiChainOfThought')}
        </button>
        {expandedReasoning && (
          <div className="ml-5 p-2 bg-surface-400/50 rounded text-xs text-white/50 max-h-24 overflow-y-auto">
            {cycle.decisions.map((d) => d.reason_summary).filter(Boolean).join('\n') ||
              t('noReasoningData')}
          </div>
        )}

        <div className="mt-3 space-y-1.5">
          {cycle.decisions.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm px-2 py-1 rounded bg-surface-400/30"
            >
              <span className="text-white/80">{d.client_order_id?.split('_')[0] || 'UNKNOWN'}</span>
              <span
                className={`text-xs ${
                  d.status === 'executed'
                    ? 'text-success'
                    : d.status === 'rejected' || d.status === 'risk_blocked'
                    ? 'text-danger'
                    : 'text-white/50'
                }`}
              >
                {d.status === 'executed' ? 'hold' : d.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DecisionsFeed({ decisions, locale, maxItems = 5 }: DecisionsFeedProps) {
  const t = useTranslations('overview')
  const cycles = groupDecisionsByCycle(decisions)

  if (decisions.length === 0) {
    return (
      <div className="glass-card overflow-hidden h-full">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-display font-semibold text-white">{t('recentDecisions')}</h2>
          <p className="text-xs text-white/40 mt-0.5">{t('lastCycles')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-xl bg-surface-500/50 flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-white/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
          </div>
          <p className="text-white/40 text-sm">{t('noDecisions')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-lg font-display font-semibold text-white">{t('recentDecisions')}</h2>
        <p className="text-xs text-white/40 mt-0.5">{t('lastCycles')}</p>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {cycles.slice(0, maxItems).map((cycle) => (
          <DecisionCycleCard key={cycle.cycleNumber} cycle={cycle} />
        ))}
      </div>
    </div>
  )
}
