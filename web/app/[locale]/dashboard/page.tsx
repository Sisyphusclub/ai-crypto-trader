'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../components/layout'
import { fetchStreamSnapshot, fetchPnlToday } from '../../lib/api'
import { useSSE, SSEEvent } from '../../hooks/useSSE'
import {
  StreamSnapshot,
  Position,
  Order,
  StreamSignal,
  StreamDecision,
  StreamExecution,
  PnlToday,
} from '../../types/dashboard'

function ConnectionStatus({ connected, error }: { connected: boolean; error: string | null }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-danger animate-pulse'}`} />
      <span className={connected ? 'text-success' : 'text-danger'}>
        {connected ? 'Live' : error || 'Disconnected'}
      </span>
    </div>
  )
}

function AccountSummary({ snapshot, pnlToday, t }: { snapshot: StreamSnapshot | null; pnlToday: PnlToday | null; t: ReturnType<typeof useTranslations> }) {
  const mode = snapshot?.mode || 'paper'
  const totalUnrealized = snapshot?.accounts.reduce(
    (sum, a) => sum + parseFloat(a.pnl?.total_unrealized_pnl || '0'), 0
  ) || 0
  const positionCount = snapshot?.accounts.reduce(
    (sum, a) => sum + (a.pnl?.position_count || 0), 0
  ) || 0

  return (
    <div className="glass-card p-4">
      <h2 className="text-lg font-display font-semibold text-white mb-4">{t('accountSummary')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'paper' ? 'bg-warning/10' : 'bg-danger/10'}`}>
              <svg className={`w-5 h-5 ${mode === 'paper' ? 'text-warning' : 'text-danger'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <div>
              <p className={`text-lg font-display font-bold ${mode === 'paper' ? 'text-warning' : 'text-danger'}`}>
                {mode.toUpperCase()}
              </p>
              <p className="text-xs text-white/40">Mode</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-display font-bold text-white">{positionCount}</p>
              <p className="text-xs text-white/40">{t('positionsCount')}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${totalUnrealized >= 0 ? 'bg-success/10' : 'bg-danger/10'}`}>
              <svg className={`w-5 h-5 ${totalUnrealized >= 0 ? 'text-success' : 'text-danger'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={`text-lg font-display font-bold ${totalUnrealized >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalUnrealized >= 0 ? '+' : ''}{totalUnrealized.toFixed(2)}
              </p>
              <p className="text-xs text-white/40">{t('unrealizedPnl')}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-display font-bold text-white">
                {pnlToday?.total_trades || 0}
                <span className="text-xs text-white/40 ml-1 font-normal">
                  ({pnlToday?.executed || 0}/{pnlToday?.failed || 0})
                </span>
              </p>
              <p className="text-xs text-white/40">Today&apos;s Trades</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PositionsTable({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-lg font-display font-semibold text-white mb-4">Open Positions</h2>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-xl bg-surface-500/50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">No open positions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-lg font-display font-semibold text-white">Open Positions</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-500/30">
            <tr>
              <th className="table-header">Symbol</th>
              <th className="table-header">Side</th>
              <th className="table-header">Qty</th>
              <th className="table-header">Entry</th>
              <th className="table-header">Lev</th>
              <th className="table-header">Unrealized PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {positions.map((p, i) => (
              <tr key={i} className="table-row">
                <td className="table-cell font-medium text-white">{p.symbol}</td>
                <td className="table-cell">
                  <span className={p.side === 'long' ? 'badge-success' : 'badge-danger'}>
                    {p.side.toUpperCase()}
                  </span>
                </td>
                <td className="table-cell text-white/60">{p.quantity}</td>
                <td className="table-cell text-white/60">{p.entry_price}</td>
                <td className="table-cell text-white/60">{p.leverage}x</td>
                <td className={`table-cell font-medium ${parseFloat(p.unrealized_pnl) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {parseFloat(p.unrealized_pnl) >= 0 ? '+' : ''}{p.unrealized_pnl}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-lg font-display font-semibold text-white mb-4">Open Orders</h2>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-xl bg-surface-500/50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">No open orders</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-lg font-display font-semibold text-white">Open Orders</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-500/30">
            <tr>
              <th className="table-header">Symbol</th>
              <th className="table-header">Order ID</th>
              <th className="table-header">Status</th>
              <th className="table-header">Filled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((o, i) => (
              <tr key={i} className="table-row">
                <td className="table-cell font-medium text-white">{o.symbol}</td>
                <td className="table-cell text-white/60 font-mono text-xs">{o.client_order_id || o.order_id}</td>
                <td className="table-cell">
                  <span className={
                    o.status === 'filled' ? 'badge-success' :
                    o.status === 'canceled' ? 'badge-info' : 'badge-warning'
                  }>
                    {o.status}
                  </span>
                </td>
                <td className="table-cell text-white/60">{o.filled_qty || '-'} @ {o.filled_price || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SignalsFeed({ signals, locale }: { signals: StreamSignal[]; locale: string }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold text-white">Recent Signals</h2>
        <Link href={`/${locale}/signals`} className="text-primary hover:text-primary-400 text-sm transition">
          View all
        </Link>
      </div>
      {signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-xl bg-surface-500/50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">No signals yet</p>
        </div>
      ) : (
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {signals.slice(0, 10).map((s) => (
            <div key={s.id} className={`p-3 rounded-lg border ${
              s.side === 'long' ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={s.side === 'long' ? 'badge-success' : 'badge-danger'}>
                    {s.side.toUpperCase()}
                  </span>
                  <span className="text-white font-medium text-sm">{s.symbol}</span>
                  <span className="text-white/40 text-xs">{s.timeframe}</span>
                </div>
                <span className="text-white/30 text-xs">
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

function DecisionsFeed({ decisions, locale, t }: { decisions: StreamDecision[]; locale: string; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold text-white">{t('aiDecisions')}</h2>
        <Link href={`/${locale}/logs`} className="text-primary hover:text-primary-400 text-sm transition">
          {t('viewAll')}
        </Link>
      </div>
      {decisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-xl bg-surface-500/50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">{t('noDecisions')}</p>
        </div>
      ) : (
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {decisions.slice(0, 10).map((d) => (
            <div key={d.id} className="p-3 rounded-lg border border-white/5 bg-surface-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={
                    d.status === 'executed' ? 'badge-success' :
                    d.status === 'rejected' ? 'badge-danger' :
                    d.status === 'risk_blocked' ? 'badge-warning' : 'badge-info'
                  }>
                    {d.status}
                  </span>
                  <span className="text-white/60 text-sm">{d.model_name}</span>
                  {d.is_paper && <span className="badge-warning text-[10px]">PAPER</span>}
                </div>
                <span className="text-white/30 text-xs">
                  {d.created_at ? new Date(d.created_at).toLocaleTimeString() : '-'}
                </span>
              </div>
              {d.reason_summary && <p className="text-white/40 text-xs mt-2 truncate">{d.reason_summary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExecutionsFeed({ executions, locale }: { executions: StreamExecution[]; locale: string }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold text-white">Executions</h2>
        <Link href={`/${locale}/logs`} className="text-primary hover:text-primary-400 text-sm transition">
          View all
        </Link>
      </div>
      {executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-xl bg-surface-500/50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">No executions yet</p>
        </div>
      ) : (
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {executions.slice(0, 10).map((e) => (
            <div key={e.id} className={`p-3 rounded-lg border ${
              e.status === 'completed' ? 'border-success/30 bg-success/5' :
              e.status === 'failed' ? 'border-danger/30 bg-danger/5' : 'border-white/5 bg-surface-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={e.side === 'long' ? 'badge-success' : 'badge-danger'}>
                    {e.side.toUpperCase()}
                  </span>
                  <span className="text-white font-medium text-sm">{e.symbol}</span>
                  <span className="text-white/40 text-xs">{e.quantity} @ {e.entry_price || 'market'}</span>
                </div>
                <span className={
                  e.status === 'completed' ? 'badge-success' :
                  e.status === 'failed' ? 'badge-danger' : 'badge-warning'
                }>
                  {e.status}
                </span>
              </div>
              {e.error_message && <p className="text-danger text-xs mt-2 truncate">{e.error_message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const { locale } = useParams()
  const [snapshot, setSnapshot] = useState<StreamSnapshot | null>(null)
  const [pnlToday, setPnlToday] = useState<PnlToday | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mode = snapshot?.mode || 'paper'
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
        return { ...prev, signals: [newSignal, ...prev.signals.slice(0, 9)] }
      })
    } else if (event.type === 'decision') {
      setSnapshot(prev => {
        if (!prev) return prev
        const newDecision = event.data as unknown as StreamDecision
        return { ...prev, decisions: [newDecision, ...prev.decisions.slice(0, 9)] }
      })
    } else if (event.type === 'execution') {
      setSnapshot(prev => {
        if (!prev) return prev
        const newExecution = event.data as unknown as StreamExecution
        return { ...prev, executions: [newExecution, ...prev.executions.slice(0, 9)] }
      })
    }
  }, [snapshot])

  const { connected, error: sseError } = useSSE({ onEvent: handleSSEEvent })

  if (loading) {
    return (
      <AppLayout locale={locale as string} mode="paper">
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-white/60">{tCommon('loading')}</span>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout locale={locale as string} mode={mode as 'paper' | 'live'}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{t('title')}</h1>
            <p className="text-white/40 text-sm mt-1">{t('subtitle')}</p>
          </div>
          <ConnectionStatus connected={connected} error={sseError} />
        </div>

        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <AccountSummary snapshot={snapshot} pnlToday={pnlToday} t={t} />

        <div className="grid gap-6 lg:grid-cols-2">
          <PositionsTable positions={allPositions} />
          <OrdersTable orders={allOrders} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <SignalsFeed signals={snapshot?.signals || []} locale={locale as string} />
          <DecisionsFeed decisions={snapshot?.decisions || []} locale={locale as string} t={t} />
          <ExecutionsFeed executions={snapshot?.executions || []} locale={locale as string} />
        </div>

        <div className="text-center text-white/30 text-xs py-4">
          {t('lastUpdated')}: {snapshot?.ts ? new Date(snapshot.ts).toLocaleString() : '-'}
        </div>
      </div>
    </AppLayout>
  )
}
