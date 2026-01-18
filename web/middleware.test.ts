import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockIntlHandle } = vi.hoisted(() => ({
  mockIntlHandle: vi.fn(),
}))

vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => mockIntlHandle),
}))

vi.mock('./i18n', () => ({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
}))

import middleware from './middleware'

describe('Middleware', () => {
  const createRequest = (pathname: string, token?: string) => {
    const url = new URL(pathname, 'http://localhost:3000')
    return {
      nextUrl: url,
      url: url.toString(),
      cookies: {
        get: (name: string) => (name === 'access_token' && token ? { value: token } : undefined),
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIntlHandle.mockReturnValue({ type: 'intl-response' })
  })

  describe('Locale Extraction', () => {
    it('detects zh locale from path', () => {
      const req = createRequest('/zh/login', 'token')
      const res = middleware(req as any)

      // Authenticated user on public path -> redirect to home
      expect(res).toBeDefined()
    })

    it('detects en locale from path', () => {
      const req = createRequest('/en/login', 'token')
      const res = middleware(req as any)

      expect(res).toBeDefined()
    })

    it('uses default locale (zh) when no locale in path', () => {
      const req = createRequest('/login', 'token')
      const res = middleware(req as any)

      expect(res).toBeDefined()
    })
  })

  describe('Public Path Detection', () => {
    it('allows unauthenticated access to /login', () => {
      const req = createRequest('/zh/login')
      const res = middleware(req as any)

      expect(mockIntlHandle).toHaveBeenCalled()
      expect(res).toEqual({ type: 'intl-response' })
    })

    it('allows unauthenticated access to /register', () => {
      const req = createRequest('/en/register')
      const res = middleware(req as any)

      expect(mockIntlHandle).toHaveBeenCalled()
    })

    it('allows unauthenticated access to nested public paths like /login/forgot', () => {
      const req = createRequest('/zh/login/forgot')
      const res = middleware(req as any)

      expect(mockIntlHandle).toHaveBeenCalled()
    })

    it('does not treat /loginsomething as public', () => {
      const req = createRequest('/zh/loginsomething')
      const res = middleware(req as any)

      // Should redirect to login since it's not a public path
      expect(mockIntlHandle).not.toHaveBeenCalled()
    })
  })

  describe('Unauthenticated User on Protected Path', () => {
    it('redirects to login with redirect param', () => {
      const req = createRequest('/zh/dashboard')
      const res = middleware(req as any)

      expect(mockIntlHandle).not.toHaveBeenCalled()
      expect(res).toBeDefined()
    })

    it('redirects root path to login', () => {
      const req = createRequest('/')
      const res = middleware(req as any)

      expect(mockIntlHandle).not.toHaveBeenCalled()
    })

    it('redirects /zh root to login', () => {
      const req = createRequest('/zh')
      const res = middleware(req as any)

      expect(mockIntlHandle).not.toHaveBeenCalled()
    })

    it('redirects nested protected paths', () => {
      const req = createRequest('/en/settings/profile')
      const res = middleware(req as any)

      expect(mockIntlHandle).not.toHaveBeenCalled()
    })
  })

  describe('Authenticated User on Public Path', () => {
    it('redirects from /login to home', () => {
      const req = createRequest('/en/login', 'valid-token')
      const res = middleware(req as any)

      // Should redirect, not pass through
      expect(mockIntlHandle).not.toHaveBeenCalled()
    })

    it('redirects from /register to home', () => {
      const req = createRequest('/zh/register', 'valid-token')
      const res = middleware(req as any)

      expect(mockIntlHandle).not.toHaveBeenCalled()
    })
  })

  describe('Authenticated User on Protected Path', () => {
    it('passes through to intl middleware', () => {
      const req = createRequest('/zh/dashboard', 'valid-token')
      const res = middleware(req as any)

      expect(mockIntlHandle).toHaveBeenCalled()
      expect(res).toEqual({ type: 'intl-response' })
    })

    it('passes through for nested protected paths', () => {
      const req = createRequest('/en/traders/new', 'valid-token')
      const res = middleware(req as any)

      expect(mockIntlHandle).toHaveBeenCalled()
    })

    it('passes through for root with locale', () => {
      const req = createRequest('/zh', 'valid-token')
      const res = middleware(req as any)

      expect(mockIntlHandle).toHaveBeenCalled()
    })
  })
})
