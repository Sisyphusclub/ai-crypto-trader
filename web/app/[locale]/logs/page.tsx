'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../components/layout'
import { DecisionLog, LogStats, Trader } from '../../types/trader'
import { fetchDecisions, fetchLogStats, fetchTraders } from '../../lib/api'

export default function LogsPage() {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const tTopbar = useTranslations('topbar')
  const tLogs = useTranslations('logs')
  const { locale } = useParams()
  const [decisions, setDecisions] = useState<DecisionLog[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    trader_id: '',
    status: '',
    is_paper: undefined as boolean | undefined,
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = { limit: 100 }
      if (filters.trader_id) params.trader_id = filters.trader_id
      if (filters.status) params.status = filters.status
      if (filters.is_paper !== undefined) params.is_paper = filters.is_paper

      const [d, s, tr] = await Promise.all([
        fetchDecisions(params),
        fetchLogStats(filters.trader_id || undefined),
        fetchTraders(),
      ])
      setDecisions(d)
      setStats(s)
      setTraders(tr)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filters])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'executed': return 'badge-success'
      case 'blocked': return 'badge-warning'
      case 'failed': return 'badge-danger'
      case 'allowed': return 'badge-info'
      default: return 'badge-info'
    }
  }

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{t('logs')}</h1>
          <p className="text-white/40 text-sm mt-1">{tLogs('subtitle')}</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-white/40">{tLogs('total')}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-success">{stats.executed}</p>
                  <p className="text-xs text-white/40">{tLogs('executed')}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-warning">{stats.blocked}</p>
                  <p className="text-xs text-white/40">{tLogs('blocked')}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-danger">{stats.failed}</p>
                  <p className="text-xs text-white/40">{tLogs('failed')}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-primary">{stats.paper}</p>
                  <p className="text-xs text-white/40">{tLogs('paper')}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-accent">{stats.live}</p>
                  <p className="text-xs text-white/40">{tLogs('live')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex gap-4 flex-wrap">
            <select
              value={filters.trader_id}
              onChange={e => setFilters({ ...filters, trader_id: e.target.value })}
              className="select-field"
            >
              <option value="">{tLogs('allTraders')}</option>
              {traders.map(tr => (
                <option key={tr.id} value={tr.id}>{tr.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="select-field"
            >
              <option value="">{tLogs('allStatus')}</option>
              <option value="pending">{tLogs('pending')}</option>
              <option value="allowed">{tLogs('allowed')}</option>
              <option value="blocked">{tLogs('blocked')}</option>
              <option value="executed">{tLogs('executed')}</option>
              <option value="failed">{tLogs('failed')}</option>
            </select>
            <select
              value={filters.is_paper === undefined ? '' : String(filters.is_paper)}
              onChange={e => setFilters({
                ...filters,
                is_paper: e.target.value === '' ? undefined : e.target.value === 'true'
              })}
              className="select-field"
            >
              <option value="">{tLogs('allModes')}</option>
              <option value="true">{tLogs('paper')}</option>
              <option value="false">{tLogs('live')}</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="glass-card p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-white/60">{tCommon('loading')}</span>
          </div>
        ) : decisions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-500/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-white/60 mb-2">{tCommon('noData')}</p>
            <p className="text-white/40 text-sm">{tLogs('startTraderHint')}</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-500/30">
                <tr>
                  <th className="table-header">{tLogs('time')}</th>
                  <th className="table-header">{tLogs('trader')}</th>
                  <th className="table-header">{tLogs('mode')}</th>
                  <th className="table-header">{tLogs('status')}</th>
                  <th className="table-header">{tLogs('confidence')}</th>
                  <th className="table-header">{tLogs('model')}</th>
                  <th className="table-header">{tLogs('summary')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {decisions.map((d) => (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell text-white/60 text-sm whitespace-nowrap">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="table-cell text-white/60 text-sm">
                      {d.trader_name || d.trader_id.slice(0, 8)}
                    </td>
                    <td className="table-cell">
                      <span className={d.is_paper ? 'badge-warning' : 'badge-danger'}>
                        {d.is_paper ? tTopbar('paper').toUpperCase() : tTopbar('live').toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={getStatusBadge(d.status)}>
                        {d.status}
                      </span>
                    </td>
                    <td className="table-cell text-white/60 text-sm">
                      {d.confidence ? `${(parseFloat(d.confidence) * 100).toFixed(0)}%` : '-'}
                    </td>
                    <td className="table-cell text-white/60 text-sm">
                      {d.model_provider ? `${d.model_provider}/${d.model_name}` : '-'}
                    </td>
                    <td className="table-cell text-white/40 text-sm max-w-xs truncate" title={d.reason_summary || d.execution_error || ''}>
                      {d.reason_summary || d.execution_error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
