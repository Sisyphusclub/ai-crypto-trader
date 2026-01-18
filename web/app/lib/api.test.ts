import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

describe('API Client', () => {
  const fetchMock = vi.fn()
  global.fetch = fetchMock

  beforeEach(() => {
    fetchMock.mockReset()
  })

  describe('Strategies API', () => {
    it('fetchStrategies returns data on success', async () => {
      const mockData = [{ id: '1', name: 'Strategy 1' }]
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await api.fetchStrategies()
      expect(result).toEqual(mockData)
      expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/v1/strategies`, { cache: 'no-store' })
    })

    it('fetchStrategies throws on HTTP error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(api.fetchStrategies()).rejects.toThrow('HTTP 500')
    })

    it('fetchStrategy returns single strategy', async () => {
      const mockData = { id: '1', name: 'Strategy 1' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await api.fetchStrategy('1')
      expect(result).toEqual(mockData)
      expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/v1/strategies/1`, { cache: 'no-store' })
    })

    it('createStrategy sends POST request with body', async () => {
      const payload = { name: 'New Strat' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', ...payload }),
      })

      await api.createStrategy(payload)
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_URL}/api/v1/strategies`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      )
    })

    it('updateStrategy sends PUT request', async () => {
      const payload = { name: 'Updated' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', ...payload }),
      })

      await api.updateStrategy('1', payload)
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_URL}/api/v1/strategies/1`,
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('deleteStrategy sends DELETE request', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true })

      await api.deleteStrategy('1')
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_URL}/api/v1/strategies/1`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('toggleStrategy sends POST to toggle endpoint', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enabled: true }),
      })

      await api.toggleStrategy('1')
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_URL}/api/v1/strategies/1/toggle`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('handles detailed error messages from API', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Invalid configuration' }),
      })
      await expect(api.createStrategy({})).rejects.toThrow('Invalid configuration')
    })
  })

  describe('Signals API', () => {
    it('fetchSignals constructs query parameters correctly', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await api.fetchSignals({ side: 'long', limit: 10, symbol: 'BTC' })

      const callUrl = fetchMock.mock.calls[0][0] as string
      expect(callUrl).toContain('/api/v1/signals?')
      expect(callUrl).toContain('side=long')
      expect(callUrl).toContain('limit=10')
      expect(callUrl).toContain('symbol=BTC')
    })

    it('fetchSignal returns single signal', async () => {
      const mockData = { id: '1', symbol: 'BTCUSDT' }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await api.fetchSignal('1')
      expect(result).toEqual(mockData)
    })
  })

  describe('Traders API', () => {
    it('fetchTraders with enabled filter', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await api.fetchTraders(true)
      const callUrl = fetchMock.mock.calls[0][0] as string
      expect(callUrl).toContain('enabled=true')
    })

    it('startTrader sends confirm flag', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'started' }),
      })

      await api.startTrader('1', true)
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_URL}/api/v1/traders/1/start`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ confirm: true }),
        })
      )
    })
  })

  describe('Logs API', () => {
    it('fetchDecisions handles pagination params', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await api.fetchDecisions({ limit: 50, offset: 100 })
      const callUrl = fetchMock.mock.calls[0][0] as string
      expect(callUrl).toContain('limit=50')
      expect(callUrl).toContain('offset=100')
    })

    it('fetchExecutions with status filter', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await api.fetchExecutions({ status: 'completed' })
      const callUrl = fetchMock.mock.calls[0][0] as string
      expect(callUrl).toContain('status=completed')
    })
  })

  describe('Stream API', () => {
    it('getStreamUrl constructs correct SSE URL', () => {
      const url = api.getStreamUrl('orders,pnl')
      expect(url).toBe(`${API_URL}/api/v1/stream?types=orders,pnl`)
    })

    it('fetchStreamSnapshot with exchange account filter', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: [] }),
      })

      await api.fetchStreamSnapshot('acc123')
      const callUrl = fetchMock.mock.calls[0][0] as string
      expect(callUrl).toContain('exchange_account_id=acc123')
    })
  })

  describe('PnL API', () => {
    it('fetchPnlSummary with date range', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 100 }),
      })

      await api.fetchPnlSummary({ from_date: '2024-01-01', to_date: '2024-01-31' })
      const callUrl = fetchMock.mock.calls[0][0] as string
      expect(callUrl).toContain('from_date=2024-01-01')
      expect(callUrl).toContain('to_date=2024-01-31')
    })
  })

  describe('Replay API', () => {
    it('getReplayExportUrl constructs correct URL', () => {
      const url = api.getReplayExportUrl('decision', 'dec123')
      expect(url).toBe(`${API_URL}/api/v1/replay/decision/dec123/export`)
    })
  })
})
