import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SignalsPanel from './SignalsPanel'
import * as api from '../lib/api'

vi.mock('../lib/api', () => ({
  fetchSignals: vi.fn(),
}))

describe('SignalsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(api.fetchSignals).mockReturnValue(new Promise(() => {}))
    render(<SignalsPanel />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders section heading', () => {
    vi.mocked(api.fetchSignals).mockReturnValue(new Promise(() => {}))
    render(<SignalsPanel />)
    expect(screen.getByRole('heading', { name: 'Recent Signals' })).toBeInTheDocument()
  })

  it('renders empty state when no signals returned', async () => {
    vi.mocked(api.fetchSignals).mockResolvedValue([])
    render(<SignalsPanel />)

    await waitFor(() => {
      expect(screen.getByText('No signals yet.')).toBeInTheDocument()
      expect(screen.getByText('Configure strategies')).toBeInTheDocument()
    })
  })

  it('renders a list of signals', async () => {
    const mockSignals = [
      { id: '1', symbol: 'BTCUSDT', side: 'long', timeframe: '1h', created_at: new Date().toISOString(), reason_summary: 'RSI oversold' },
      { id: '2', symbol: 'ETHUSDT', side: 'short', timeframe: '15m', created_at: new Date().toISOString() },
    ]
    vi.mocked(api.fetchSignals).mockResolvedValue(mockSignals)

    render(<SignalsPanel />)

    await waitFor(() => {
      expect(screen.getByText('BTCUSDT')).toBeInTheDocument()
      expect(screen.getByText('ETHUSDT')).toBeInTheDocument()
      expect(screen.getByText('LONG')).toBeInTheDocument()
      expect(screen.getByText('SHORT')).toBeInTheDocument()
      expect(screen.getByText('RSI oversold')).toBeInTheDocument()
    })
  })

  it('renders filter buttons', () => {
    vi.mocked(api.fetchSignals).mockReturnValue(new Promise(() => {}))
    render(<SignalsPanel />)

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Long' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Short' })).toBeInTheDocument()
  })

  it('calls fetchSignals with correct filters when buttons are clicked', async () => {
    vi.mocked(api.fetchSignals).mockResolvedValue([])
    render(<SignalsPanel />)

    await waitFor(() => {
      expect(api.fetchSignals).toHaveBeenCalled()
    })

    const longBtn = screen.getByRole('button', { name: 'Long' })
    fireEvent.click(longBtn)

    await waitFor(() => {
      expect(api.fetchSignals).toHaveBeenCalledWith(expect.objectContaining({ side: 'long' }))
    })
  })

  it('shows error message when fetch fails', async () => {
    vi.mocked(api.fetchSignals).mockRejectedValue(new Error('Network error'))
    render(<SignalsPanel />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('displays timeframe for each signal', async () => {
    const mockSignals = [
      { id: '1', symbol: 'BTCUSDT', side: 'long', timeframe: '4h', created_at: new Date().toISOString() },
    ]
    vi.mocked(api.fetchSignals).mockResolvedValue(mockSignals)

    render(<SignalsPanel />)

    await waitFor(() => {
      expect(screen.getByText('4h')).toBeInTheDocument()
    })
  })

  it('has link to view all signals', () => {
    vi.mocked(api.fetchSignals).mockReturnValue(new Promise(() => {}))
    render(<SignalsPanel />)

    expect(screen.getByRole('link', { name: 'View all signals' })).toHaveAttribute('href', '/signals')
  })
})
