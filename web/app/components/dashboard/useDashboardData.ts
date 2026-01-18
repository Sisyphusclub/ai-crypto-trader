'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchStreamSnapshot, fetchPnlToday } from '../../lib/api'
import { useSSE, SSEEvent } from '../../hooks/useSSE'
import {
  StreamSnapshot,
  Position,
  StreamDecision,
  PnlToday,
} from '../../types/dashboard'

interface UseDashboardDataResult {
  snapshot: StreamSnapshot | null
  pnlToday: PnlToday | null
  loading: boolean
  error: string | null
  connected: boolean
  sseError: string | null
  allPositions: Position[]
  allDecisions: StreamDecision[]
  totalEquity: number
  positionCount: number
  totalPnl: number
  availableBalance: number
  mode: 'paper' | 'live'
  refresh: () => Promise<void>
}

export function useDashboardData(): UseDashboardDataResult {
  const [snapshot, setSnapshot] = useState<StreamSnapshot | null>(null)
  const [pnlToday, setPnlToday] = useState<PnlToday | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)
      const [snapshotData, pnlData] = await Promise.all([fetchStreamSnapshot(), fetchPnlToday()])
      setSnapshot(snapshotData)
      setPnlToday(pnlData)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'positions') {
      setSnapshot((prev) => {
        if (!prev) return prev
        const accountId = event.data.exchange_account_id as string
        return {
          ...prev,
          accounts: prev.accounts.map((a) =>
            a.id === accountId ? { ...a, positions: event.data.positions as Position[] } : a
          ),
        }
      })
    } else if (event.type === 'pnl') {
      setSnapshot((prev) => {
        if (!prev) return prev
        const accountId = event.data.exchange_account_id as string
        return {
          ...prev,
          accounts: prev.accounts.map((a) =>
            a.id === accountId
              ? {
                  ...a,
                  pnl: event.data.pnl as {
                    total_unrealized_pnl: string
                    position_count: number
                    estimated: boolean
                  },
                }
              : a
          ),
        }
      })
    } else if (event.type === 'decisions') {
      setSnapshot((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          decisions: event.data.decisions as StreamDecision[],
        }
      })
    }
  }, [])

  const { connected, error: sseError } = useSSE({
    types: 'positions,orders,pnl,decisions',
    onEvent: handleSSEEvent,
  })

  // Derived values
  const mode = (snapshot?.mode || 'paper') as 'paper' | 'live'
  const allPositions: Position[] = snapshot?.accounts.flatMap((a) => a.positions) || []
  const allDecisions: StreamDecision[] = snapshot?.decisions || []

  const totalEquity =
    snapshot?.accounts.reduce((sum, a) => sum + parseFloat(a.pnl?.total_unrealized_pnl || '0'), 0) || 0
  const positionCount =
    snapshot?.accounts.reduce((sum, a) => sum + (a.pnl?.position_count || 0), 0) || 0
  const availableBalance = 0
  const totalPnl = pnlToday ? parseFloat(pnlToday.total_pnl || '0') : 0

  return {
    snapshot,
    pnlToday,
    loading,
    error,
    connected,
    sseError,
    allPositions,
    allDecisions,
    totalEquity,
    positionCount,
    totalPnl,
    availableBalance,
    mode,
    refresh: loadInitialData,
  }
}
