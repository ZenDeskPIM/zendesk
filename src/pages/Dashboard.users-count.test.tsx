import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import { I18nProvider } from '@/i18n/provider'

vi.mock('@/lib/tickets', () => ({
  listTickets: vi.fn(async () => ({ items: [] }))
}))

vi.mock('@/hooks/use-auth-hook', () => ({
  useAuth: () => ({ loading: false, user: null })
}))

vi.mock('@/hooks/use-tickets', async () => {
  return {
    useTickets: () => ({ tickets: [], replaceAll: vi.fn(), upsertTicketDetail: vi.fn() })
  }
})

vi.mock('@/lib/users', () => ({
  countActiveUsers: vi.fn(async () => 7)
}))

describe('Dashboard active users counter', () => {
  beforeAll(() => {
    // Mock matchMedia para hooks responsivos
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { /* legacy API noop */ },
        removeListener: () => { /* legacy API noop */ },
        addEventListener: () => { /* noop */ },
        removeEventListener: () => { /* noop */ },
        dispatchEvent: () => false
      })
    })
  })
  beforeEach(() => {
    vi.clearAllMocks()
    try { localStorage.setItem('locale', 'pt') } catch (e) { /* ignore localStorage unavailability */ }
  })

  it('renders active users count from backend', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <Dashboard />
        </I18nProvider>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('Usuários Ativos')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })
})
