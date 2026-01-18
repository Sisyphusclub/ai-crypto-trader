'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../components/layout'
import { Trader } from '../../types/trader'
import { fetchTraders, startTrader, stopTrader, deleteTrader } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export default function TradersPage() {
  const t = useTranslations('traders')
  const tCommon = useTranslations('common')
  const tTopbar = useTranslations('topbar')
  const { locale } = useParams()
  const { refreshOnboarding } = useAuth()
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'stop' | 'delete' | 'live'; trader: Trader } | null>(null)

  const loadTraders = async () => {
    try {
      setLoading(true)
      const data = await fetchTraders()
      setTraders(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTraders()
  }, [])

  const handleStart = async (trader: Trader) => {
    if (trader.mode === 'live') {
      setConfirmDialog({ type: 'live', trader })
      return
    }
    try {
      await startTrader(trader.id, false)
      await loadTraders()
      refreshOnboarding()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Start failed')
    }
  }

  const handleConfirmLive = async () => {
    if (!confirmDialog?.trader) return
    try {
      await startTrader(confirmDialog.trader.id, true)
      await loadTraders()
      refreshOnboarding()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Start failed')
    }
    setConfirmDialog(null)
  }

  const handleStop = async (trader: Trader) => {
    setConfirmDialog({ type: 'stop', trader })
  }

  const handleConfirmStop = async () => {
    if (!confirmDialog?.trader) return
    try {
      await stopTrader(confirmDialog.trader.id)
      await loadTraders()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stop failed')
    }
    setConfirmDialog(null)
  }

  const handleDelete = async (trader: Trader) => {
    setConfirmDialog({ type: 'delete', trader })
  }

  const handleConfirmDelete = async () => {
    if (!confirmDialog?.trader) return
    try {
      await deleteTrader(confirmDialog.trader.id)
      await loadTraders()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
    setConfirmDialog(null)
  }

  const mode = traders.some(t => t.mode === 'live' && t.enabled) ? 'live' : 'paper'

  return (
    <AppLayout locale={locale as string} mode={mode as 'paper' | 'live'}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{t('title')}</h1>
            <p className="text-white/40 text-sm mt-1">{t('subtitle')}</p>
          </div>
          <Link href={`/${locale}/traders/new`} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('newTrader')}
          </Link>
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
        ) : traders.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-500/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
              </svg>
            </div>
            <p className="text-white/60 mb-2">{t('noTraders')}</p>
            <p className="text-white/40 text-sm mb-6">{t('createFirstDesc')}</p>
            <Link href={`/${locale}/traders/new`} className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t('createFirst')}
            </Link>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-500/30">
                <tr>
                  <th className="table-header">{t('name')}</th>
                  <th className="table-header">{t('mode')}</th>
                  <th className="table-header">{t('status')}</th>
                  <th className="table-header">{t('strategy')}</th>
                  <th className="table-header">{t('model')}</th>
                  <th className="table-header">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {traders.map((trader) => (
                  <tr key={trader.id} className="table-row">
                    <td className="table-cell">
                      <Link href={`/${locale}/dashboard`} className="text-primary hover:text-primary-400 font-medium">
                        {trader.name}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <span className={trader.mode === 'live' ? 'badge-danger' : 'badge-warning'}>
                        {trader.mode === 'live' ? tTopbar('live').toUpperCase() : tTopbar('paper').toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={trader.enabled ? 'badge-success' : 'badge-info'}>
                        {trader.enabled ? t('running') : t('stopped')}
                      </span>
                    </td>
                    <td className="table-cell text-white/60 text-sm">
                      {trader.strategy_name || trader.strategy_id.slice(0, 8)}
                    </td>
                    <td className="table-cell text-white/60 text-sm">
                      {trader.model_label || trader.model_config_id.slice(0, 8)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {trader.enabled ? (
                          <button
                            onClick={() => handleStop(trader)}
                            className="text-warning hover:text-warning/80 text-sm transition"
                          >
                            {t('stop')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStart(trader)}
                            className="text-success hover:text-success/80 text-sm transition"
                          >
                            {t('start')}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(trader)}
                          className="text-danger hover:text-danger/80 text-sm transition"
                        >
                          {tCommon('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmDialog && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  confirmDialog.type === 'live' ? 'bg-danger/10' :
                  confirmDialog.type === 'stop' ? 'bg-warning/10' : 'bg-danger/10'
                }`}>
                  <svg className={`w-5 h-5 ${
                    confirmDialog.type === 'live' ? 'text-danger' :
                    confirmDialog.type === 'stop' ? 'text-warning' : 'text-danger'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {confirmDialog.type === 'live' ? t('startLiveTitle') :
                     confirmDialog.type === 'stop' ? t('stopTraderTitle') : t('deleteTraderTitle')}
                  </h3>
                  <p className="text-sm text-white/40">
                    {confirmDialog.type === 'live' ? t('startLiveDesc') :
                     confirmDialog.type === 'stop' ? t('stopTraderDesc') : t('deleteTraderDesc')}
                  </p>
                </div>
              </div>
              <p className="text-white/60 mb-6">
                {confirmDialog.type === 'live' ? t('confirmLive') :
                 confirmDialog.type === 'stop' ? t('confirmStop') : t('confirmDelete')}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="btn-ghost"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={
                    confirmDialog.type === 'live' ? handleConfirmLive :
                    confirmDialog.type === 'stop' ? handleConfirmStop : handleConfirmDelete
                  }
                  className={
                    confirmDialog.type === 'live' ? 'btn-danger' :
                    confirmDialog.type === 'stop' ? 'px-4 py-2 bg-warning hover:bg-warning/90 text-surface font-semibold rounded-lg transition' : 'btn-danger'
                  }
                >
                  {tCommon('confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
