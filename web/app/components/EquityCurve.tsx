'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface EquityCurveProps {
  className?: string
  height?: number
}

interface TimeseriesPoint {
  ts: string
  equity: number
  pnl: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const TIME_RANGES = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: 'All', days: 365 },
]

export function EquityCurve({ className = '', height = 300 }: EquityCurveProps) {
  const [data, setData] = useState<TimeseriesPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRange, setSelectedRange] = useState(7)

  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        setLoading(true)
        const toDate = new Date()
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - selectedRange)

        const params = new URLSearchParams({
          from_date: fromDate.toISOString().split('T')[0],
          to_date: toDate.toISOString().split('T')[0],
        })

        const res = await fetch(`${API_URL}/api/v1/pnl/timeseries?${params}`, {
          credentials: 'include',
        })

        if (res.ok) {
          const json = await res.json()
          setData(json.data || [])
          setError(null)
        } else {
          setData([])
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchTimeseries()
  }, [selectedRange])

  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: new Date(point.ts).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: selectedRange <= 1 ? '2-digit' : undefined,
      }),
      equity: point.equity,
      pnl: point.pnl,
    }))
  }, [data, selectedRange])

  const isPositive = useMemo(() => {
    if (chartData.length < 2) return true
    return chartData[chartData.length - 1].equity >= chartData[0].equity
  }, [chartData])

  const gradientId = 'equityGradient'
  const strokeColor = isPositive ? '#10b981' : '#ef4444'
  const fillColor = isPositive ? '#10b981' : '#ef4444'

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="flex items-center gap-2 text-white/40">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (error || chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center text-white/40">
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
          <p className="text-sm">No equity data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-end gap-1 mb-3">
        {TIME_RANGES.map((range) => (
          <button
            key={range.days}
            onClick={() => setSelectedRange(range.days)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedRange === range.days
                ? 'bg-primary text-white'
                : 'bg-surface-400 text-white/60 hover:text-white hover:bg-surface-300'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 15, 25, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}
            formatter={(value) => {
              if (value === undefined) return ['--', 'Equity']
              return [
                `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                'Equity',
              ]
            }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
