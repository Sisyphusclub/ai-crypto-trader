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
})
