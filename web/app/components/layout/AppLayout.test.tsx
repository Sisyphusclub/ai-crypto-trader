import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('./Sidebar', () => ({
  default: ({ locale }: { locale: string }) => <div data-testid="sidebar">Sidebar {locale}</div>,
}))

vi.mock('./Topbar', () => ({
  default: ({ locale, mode }: { locale: string; mode: string }) => (
    <div data-testid="topbar">Topbar {locale} {mode}</div>
  ),
}))

import AppLayout from './AppLayout'

describe('AppLayout', () => {
  describe('Rendering', () => {
    it('renders Sidebar with correct locale', () => {
      render(
        <AppLayout locale="en">
          <div>Content</div>
        </AppLayout>
      )

      expect(screen.getByTestId('sidebar')).toHaveTextContent('Sidebar en')
    })

    it('renders Topbar with correct locale and default mode', () => {
      render(
        <AppLayout locale="zh">
          <div>Content</div>
        </AppLayout>
      )

      expect(screen.getByTestId('topbar')).toHaveTextContent('Topbar zh paper')
    })

    it('passes live mode to Topbar', () => {
      render(
        <AppLayout locale="en" mode="live">
          <div>Content</div>
        </AppLayout>
      )

      expect(screen.getByTestId('topbar')).toHaveTextContent('Topbar en live')
    })

    it('renders children in main content area', () => {
      render(
        <AppLayout locale="en">
          <div data-testid="child-content">Test Content</div>
        </AppLayout>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('has correct CSS classes for layout', () => {
      const { container } = render(
        <AppLayout locale="en">
          <div>Content</div>
        </AppLayout>
      )

      const rootDiv = container.firstChild as HTMLElement
      expect(rootDiv).toHaveClass('flex', 'min-h-screen', 'bg-gray-950')
    })

    it('main element has proper styling', () => {
      render(
        <AppLayout locale="en">
          <div>Content</div>
        </AppLayout>
      )

      const main = screen.getByRole('main')
      expect(main).toHaveClass('flex-1', 'p-6', 'overflow-auto')
    })
  })
})
