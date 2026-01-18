'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../components/layout'
import { Strategy } from '../../types/strategy'
import { fetchStrategies, toggleStrategy, deleteStrategy } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export default function StrategiesPage() {
  const t = useTranslations('strategies')
  const tCommon = useTranslations('common')
  const { locale } = useParams()
  const { refreshOnboarding } = useAuth()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Strategy | null>(null)

  const loadStrategies = async () => {
    try {
      setLoading(true)
      const data = await fetchStrategies()
      setStrategies(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStrategies()
  }, [])

  const handleToggle = async (id: string) => {
    try {
      await toggleStrategy(id)
      await loadStrategies()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteStrategy(confirmDelete.id)
      await loadStrategies()
      refreshOnboarding()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
    setConfirmDelete(null)
  }

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{t('title')}</h1>
            <p className="text-white/40 text-sm mt-1">{t('subtitle')}</p>
          </div>
          <Link href={`/${locale}/strategies/new`} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('newStrategy')}
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
        ) : strategies.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-500/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-white/60 mb-2">{t('noStrategies')}</p>
            <p className="text-white/40 text-sm mb-6">{t('createFirstDesc')}</p>
            <Link href={`/${locale}/strategies/new`} className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t('createFirst')}
            </Link>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-surface-500/30">
                <tr>
                  <th className="table-header w-[25%]">{t('name')}</th>
                  <th className="table-header w-[12%]">Status</th>
                  <th className="table-header w-[25%]">{t('symbols')}</th>
                  <th className="table-header w-[10%]">{t('timeframe')}</th>
                  <th className="table-header w-[28%]">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {strategies.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell">
                      <Link href={`/${locale}/strategies/${s.id}`} className="text-primary hover:text-primary-400 font-medium">
                        {s.name}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleToggle(s.id)}
                        className={s.enabled ? 'badge-success' : 'badge-warning'}
                      >
                        {s.enabled ? t('enabled') : t('disabled')}
                      </button>
                    </td>
                    <td className="table-cell text-white/60 text-sm">
                      {s.symbols.slice(0, 3).join(', ')}
                      {s.symbols.length > 3 && <span className="text-white/40"> +{s.symbols.length - 3}</span>}
                    </td>
                    <td className="table-cell text-white/60 text-sm">{s.timeframe}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/${locale}/strategies/${s.id}/edit`}
                          className="text-white/40 hover:text-white text-sm transition"
                        >
                          {tCommon('edit')}
                        </Link>
                        <Link
                          href={`/${locale}/traders/new?strategy=${s.id}`}
                          className="text-success hover:text-success/80 text-sm transition"
                        >
                          {t('createTrader')}
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(s)}
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

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('deleteStrategy')}</h3>
                  <p className="text-sm text-white/40">{t('deleteStrategyDesc')}</p>
                </div>
              </div>
              <p className="text-white/60 mb-6">
                {t('deleteConfirm')} <span className="text-white font-medium">"{confirmDelete.name}"</span>?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="btn-ghost"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-danger"
                >
                  {tCommon('delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
