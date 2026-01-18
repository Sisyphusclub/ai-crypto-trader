import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const mockPush = vi.fn()
const mockPathname = vi.fn(() => '/en/dashboard')

vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}))

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}))

const mockLogout = vi.fn()
const mockUser = { id: '1', username: 'testuser', created_at: new Date().toISOString() }

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}))

import Topbar from './Topbar'

describe('Topbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/en/dashboard')

    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
  })

  describe('Mode Badge', () => {
    it('renders paper mode badge with yellow styling', () => {
      render(<Topbar locale="en" mode="paper" />)

      const badge = screen.getByText('topbar.paper')
      expect(badge).toHaveClass('bg-yellow-500')
      expect(badge).toHaveClass('text-black')
    })

    it('renders live mode badge with red styling and animation', () => {
      render(<Topbar locale="en" mode="live" />)

      const badge = screen.getByText('topbar.live')
      expect(badge).toHaveClass('bg-red-600')
      expect(badge).toHaveClass('animate-pulse')
    })
  })

  describe('Language Switcher', () => {
    it('renders language button with current locale', () => {
      render(<Topbar locale="en" mode="paper" />)

      // Locale is displayed lowercase in the component
      expect(screen.getByText('en')).toBeInTheDocument()
    })

    it('opens language dropdown on click', async () => {
      render(<Topbar locale="en" mode="paper" />)

      const langButton = screen.getByText('🌐').closest('button')
      fireEvent.click(langButton!)

      expect(screen.getByText('中文')).toBeInTheDocument()
      expect(screen.getByText('English')).toBeInTheDocument()
    })

    it('switches locale and navigates', async () => {
      render(<Topbar locale="en" mode="paper" />)

      const langButton = screen.getByText('🌐').closest('button')
      fireEvent.click(langButton!)

      const zhButton = screen.getByText('中文')
      fireEvent.click(zhButton)

      expect(mockPush).toHaveBeenCalledWith('/zh/dashboard')
    })

    it('handles root locale path correctly', async () => {
      mockPathname.mockReturnValue('/en')

      render(<Topbar locale="en" mode="paper" />)

      const langButton = screen.getByText('🌐').closest('button')
      fireEvent.click(langButton!)

      const zhButton = screen.getByText('中文')
      fireEvent.click(zhButton)

      expect(mockPush).toHaveBeenCalledWith('/zh')
    })

    it('closes dropdown when clicking outside', async () => {
      render(<Topbar locale="en" mode="paper" />)

      const langButton = screen.getByText('🌐').closest('button')
      fireEvent.click(langButton!)

      expect(screen.getByText('中文')).toBeInTheDocument()

      fireEvent.mouseDown(document.body)

      await waitFor(() => {
        expect(screen.queryByText('中文')).not.toBeInTheDocument()
      })
    })
  })

  describe('User Menu', () => {
    it('renders user avatar with first letter', () => {
      render(<Topbar locale="en" mode="paper" />)

      expect(screen.getByText('T')).toBeInTheDocument()
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('opens user dropdown on click', async () => {
      render(<Topbar locale="en" mode="paper" />)

      const userButton = screen.getByText('testuser').closest('button')
      fireEvent.click(userButton!)

      expect(screen.getByText('topbar.profile')).toBeInTheDocument()
      expect(screen.getByText('auth.logout')).toBeInTheDocument()
    })

    it('navigates to settings on profile click', async () => {
      render(<Topbar locale="en" mode="paper" />)

      const userButton = screen.getByText('testuser').closest('button')
      fireEvent.click(userButton!)

      const profileLink = screen.getByText('topbar.profile')
      expect(profileLink.closest('a')).toHaveAttribute('href', '/en/settings')
    })

    it('calls logout and redirects on logout click', async () => {
      render(<Topbar locale="en" mode="paper" />)

      const userButton = screen.getByText('testuser').closest('button')
      fireEvent.click(userButton!)

      const logoutButton = screen.getByText('auth.logout')
      await act(async () => {
        fireEvent.click(logoutButton)
      })

      expect(mockLogout).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/en/login')
    })
  })

  describe('Accessibility', () => {
    it('has accessible button elements', () => {
      render(<Topbar locale="en" mode="paper" />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })
  })
})
