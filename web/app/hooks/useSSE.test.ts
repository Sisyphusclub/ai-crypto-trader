import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSSE } from './useSSE'

const mockEventSourceInstance = {
  onopen: null as (() => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as (() => void) | null,
  close: vi.fn(),
}

const MockEventSource = vi.fn(() => mockEventSourceInstance)
global.EventSource = MockEventSource as unknown as typeof EventSource

describe('useSSE', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockEventSource.mockClear()
    mockEventSourceInstance.close.mockClear()
    mockEventSourceInstance.onopen = null
    mockEventSourceInstance.onmessage = null
    mockEventSourceInstance.onerror = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('connects to EventSource on mount', () => {
    renderHook(() => useSSE())
    expect(MockEventSource).toHaveBeenCalledWith(expect.stringContaining('/api/v1/stream'))
  })

  it('includes exchange account ID in URL when provided', () => {
    renderHook(() => useSSE({ exchangeAccountId: 'acc123' }))
    expect(MockEventSource).toHaveBeenCalledWith(expect.stringContaining('exchange_account_id=acc123'))
  })

  it('handles connection success', () => {
    const { result } = renderHook(() => useSSE())

    act(() => {
      mockEventSourceInstance.onopen?.()
    })

    expect(result.current.connected).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('parses incoming events and calls onEvent', () => {
    const onEvent = vi.fn()
    renderHook(() => useSSE({ onEvent }))

    const testEvent = { type: 'price', ts: '123', data: { value: 100 } }

    act(() => {
      mockEventSourceInstance.onmessage?.({
        data: JSON.stringify(testEvent),
        lastEventId: 'evt_1'
      } as MessageEvent)
    })

    expect(onEvent).toHaveBeenCalledWith(testEvent)
  })

  it('updates lastEventId when received', () => {
    const { result } = renderHook(() => useSSE())

    act(() => {
      mockEventSourceInstance.onmessage?.({
        data: JSON.stringify({ type: 'test', ts: '1', data: {} }),
        lastEventId: 'evt_123'
      } as MessageEvent)
    })

    expect(result.current.lastEventId).toBe('evt_123')
  })

  it('handles errors and attempts reconnect', () => {
    const { result } = renderHook(() => useSSE({ reconnectDelay: 1000 }))

    act(() => {
      mockEventSourceInstance.onerror?.()
    })

    expect(result.current.connected).toBe(false)
    expect(result.current.error).toBe('Connection lost')
    expect(mockEventSourceInstance.close).toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(MockEventSource).toHaveBeenCalledTimes(2)
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useSSE())

    unmount()

    expect(mockEventSourceInstance.close).toHaveBeenCalled()
  })

  it('provides disconnect and reconnect methods', () => {
    const { result } = renderHook(() => useSSE())

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.connected).toBe(false)
    expect(mockEventSourceInstance.close).toHaveBeenCalled()

    act(() => {
      result.current.reconnect()
    })

    expect(MockEventSource).toHaveBeenCalledTimes(2)
  })

  it('ignores parse errors for invalid JSON', () => {
    const onEvent = vi.fn()
    renderHook(() => useSSE({ onEvent }))

    act(() => {
      mockEventSourceInstance.onmessage?.({
        data: 'invalid json',
        lastEventId: ''
      } as MessageEvent)
    })

    expect(onEvent).not.toHaveBeenCalled()
  })

  it('handles multiple event types correctly', () => {
    const onEvent = vi.fn()
    renderHook(() => useSSE({ types: 'positions,orders,signals', onEvent }))

    expect(MockEventSource).toHaveBeenCalledWith(expect.stringContaining('types=positions,orders,signals'))

    const events = [
      { type: 'positions', ts: '1', data: { symbol: 'BTCUSDT', quantity: 1 } },
      { type: 'orders', ts: '2', data: { orderId: 'ord-1', status: 'filled' } },
      { type: 'signals', ts: '3', data: { side: 'long', score: 0.85 } },
    ]

    events.forEach((event) => {
      act(() => {
        mockEventSourceInstance.onmessage?.({
          data: JSON.stringify(event),
          lastEventId: `evt_${event.ts}`
        } as MessageEvent)
      })
    })

    expect(onEvent).toHaveBeenCalledTimes(3)
    expect(onEvent).toHaveBeenNthCalledWith(1, events[0])
    expect(onEvent).toHaveBeenNthCalledWith(2, events[1])
    expect(onEvent).toHaveBeenNthCalledWith(3, events[2])
  })

  it('handles rapid reconnection attempts with debounce', () => {
    const { result } = renderHook(() => useSSE({ reconnectDelay: 500 }))

    // Simulate multiple rapid errors
    act(() => {
      mockEventSourceInstance.onerror?.()
    })
    act(() => {
      vi.advanceTimersByTime(100)
      mockEventSourceInstance.onerror?.()
    })
    act(() => {
      vi.advanceTimersByTime(100)
      mockEventSourceInstance.onerror?.()
    })

    // Should still only reconnect once after the delay
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.connected).toBe(false)
    expect(mockEventSourceInstance.close).toHaveBeenCalled()
  })

  it('clears reconnect timeout on manual disconnect', () => {
    const { result } = renderHook(() => useSSE({ reconnectDelay: 5000 }))

    // Trigger error to schedule reconnect
    act(() => {
      mockEventSourceInstance.onerror?.()
    })

    // Manually disconnect before reconnect fires
    act(() => {
      result.current.disconnect()
    })

    // Advance past reconnect delay
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Should only have 1 connection (initial), not 2
    expect(MockEventSource).toHaveBeenCalledTimes(1)
  })

  it('handles empty event data gracefully', () => {
    const onEvent = vi.fn()
    renderHook(() => useSSE({ onEvent }))

    act(() => {
      mockEventSourceInstance.onmessage?.({
        data: '',
        lastEventId: ''
      } as MessageEvent)
    })

    expect(onEvent).not.toHaveBeenCalled()
  })

  it('handles null lastEventId', () => {
    const { result } = renderHook(() => useSSE())

    act(() => {
      mockEventSourceInstance.onmessage?.({
        data: JSON.stringify({ type: 'test', ts: '1', data: {} }),
        lastEventId: ''
      } as MessageEvent)
    })

    expect(result.current.lastEventId).toBeNull()
  })

  it('closes existing connection before creating new one on reconnect', () => {
    const { result } = renderHook(() => useSSE())

    act(() => {
      result.current.reconnect()
    })

    expect(mockEventSourceInstance.close).toHaveBeenCalled()
    expect(MockEventSource).toHaveBeenCalledTimes(2)
  })

  it('handles decision and execution event types', () => {
    const onEvent = vi.fn()
    renderHook(() => useSSE({ types: 'decisions,executions', onEvent }))

    const decisionEvent = {
      type: 'decisions',
      ts: '100',
      data: { status: 'executed', confidence: 0.8 }
    }

    act(() => {
      mockEventSourceInstance.onmessage?.({
        data: JSON.stringify(decisionEvent),
        lastEventId: 'evt_decision_1'
      } as MessageEvent)
    })

    expect(onEvent).toHaveBeenCalledWith(decisionEvent)
  })
})
