import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SystemStatus from './SystemStatus'

describe('SystemStatus', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('renders section heading', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(<SystemStatus />)

    expect(screen.getByRole('heading', { name: 'System Status' })).toBeInTheDocument()
  })

  it('renders loading indicators initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(<SystemStatus />)

    const loadingDots = screen.getAllByTitle('Loading')
    expect(loadingDots.length).toBeGreaterThan(0)
  })

  it('renders operational status when health check passes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        env: 'production',
        db: { ok: true },
        redis: { ok: true },
        timestamp: new Date().toISOString(),
      }),
    })

    render(<SystemStatus />)

    await waitFor(() => {
      const operationalDots = screen.getAllByTitle('Operational')
      expect(operationalDots).toHaveLength(3)
    })
    expect(screen.getByText(/Env: production/)).toBeInTheDocument()
  })

  it('renders error status for API when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<SystemStatus />)

    await waitFor(() => {
      const downDots = screen.getAllByTitle('Down')
      expect(downDots.length).toBeGreaterThan(0)
    })
  })

  it('renders error status for specific services', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        env: 'production',
        db: { ok: false, error: 'Connection refused' },
        redis: { ok: true },
        timestamp: new Date().toISOString(),
      }),
    })

    render(<SystemStatus />)

    await waitFor(() => {
      expect(screen.getByTitle('Connection refused')).toBeInTheDocument()
    })
  })

  it('shows HTTP error when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    })

    render(<SystemStatus />)

    await waitFor(() => {
      const downDots = screen.getAllByTitle('Down')
      expect(downDots.length).toBeGreaterThan(0)
    })
  })

  it('displays all service rows', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        env: 'dev',
        db: { ok: true },
        redis: { ok: true },
        timestamp: new Date().toISOString(),
      }),
    })

    render(<SystemStatus />)

    await waitFor(() => {
      expect(screen.getByText('API Server')).toBeInTheDocument()
      expect(screen.getByText('Database')).toBeInTheDocument()
      expect(screen.getByText('Redis')).toBeInTheDocument()
    })
  })
})
