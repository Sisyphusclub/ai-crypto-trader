'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getStreamUrl } from '../lib/api'

export interface SSEEvent {
  type: string
  ts: string
  data: Record<string, unknown>
}

interface UseSSEOptions {
  types?: string
  exchangeAccountId?: string
  onEvent?: (event: SSEEvent) => void
  reconnectDelay?: number
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    types = 'positions,orders,pnl,signals,decisions',
    exchangeAccountId,
    onEvent,
    reconnectDelay = 3000,
  } = options

  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastEventId, setLastEventId] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    let url = getStreamUrl(types)
    if (exchangeAccountId) {
      url += `&exchange_account_id=${exchangeAccountId}`
    }

    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data)
        setLastEventId(event.lastEventId || null)
        onEvent?.(parsed)
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
      setError('Connection lost')
      eventSource.close()

      // Auto-reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, reconnectDelay)
    }
  }, [types, exchangeAccountId, onEvent, reconnectDelay])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { connected, error, lastEventId, disconnect, reconnect: connect }
}
