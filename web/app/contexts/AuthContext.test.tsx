import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function TestConsumer() {
  const { user, loading, onboarding, login, register, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <span data-testid="onboarding">{onboarding?.complete ? 'complete' : 'incomplete'}</span>
      <button data-testid="login" onClick={() => login('testuser', 'password')}>Login</button>
      <button data-testid="register" onClick={() => register('newuser', 'password')}>Register</button>
      <button data-testid="logout" onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  const fetchMock = vi.fn()
  global.fetch = fetchMock

  beforeEach(() => {
    fetchMock.mockReset()
  })

  describe('Initial State', () => {
    it('starts with loading true and fetches user on mount', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready')
      })
      expect(screen.getByTestId('user')).toHaveTextContent('none')
    })

    it('loads user successfully on mount', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '1', username: 'existinguser', created_at: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_exchange: true, has_model: true, has_strategy: true, has_trader: true, complete: true }),
        })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('existinguser')
      })
      expect(screen.getByTestId('onboarding')).toHaveTextContent('complete')
    })
  })

  describe('Login', () => {
    it('login success updates user state', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '2', username: 'testuser', created_at: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_exchange: false, has_model: false, has_strategy: false, has_trader: false, complete: false }),
        })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready')
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('login'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser')
      })

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_URL}/api/v1/auth/login`,
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
    })

    it('login failure throws error', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Invalid credentials' }),
        })

      const errorSpy = vi.fn()

      function ErrorTestConsumer() {
        const { login } = useAuth()
        const handleLogin = async () => {
          try {
            await login('bad', 'creds')
          } catch (e) {
            errorSpy((e as Error).message)
          }
        }
        return <button data-testid="login" onClick={handleLogin}>Login</button>
      }

      render(
        <AuthProvider>
          <ErrorTestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {})

      await act(async () => {
        fireEvent.click(screen.getByTestId('login'))
      })

      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith('Invalid credentials')
      })
    })
  })

  describe('Register', () => {
    it('register success updates user state', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '3', username: 'newuser', created_at: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_exchange: false, has_model: false, has_strategy: false, has_trader: false, complete: false }),
        })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready')
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('register'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('newuser')
      })
    })
  })

  describe('Logout', () => {
    it('logout clears user and onboarding', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: '1', username: 'loggedin', created_at: new Date().toISOString() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_exchange: true, has_model: true, has_strategy: true, has_trader: true, complete: true }),
        })
        .mockResolvedValueOnce({ ok: true })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('loggedin')
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('logout'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('none')
        expect(screen.getByTestId('onboarding')).toHaveTextContent('incomplete')
      })
    })
  })

  describe('useAuth Hook', () => {
    it('throws when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestConsumer />)
      }).toThrow('useAuth must be used within AuthProvider')

      consoleError.mockRestore()
    })
  })
})
