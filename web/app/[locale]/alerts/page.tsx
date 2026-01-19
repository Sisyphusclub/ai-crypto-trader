'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../components/layout'

export default function AlertsPage() {
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const tAlerts = useTranslations('alerts')
  const { locale } = useParams()

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{tNav('alerts')}</h1>
            <p className="text-white/40 text-sm mt-1">{tAlerts('subtitle')}</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {tAlerts('createAlert')}
          </button>
        </div>

        {/* Alert Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card-hover p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">{tAlerts('priceAlerts')}</h3>
                <p className="text-xs text-white/40">0 {tAlerts('active')}</p>
              </div>
            </div>
            <p className="text-sm text-white/60">{tAlerts('priceAlertDesc')}</p>
          </div>

          <div className="glass-card-hover p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">{tAlerts('signalAlerts')}</h3>
                <p className="text-xs text-white/40">0 {tAlerts('active')}</p>
              </div>
            </div>
            <p className="text-sm text-white/60">{tAlerts('signalAlertDesc')}</p>
          </div>

          <div className="glass-card-hover p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">{tAlerts('riskAlerts')}</h3>
                <p className="text-xs text-white/40">0 {tAlerts('active')}</p>
              </div>
            </div>
            <p className="text-sm text-white/60">{tAlerts('riskAlertDesc')}</p>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{tAlerts('activeAlerts')}</h2>
            <div className="flex items-center gap-2">
              <span className="badge-info">0 {tAlerts('active')}</span>
            </div>
          </div>

          {/* Empty State */}
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-surface-500/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-white/60 text-center mb-2">{tCommon('noData')}</p>
            <p className="text-white/40 text-sm text-center max-w-sm">
              {tAlerts('createFirstAlert')}
            </p>
          </div>
        </div>

        {/* Alert History */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">{tAlerts('alertHistory')}</h2>
          </div>

          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white/40">{tAlerts('noAlertHistory')}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
