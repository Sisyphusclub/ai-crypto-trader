'use client'

import { useEffect, useRef, memo, useState } from 'react'

interface TradingViewChartProps {
  exchange?: 'BINANCE' | 'GATEIO'
  symbol?: string
  interval?: string
  theme?: 'dark' | 'light'
  height?: number
}

const INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
]

const EXCHANGES = [
  { label: 'Binance', value: 'BINANCE' },
  { label: 'Gate.io', value: 'GATEIO' },
]

function TradingViewChartInner({
  exchange = 'BINANCE',
  symbol = 'BTCUSDT',
  interval = '60',
  theme = 'dark',
  height = 400,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedExchange, setSelectedExchange] = useState(exchange)
  const [selectedSymbol, setSelectedSymbol] = useState(symbol)
  const [selectedInterval, setSelectedInterval] = useState(interval)
  const [inputSymbol, setInputSymbol] = useState(symbol)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `${selectedExchange}:${selectedSymbol}.P`,
      interval: selectedInterval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: theme === 'dark' ? 'rgba(15, 15, 25, 1)' : 'rgba(255, 255, 255, 1)',
      gridColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    })

    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container__widget'
    widgetContainer.style.height = `${height}px`
    widgetContainer.style.width = '100%'

    container.appendChild(widgetContainer)
    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [selectedExchange, selectedSymbol, selectedInterval, theme, height])

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputSymbol.trim()) {
      setSelectedSymbol(inputSymbol.trim().toUpperCase())
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-white/5 flex-wrap">
        <select
          value={selectedExchange}
          onChange={(e) => setSelectedExchange(e.target.value as 'BINANCE' | 'GATEIO')}
          className="bg-surface-400 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
        >
          {EXCHANGES.map((ex) => (
            <option key={ex.value} value={ex.value}>
              {ex.label}
            </option>
          ))}
        </select>

        <form onSubmit={handleSymbolSubmit} className="flex items-center gap-1">
          <input
            type="text"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
            placeholder="BTCUSDT"
            className="w-24 bg-surface-400 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            className="bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1.5 rounded text-sm transition-colors"
          >
            Go
          </button>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          {INTERVALS.map((int) => (
            <button
              key={int.value}
              onClick={() => setSelectedInterval(int.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedInterval === int.value
                  ? 'bg-primary text-white'
                  : 'bg-surface-400 text-white/60 hover:text-white hover:bg-surface-300'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="tradingview-widget-container flex-1"
        style={{ height: height, width: '100%' }}
      />
    </div>
  )
}

export const TradingViewChart = memo(TradingViewChartInner)
