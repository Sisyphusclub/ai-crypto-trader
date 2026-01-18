'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  username: string
  created_at: string
}

interface OnboardingStatus {
  has_exchange: boolean
  has_model: boolean
  has_strategy: boolean
  has_trader: boolean
  complete: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  onboarding: OnboardingStatus | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshOnboarding: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' })
      if (res.ok) {
        setUser(await res.json())
        await refreshOnboarding()
      } else {
        setUser(null)
        setOnboarding(null)
      }
    } catch {
      setUser(null)
      setOnboarding(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshOnboarding = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/onboarding-status`, { credentials: 'include' })
      if (res.ok) setOnboarding(await res.json())
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    setUser(await res.json())
    await refreshOnboarding()
  }

  const register = async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Registration failed')
    }
    setUser(await res.json())
    await refreshOnboarding()
  }

  const logout = async () => {
    await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
    setOnboarding(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, onboarding, login, register, logout, refreshOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
