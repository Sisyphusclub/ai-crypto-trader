'use client'

import { useTranslations } from 'next-intl'
import { Position } from '../types/dashboard'

interface PositionsTableProps {
  positions: Position[]
  showBadge?: boolean
}

export function PositionsTable({ positions, showBadge = true }: PositionsTableProps) {
  const t = useTranslations('overview')

  if (positions.length === 0) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-white">
            {t('currentPositions')}
          </h2>
        </div>
        <div className="flex items-center justify-center h-32 text-white/40">
          <div className="text-center">
            <svg
              className="w-10 h-10 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <p className="text-sm">{t('noPositions')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold text-white">
          {t('currentPositions')}
        </h2>
        {showBadge && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
            {positions.length} {t('active')}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-500/30">
            <tr>
              <th className="table-header">{t('symbol')}</th>
              <th className="table-header">{t('side')}</th>
              <th className="table-header">{t('quantity')}</th>
              <th className="table-header">{t('entryPrice')}</th>
              <th className="table-header">{t('leverage')}</th>
              <th className="table-header">{t('unrealizedPnl')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {positions.map((p, i) => {
              const pnl = parseFloat(p.unrealized_pnl || '0')
              return (
                <tr key={i} className="table-row hover:bg-white/[0.02] transition-colors">
                  <td className="table-cell font-medium text-white">{p.symbol}</td>
                  <td className="table-cell">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        p.side === 'long' || p.side === 'LONG'
                          ? 'bg-success/20 text-success'
                          : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {p.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell text-white/80">
                    {parseFloat(p.quantity).toFixed(4)}
                  </td>
                  <td className="table-cell text-white/80">
                    ${parseFloat(p.entry_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="table-cell text-white/80">{p.leverage}x</td>
                  <td className="table-cell">
                    <span className={pnl >= 0 ? 'text-success' : 'text-danger'}>
                      {pnl >= 0 ? '+' : ''}
                      ${pnl.toFixed(2)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
