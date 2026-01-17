'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { fetchStreamSnapshot, fetchPnlToday } from '../lib/api'
import { useSSE, SSEEvent } from '../hooks/useSSE'
import {
  StreamSnapshot,
  Position,
  Order,
  StreamSignal,
  StreamDecision,
  StreamExecution,
  PnlToday,
} from '../types/dashboard'

function ConnectionStatus({ connected, error }: { connected: boolean; error: string | null }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}
      />
      <span className={connected ? 'text-green-400' : 'text-red-400'}>
        {connected ? 'Live' : error || 'Disconnected'}
      </span>
    </div>
  )
}

function AccountSummary({ snapshot, pnlToday }: { snapshot: StreamSnapshot | null; pnlToday: PnlToday | null }) {
  const mode = snapshot?.mode || 'paper'
  const totalUnrealized = snapshot?.accounts.reduce(
    (sum, a) => sum + parseFloat(a.pnl?.total_unrealized_pnl || '0'),
    0
  ) || 0
  const positionCount = snapshot?.accounts.reduce(
    (sum, a) => sum + (a.pnl?.position_count || 0),
    0
  ) || 0

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-100 mb-3">Account Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-gray-400 text-xs uppercase">Mode</div>
          <div className={`text-lg font-bold ${mode === 'paper' ? 'text-yellow-400' : 'text-green-400'}`}>
            {mode.toUpperCase()}
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-xs uppercase">Positions</div>
          <div className="text-lg font-bold text-white">{positionCount}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs uppercase">Unrealized PnL</div>
          <div className={`text-lg font-bold ${totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalUnrealized >= 0 ? '+' : ''}{totalUnrealized.toFixed(2)} USDT
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-xs uppercase">Today&apos;s Trades</div>
          <div className="text-lg font-bold text-white">
            {pnlToday?.total_trades || 0}
            <span className="text-xs text-gray-400 ml-1">
              ({pnlToday?.executed || 0} ok / {pnlToday?.failed || 0} fail)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PositionsTable({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Open Positions</h2>
        <p className="text-gray-400 text-sm">No open positions</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
      <h2 className="text-lg font-semibold text-gray-100 mb-3">Open Positions</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left border-b border-gray-700">
            <th className="pb-2">Symbol</th>
            <th className="pb-2">Side</th>
            <th className="pb-2">Qty</th>
            <th className="pb-2">Entry</th>
            <th className="pb-2">Lev</th>
            <th className="pb-2">Unrealized PnL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={i} className="border-b border-gray-800">
              <td className="py-2 text-white font-medium">{p.symbol}</td>
              <td className={`py-2 ${p.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                {p.side.toUpperCase()}
              </td>
              <td className="py-2 text-gray-300">{p.quantity}</td>
              <td className="py-2 text-gray-300">{p.entry_price}</td>
              <td className="py-2 text-gray-300">{p.leverage}x</td>
              <td className={`py-2 ${parseFloat(p.unrealized_pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {parseFloat(p.unrealized_pnl) >= 0 ? '+' : ''}{p.unrealized_pnl}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Open Orders</h2>
        <p className="text-gray-400 text-sm">No open orders</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
      <h2 className="text-lg font-semibold text-gray-100 mb-3">Open Orders</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left border-b border-gray-700">
            <th className="pb-2">Symbol</th>
            <th className="pb-2">Order ID</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Filled</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr key={i} className="border-b border-gray-800">
              <td className="py-2 text-white font-medium">{o.symbol}</td>
              <td className="py-2 text-gray-300 font-mono text-xs">{o.client_order_id || o.order_id}</td>
              <td className="py-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  o.status === 'filled' ? 'bg-green-800 text-green-300' :
                  o.status === 'canceled' ? 'bg-gray-700 text-gray-300' :
                  'bg-yellow-800 text-yellow-300'
                }`}>
                  {o.status}
                </span>
              </td>
              <td className="py-2 text-gray-300">
                {o.filled_qty || '-'} @ {o.filled_price || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SignalsFeed({ signals }: { signals: StreamSignal[] }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-100">Recent Signals</h2>
        <Link href="/signals" className="text-blue-400 hover:text-blue-300 text-sm">
          View all
        </Link>
      </div>
      {signals.length === 0 ? (
        <p className="text-gray-400 text-sm">No signals yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {signals.slice(0, 10).map((s) => (
            <div
              key={s.id}
              className={`p-2 rounded border ${
                s.side === 'long' ? 'border-green-800 bg-green-900/20' : 'border-red-800 bg-red-900/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    s.side === 'long' ? 'bg-green-600' : 'bg-red-600'
                  } text-white`}>
                    {s.side.toUpperCase()}
                  </span>
                  <span className="text-white font-medium text-sm">{s.symbol}</span>
                  <span className="text-gray-400 text-xs">{s.timeframe}</span>
                </div>
                <span className="text-gray-500 text-xs">
                  {s.created_at ? new Date(s.created_at).toLocaleTimeString() : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DecisionsFeed({ decisions }: { decisions: StreamDecision[] }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-100">AI Decisions</h2>
        <Link href="/logs" className="text-blue-400 hover:text-blue-300 text-sm">
          View all
        </Link>
      </div>
      {decisions.length === 0 ? (
        <p className="text-gray-400 text-sm">No decisions yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {decisions.slice(0, 10).map((d) => (
            <div key={d.id} className="p-2 rounded border border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    d.status === 'executed' ? 'bg-green-700' :
                    d.status === 'rejected' ? 'bg-red-700' :
                    d.status === 'risk_blocked' ? 'bg-yellow-700' :
                    'bg-gray-600'
                  } text-white`}>
                    {d.status}
                  </span>
                  <span className="text-gray-300 text-sm">{d.model_name}</span>
                  {d.is_paper && <span className="text-yellow-500 text-xs">[PAPER]</span>}
                </div>
                <span className="text-gray-500 text-xs">
                  {d.created_at ? new Date(d.created_at).toLocaleTimeString() : '-'}
                </span>
              </div>
              {d.reason_summary && (
                <p className="text-gray-400 text-xs mt-1 truncate">{d.reason_summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExecutionsFeed({ executions }: { executions: StreamExecution[] }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-100">Executions</h2>
        <Link href="/logs" className="text-blue-400 hover:text-blue-300 text-sm">
          View all
        </Link>
      </div>
      {executions.length === 0 ? (
        <p className="text-gray-400 text-sm">No executions yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {executions.slice(0, 10).map((e) => (
            <div
              key={e.id}
              className={`p-2 rounded border ${
                e.status === 'completed' ? 'border-green-800 bg-green-900/20' :
                e.status === 'failed' ? 'border-red-800 bg-red-900/20' :
                'border-gray-700 bg-gray-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    e.side === 'long' ? 'bg-green-600' : 'bg-red-600'
                  } text-white`}>
                    {e.side.toUpperCase()}
                  </span>
                  <span className="text-white font-medium text-sm">{e.symbol}</span>
                  <span className="text-gray-400 text-xs">{e.quantity} @ {e.entry_price || 'market'}</span>
                </div>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  e.status === 'completed' ? 'bg-green-700' :
                  e.status === 'failed' ? 'bg-red-700' :
                  'bg-yellow-700'
                } text-white`}>
                  {e.status}
                </span>
              </div>
              {e.error_message && (
                <p className="text-red-400 text-xs mt-1 truncate">{e.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<StreamSnapshot | null>(null)
  const [pnlToday, setPnlToday] = useState<PnlToday | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Aggregate positions and orders from all accounts
  const allPositions = snapshot?.accounts.flatMap(a => a.positions) || []
  const allOrders = snapshot?.accounts.flatMap(a => a.orders) || []

  const loadInitialData = useCallback(async () => {
    try {
      const [snapshotData, pnlData] = await Promise.all([
        fetchStreamSnapshot(),
        fetchPnlToday(),
      ])
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
    if (event.type === 'positions' && snapshot) {
      setSnapshot(prev => {
        if (!prev) return prev
        const accountId = event.data.exchange_account_id as string
        return {
          ...prev,
          accounts: prev.accounts.map(a =>
            a.id === accountId ? { ...a, positions: event.data.positions as Position[] } : a
          ),
        }
      })
    } else if (event.type === 'orders' && snapshot) {
      setSnapshot(prev => {
        if (!prev) return prev
        const accountId = event.data.exchange_account_id as string
        return {
          ...prev,
          accounts: prev.accounts.map(a =>
            a.id === accountId ? { ...a, orders: event.data.orders as Order[] } : a
          ),
        }
      })
    } else if (event.type === 'signal') {
      setSnapshot(prev => {
        if (!prev) return prev
        const newSignal = event.data as unknown as StreamSignal
        return {
          ...prev,
          signals: [newSignal, ...prev.signals.slice(0, 9)],
        }
      })
    } else if (event.type === 'decision') {
      setSnapshot(prev => {
        if (!prev) return prev
        const newDecision = event.data as unknown as StreamDecision
        return {
          ...prev,
          decisions: [newDecision, ...prev.decisions.slice(0, 9)],
        }
      })
    } else if (event.type === 'execution') {
      setSnapshot(prev => {
        if (!prev) return prev
        const newExecution = event.data as unknown as StreamExecution
        return {
          ...prev,
          executions: [newExecution, ...prev.executions.slice(0, 9)],
        }
      })
    }
  }, [snapshot])

  const { connected, error: sseError } = useSSE({
    onEvent: handleSSEEvent,
  })

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-gray-400">Loading dashboard...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm">Real-time trading overview</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus connected={connected} error={sseError} />
            <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
              ← Home
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <AccountSummary snapshot={snapshot} pnlToday={pnlToday} />

          <div className="grid gap-6 lg:grid-cols-2">
            <PositionsTable positions={allPositions} />
            <OrdersTable orders={allOrders} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <SignalsFeed signals={snapshot?.signals || []} />
            <DecisionsFeed decisions={snapshot?.decisions || []} />
            <ExecutionsFeed executions={snapshot?.executions || []} />
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-xs">
          Last updated: {snapshot?.ts ? new Date(snapshot.ts).toLocaleString() : '-'}
        </div>
      </div>
    </main>
  )
}
