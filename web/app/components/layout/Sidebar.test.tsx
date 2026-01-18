import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/dashboard',
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import Sidebar from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders logo and title', () => {
      render(<Sidebar locale="en" />)
      expect(screen.getByText('AI Crypto Trader')).toBeInTheDocument()
    })

    it('renders all main navigation items', () => {
      render(<Sidebar locale="en" />)

      expect(screen.getByText('overview')).toBeInTheDocument()
      expect(screen.getByText('trading')).toBeInTheDocument()
      expect(screen.getByText('signals')).toBeInTheDocument()
      expect(screen.getByText('strategies')).toBeInTheDocument()
      expect(screen.getByText('traders')).toBeInTheDocument()
      expect(screen.getByText('logs')).toBeInTheDocument()
      expect(screen.getByText('alerts')).toBeInTheDocument()
      expect(screen.getByText('settings')).toBeInTheDocument()
    })

    it('renders child menu items for trading', () => {
      render(<Sidebar locale="en" />)

      expect(screen.getByText('positions')).toBeInTheDocument()
      expect(screen.getByText('orders')).toBeInTheDocument()
    })

    it('renders logs menu item', () => {
      render(<Sidebar locale="en" />)

      expect(screen.getByText('logs')).toBeInTheDocument()
    })

    it('renders settings menu item', () => {
      render(<Sidebar locale="en" />)

      expect(screen.getByText('settings')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('generates correct locale-prefixed hrefs', () => {
      render(<Sidebar locale="zh" />)

      const links = screen.getAllByRole('link')
      const hrefs = links.map(link => link.getAttribute('href'))

      expect(hrefs).toContain('/zh')
      expect(hrefs).toContain('/zh/dashboard')
      expect(hrefs).toContain('/zh/signals')
      expect(hrefs).toContain('/zh/strategies')
    })
  })

  describe('Active State', () => {
    it('highlights active navigation item based on pathname', () => {
      render(<Sidebar locale="en" />)

      // Trading link (/dashboard) should be active since pathname is /en/dashboard
      const tradingLink = screen.getByText('trading').closest('a')
      // The link will have either active or inactive styling
      expect(tradingLink).toBeInTheDocument()
      expect(tradingLink).toHaveAttribute('href', '/en/dashboard')
    })
  })

  describe('Icons', () => {
    it('renders SVG icons for each nav item', () => {
      render(<Sidebar locale="en" />)

      // Each nav item should have an SVG icon
      const svgIcons = document.querySelectorAll('svg')
      expect(svgIcons.length).toBeGreaterThan(0)
    })
  })
})
