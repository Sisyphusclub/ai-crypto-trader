import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock fetch globally
global.fetch = vi.fn()

// Mock EventSource for SSE tests
class MockEventSource {
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  readyState = 0
  url: string

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.()
    }, 0)
  }

  close() {
    this.readyState = 2
  }
}

global.EventSource = MockEventSource as unknown as typeof EventSource

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})
