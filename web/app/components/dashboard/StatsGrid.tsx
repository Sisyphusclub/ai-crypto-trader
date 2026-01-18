'use client'

import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

export const StatCard = ({ label, value, subValue, icon, trend }: StatCardProps) => (
  <div className="stat-card group">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-white/50 mb-1">{label}</p>
        <p
          className={`text-2xl font-display font-bold ${
            trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-white'
          }`}
        >
          {value}
        </p>
        {subValue && (
          <p
            className={`text-xs mt-1 ${
              trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-white/40'
            }`}
          >
            {subValue}
          </p>
        )}
      </div>
      <div
        className={`p-2.5 rounded-lg transition-colors ${
          trend === 'up'
            ? 'bg-success/10 text-success'
            : trend === 'down'
            ? 'bg-danger/10 text-danger'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {icon}
      </div>
    </div>
  </div>
)

interface StatsGridProps {
  totalEquity: number
  availableBalance: number
  totalPnl: number
  positionCount: number
  t: (key: string) => string
}

export function StatsGrid({
  totalEquity,
  availableBalance,
  totalPnl,
  positionCount,
  t,
}: StatsGridProps) {
  const pnlTrend = totalPnl > 0 ? 'up' : totalPnl < 0 ? 'down' : 'neutral'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={t('totalEquity')}
        value={`${totalEquity.toFixed(2)} USDT`}
        subValue={
          totalPnl >= 0
            ? `+${((totalPnl / (totalEquity || 1)) * 100).toFixed(2)}%`
            : `${((totalPnl / (totalEquity || 1)) * 100).toFixed(2)}%`
        }
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        }
        trend={pnlTrend}
      />
      <StatCard
        label={t('availableBalance')}
        value={`${availableBalance.toFixed(2)} USDT`}
        subValue={t('freeBalance')}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
        }
        trend="neutral"
      />
      <StatCard
        label={t('totalPnl')}
        value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} USDT`}
        subValue={`${totalPnl >= 0 ? '+' : ''}${((totalPnl / (totalEquity || 1)) * 100).toFixed(2)}%`}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        trend={pnlTrend}
      />
      <StatCard
        label={t('positions')}
        value={positionCount}
        subValue={`${t('marginUsage')}: ${positionCount > 0 ? '48%' : '0%'}`}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        }
        trend={positionCount > 0 ? 'up' : 'neutral'}
      />
    </div>
  )
}
