'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppLayout } from '../../components/layout'

export default function ReplayPage() {
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const tReplay = useTranslations('replay')
  const { locale } = useParams()
  const [selectedRange, setSelectedRange] = useState('7d')

  return (
    <AppLayout locale={locale as string} mode="paper">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{tNav('replay')}</h1>
            <p className="text-white/40 text-sm mt-1">{tReplay('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="select-field"
            >
              <option value="1d">{tReplay('last24h')}</option>
              <option value="7d">{tReplay('last7d')}</option>
              <option value="30d">{tReplay('last30d')}</option>
              <option value="90d">{tReplay('last90d')}</option>
            </select>
            <button className="btn-primary flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              {tReplay('startReplay')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-white">0</p>
                <p className="text-xs text-white/40">{tReplay('totalReplays')}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-success">0%</p>
                <p className="text-xs text-white/40">{tReplay('winRate')}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-accent">$0</p>
                <p className="text-xs text-white/40">{tReplay('simulatedPnl')}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-info">0h</p>
                <p className="text-xs text-white/40">{tReplay('replayTime')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{tReplay('replayTimeline')}</h2>
              <div className="flex items-center gap-2">
                <button className="btn-ghost p-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062A1.125 1.125 0 0121 8.688v8.123zM11.25 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062a1.125 1.125 0 011.683.977v8.123z" />
                  </svg>
                </button>
                <button className="btn-ghost p-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                </button>
                <button className="btn-ghost p-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface-500/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <p className="text-white/60 text-center mb-2">{tReplay('noReplaySessions')}</p>
              <p className="text-white/40 text-sm text-center max-w-sm">
                {tReplay('startReplayHint')}
              </p>
            </div>
          </div>

          {/* Replay Config */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{tReplay('replayConfig')}</h2>

            <div className="space-y-4">
              <div>
                <label className="label">{tReplay('selectStrategy')}</label>
                <select className="select-field">
                  <option value="">{tReplay('chooseStrategy')}</option>
                </select>
              </div>

              <div>
                <label className="label">{tReplay('selectTrader')}</label>
                <select className="select-field">
                  <option value="">{tReplay('chooseTrader')}</option>
                </select>
              </div>

              <div>
                <label className="label">{tReplay('playbackSpeed')}</label>
                <select className="select-field">
                  <option value="1">1x ({tReplay('realtime')})</option>
                  <option value="2">2x</option>
                  <option value="5">5x</option>
                  <option value="10">10x</option>
                  <option value="100">100x ({tReplay('fast')})</option>
                </select>
              </div>

              <div>
                <label className="label">{tReplay('initialBalance')}</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="10000"
                  defaultValue={10000}
                />
              </div>

              <div className="divider" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{tReplay('enableStopLoss')}</span>
                <button className="w-10 h-6 rounded-full bg-surface-500 relative transition-colors">
                  <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white/60 transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{tReplay('enableTakeProfit')}</span>
                <button className="w-10 h-6 rounded-full bg-surface-500 relative transition-colors">
                  <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white/60 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Replay History */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white">{tReplay('replayHistory')}</h2>
          </div>
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-white/40">{tCommon('noData')}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
