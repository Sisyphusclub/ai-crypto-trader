'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout'
import { useAuth } from '../contexts/AuthContext'
import { TradingViewChart } from '../components/TradingViewChart'
import { EquityCurve } from '../components/EquityCurve'
import { PositionsTable } from '../components/PositionsTable'
import { DecisionsFeed } from '../components/DecisionsFeed'
import { StatsGrid } from '../components/dashboard/StatsGrid'
import { useDashboardData } from '../components/dashboard/useDashboardData'

type ChartView = 'equity' | 'market'

function ConnectionStatus({ connected, error }: { connected: boolean; error: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-danger'}`}
      />
      <span className="text-xs text-white/40">{connected ? 'Live' : error || 'Disconnected'}</span>
    </div>
  )
}

export default function OverviewPage() {
  const t = useTranslations('overview')
  const tOnboarding = useTranslations('onboarding')
  const { locale } = useParams()
  const { onboarding, refreshOnboarding } = useAuth()
  const [chartView, setChartView] = useState<ChartView>('market')

  const {
    snapshot,
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
  } = useDashboardData()

  useEffect(() => {
    refreshOnboarding()
  }, [refreshOnboarding])

  const steps = [
    {
      key: 'step1',
      done: onboarding?.has_exchange,
      href: '/settings/exchanges',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
    },
    {
      key: 'step2',
      done: onboarding?.has_model,
      href: '/settings/models',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      key: 'step3',
      done: onboarding?.has_strategy,
      href: '/strategies/new',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      key: 'step4',
      done: onboarding?.has_trader,
      href: '/traders/new',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
        </svg>
      ),
    },
  ]

  const completedSteps = steps.filter((s) => s.done).length
  const isOnboardingComplete = onboarding?.complete

  if (loading) {
    return (
      <AppLayout locale={locale as string} mode={mode as 'paper' | 'live'}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-white/40">
            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>{t('loading') || 'Loading...'}</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout locale={locale as string} mode={mode as 'paper' | 'live'}>
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              {t('title')}
            </h1>
            <p className="text-white/50 mt-1">{t('subtitle')}</p>
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

        {/* Stats Grid */}
        <StatsGrid
          totalEquity={totalEquity}
          availableBalance={availableBalance}
          totalPnl={totalPnl}
          positionCount={positionCount}
          t={t}
        />

        {/* Onboarding Progress - only show if not complete */}
        {onboarding && !isOnboardingComplete && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">{t('nextSteps')}</h2>
                <p className="text-sm text-white/40 mt-1">{t('completeSetup')}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-white/60">
                  {completedSteps}/{steps.length}
                </div>
                <div className="w-24 h-2 bg-surface-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map((step, i) => (
                <Link
                  key={step.key}
                  href={`/${locale}${step.href}`}
                  className={`glass-card-hover p-4 rounded-xl transition-all duration-200 ${
                    step.done ? 'border-success/30 bg-success/5' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        step.done ? 'bg-success/20 text-success' : 'bg-surface-50 text-white/50'
                      }`}
                    >
                      {step.done ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-white/40 uppercase tracking-wider">
                        {t('stepLabel')} {i + 1}
                      </span>
                      <h3 className="font-medium text-white">{tOnboarding(step.key)}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-white/40 mb-3">{tOnboarding(`${step.key}Desc`)}</p>
                  <div className="flex items-center justify-between">
                    {step.done ? (
                      <span className="badge-success">{tOnboarding('completed')}</span>
                    ) : (
                      <span className="badge-warning">{tOnboarding('pending')}</span>
                    )}
                    {!step.done && (
                      <svg
                        className="w-4 h-4 text-white/30"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main Content: Chart + Positions (left) | Decisions (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Charts and Positions (~70%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart Tabs */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center gap-4">
                <button
                  onClick={() => setChartView('equity')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chartView === 'equity'
                      ? 'bg-primary text-white'
                      : 'text-white/60 hover:text-white hover:bg-surface-400'
                  }`}
                >
                  {t('accountEquityCurve')}
                </button>
                <button
                  onClick={() => setChartView('market')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chartView === 'market'
                      ? 'bg-primary text-white'
                      : 'text-white/60 hover:text-white hover:bg-surface-400'
                  }`}
                >
                  {t('marketChart')}
                </button>
              </div>

              <div className="h-[450px]">
                {chartView === 'equity' ? (
                  <div className="p-4 h-full">
                    <EquityCurve height={400} />
                  </div>
                ) : (
                  <TradingViewChart height={450} />
                )}
              </div>
            </div>

            {/* Positions Table */}
            <PositionsTable positions={allPositions} />
          </div>

          {/* Right: Decisions Feed (~30%) */}
          <div className="lg:col-span-1">
            <DecisionsFeed decisions={allDecisions} locale={locale as string} />
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center text-white/30 text-xs py-4">
          {t('lastUpdated') || 'Last updated'}: {snapshot?.ts ? new Date(snapshot.ts).toLocaleString() : '-'}
        </div>
      </div>
    </AppLayout>
  )
}
