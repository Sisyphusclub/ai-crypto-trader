'use client'

import { useEffect, useState } from 'react'

interface ServiceStatus {
  ok: boolean
  error?: string
}

interface HealthData {
  ok: boolean
  env: string
  db: ServiceStatus
  redis: ServiceStatus
  timestamp: string
}

type Status = 'loading' | 'ok' | 'error'

const statusLabels: Record<Status, string> = {
  loading: 'Loading',
  ok: 'Operational',
  error: 'Down',
}

function StatusDot({ status }: { status: Status }) {
  const colors = {
    loading: 'bg-yellow-500 animate-pulse',
    ok: 'bg-green-500',
    error: 'bg-red-500',
  }
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colors[status]}`}
      role="status"
      aria-label={statusLabels[status]}
      title={statusLabels[status]}
    />
  )
}

function StatusRow({ label, status, error }: { label: string; status: Status; error?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-red-400 max-w-[150px] truncate" title={error}>
            {error}
          </span>
        )}
        <StatusDot status={status} />
        <span className="sr-only">{statusLabels[status]}</span>
      </div>
    </div>
  )
}

export default function SystemStatus() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/health`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHealth(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const getStatus = (svc: ServiceStatus | undefined): Status => {
    if (loading) return 'loading'
    if (!svc) return 'error'
    return svc.ok ? 'ok' : 'error'
  }

  const apiStatus: Status = loading ? 'loading' : (health ? 'ok' : 'error')

  return (
    <section className="bg-gray-900 rounded-lg p-4 max-w-sm" aria-labelledby="system-status-heading">
      <h2 id="system-status-heading" className="text-lg font-semibold text-gray-100 mb-3">
        System Status
      </h2>
      <div className="space-y-0" role="list">
        <StatusRow label="API Server" status={apiStatus} error={error || undefined} />
        <StatusRow
          label="Database"
          status={getStatus(health?.db)}
          error={health?.db?.error}
        />
        <StatusRow
          label="Redis"
          status={getStatus(health?.redis)}
          error={health?.redis?.error}
        />
      </div>
      {health && (
        <div className="mt-3 text-xs text-gray-500">
          Env: {health.env} | Last check: {new Date(health.timestamp).toLocaleTimeString()}
        </div>
      )}
    </section>
  )
}
