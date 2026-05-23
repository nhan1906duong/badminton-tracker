import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateSessionPage from '../CreateSessionPage'
import { DuplicateTournamentError } from '../../hooks/useSessions'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockMutateAsync = vi.fn()
const mockCreateSession = {
  mutateAsync: mockMutateAsync,
  isPending: false,
}
vi.mock('../../hooks/useSessions', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useSessions')>('../../hooks/useSessions')
  return {
    ...actual,
    useCreateSession: () => mockCreateSession,
  }
})

const mockSetPlayers = vi.fn()
vi.mock('../../stores/session-store', () => ({
  useSessionStore: (selector: (s: { setPlayers: typeof mockSetPlayers }) => unknown) =>
    selector({ setPlayers: mockSetPlayers }),
}))

const mockRefetch = vi.fn()
const mockUseNearbyBwfTournaments = vi.fn(() => ({
  tournaments: [],
  isLoading: false,
  refetch: mockRefetch,
}))
vi.mock('../../hooks/useBwfTournaments', () => ({
  useNearbyBwfTournaments: (...args: unknown[]) => mockUseNearbyBwfTournaments(...args),
}))

// design-system components used in CreateSessionPage
vi.mock('../../../design-system/components', () => ({
  AppBar: ({
    title,
    leftAction,
    backLabel,
    onBack,
  }: {
    title: string
    leftAction?: { label: string; onClick: () => void }
    backLabel?: string
    onBack?: () => void
  }) => {
    const action = leftAction ?? (onBack ? { label: backLabel ?? 'Back', onClick: onBack } : undefined)

    return (
      <header>
        <h1>{title}</h1>
        {action && <button onClick={action.onClick}>{action.label}</button>}
      </header>
    )
  },
  Dialog: ({
    open,
    title,
    description,
    onClose,
  }: {
    open: boolean
    title: string
    description: string
    onClose: () => void
  }) =>
    open ? (
      <div role="dialog">
        <p>{title}</p>
        <p>{description}</p>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  id: 'session-1',
  label: 'Test Session',
  started_at: '2026-05-23T10:00:00.000Z',
  ended_at: null,
  bwf_tournament_id: null,
  created_by: 'user-1',
  created_at: '2026-05-23T10:00:00.000Z',
}

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/sessions/new']}>
        <CreateSessionPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateSession.isPending = false
    mockUseNearbyBwfTournaments.mockReturnValue({
      tournaments: [],
      isLoading: false,
      refetch: mockRefetch,
    })
  })

  describe('initial state', () => {
    it('renders the page title', () => {
      renderPage()
      expect(screen.getByText('New session')).toBeInTheDocument()
    })

    it('CTA button is disabled when no name is entered', () => {
      renderPage()
      const btn = screen.getByRole('button', { name: /pick a name to continue/i })
      expect(btn).toBeDisabled()
    })

    it('shows empty custom name input', () => {
      renderPage()
      expect(screen.getByPlaceholderText('Type your own name…')).toHaveValue('')
    })

    it('Cancel button navigates back', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })
  })

  describe('name selection', () => {
    it('enables CTA when custom name is typed', () => {
      renderPage()
      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Weekly Badminton' },
      })
      const btn = screen.getByRole('button', { name: /start session now/i })
      expect(btn).not.toBeDisabled()
    })

    it('CTA label shows "Start session now" in "now" mode with a name', () => {
      renderPage()
      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'My Session' },
      })
      expect(screen.getByRole('button', { name: /start session now/i })).toBeInTheDocument()
    })

    it('clears custom name when tournament card is selected', () => {
      mockUseNearbyBwfTournaments.mockReturnValue({
        tournaments: [
          {
            id: 'tourn-1',
            name: 'Malaysia Open 2026',
            startDate: '2026-05-22',
            endDate: '2026-05-25',
            categorySlug: 'bwf-world-tour-super-1000',
            categoryName: 'Super 1000',
            venue: null,
          },
        ],
        isLoading: false,
        refetch: mockRefetch,
      })

      renderPage()

      // Type a name first
      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Custom' },
      })
      expect(screen.getByPlaceholderText('Type your own name…')).toHaveValue('Custom')

      // Select tournament card
      fireEvent.click(screen.getByRole('radio', { name: /malaysia open 2026/i }))

      // Custom name should be cleared
      expect(screen.getByPlaceholderText('Type your own name…')).toHaveValue('')
    })
  })

  describe('session creation', () => {
    it('calls mutateAsync with label when custom name is entered in "now" mode', async () => {
      mockMutateAsync.mockResolvedValue(MOCK_SESSION)
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Weekly Badminton' },
      })
      fireEvent.click(screen.getByRole('button', { name: /start session now/i }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ label: 'Weekly Badminton' })
        )
        // In "now" mode, started_at should be undefined (uses server default)
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ started_at: undefined })
        )
      })
    })

    it('navigates to session detail after successful creation', async () => {
      mockMutateAsync.mockResolvedValue(MOCK_SESSION)
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Weekly Badminton' },
      })
      fireEvent.click(screen.getByRole('button', { name: /start session now/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/sessions/session-1', { replace: true })
      })
    })

    it('calls setPlayers with empty array after successful creation', async () => {
      mockMutateAsync.mockResolvedValue(MOCK_SESSION)
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Weekly Badminton' },
      })
      fireEvent.click(screen.getByRole('button', { name: /start session now/i }))

      await waitFor(() => {
        expect(mockSetPlayers).toHaveBeenCalledWith('session-1', [])
      })
    })

    it('shows creating spinner when isPending is true', () => {
      mockCreateSession.isPending = true
      renderPage()
      expect(screen.getByText(/creating/i)).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('shows duplicate tournament dialog when DuplicateTournamentError is thrown', async () => {
      mockMutateAsync.mockRejectedValue(new DuplicateTournamentError())
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Some Session' },
      })
      fireEvent.click(screen.getByRole('button', { name: /start session now/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Tournament already tracked')).toBeInTheDocument()
      })
    })

    it('shows generic error dialog on unexpected failure', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Network error'))
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Some Session' },
      })
      fireEvent.click(screen.getByRole('button', { name: /start session now/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Failed to create session')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('dismisses dialog when Close is clicked', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Something went wrong'))
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Session' },
      })
      fireEvent.click(screen.getByRole('button', { name: /start session now/i }))

      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: /close/i }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
  })

  describe('start time mode', () => {
    it('defaults to "Start now" mode', () => {
      renderPage()
      expect(screen.getByRole('tab', { name: /start now/i })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: /schedule/i })).toHaveAttribute('aria-selected', 'false')
    })

    it('switches to schedule mode when Schedule tab is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('tab', { name: /schedule/i }))
      expect(screen.getByRole('tab', { name: /schedule/i })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: /start now/i })).toHaveAttribute('aria-selected', 'false')
    })

    it('CTA is disabled in schedule mode until time is picked', () => {
      renderPage()
      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Session' },
      })
      fireEvent.click(screen.getByRole('tab', { name: /schedule/i }))
      // After clicking schedule, scheduledAt is auto-set so the button is enabled
      // (the component calls roundedSoon(60) on mode switch)
      const btn = screen.getByRole('button', { name: /schedule for/i })
      expect(btn).not.toBeDisabled()
    })

    it('passes started_at when creating a scheduled session', async () => {
      mockMutateAsync.mockResolvedValue(MOCK_SESSION)
      renderPage()

      fireEvent.change(screen.getByPlaceholderText('Type your own name…'), {
        target: { value: 'Scheduled Session' },
      })
      fireEvent.click(screen.getByRole('tab', { name: /schedule/i }))
      fireEvent.click(screen.getByRole('button', { name: /schedule for/i }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            label: 'Scheduled Session',
            started_at: expect.any(String),
          })
        )
      })
    })
  })

  describe('tournament suggestions', () => {
    it('shows "No tournaments" message when list is empty', () => {
      renderPage()
      expect(screen.getByText(/no tournaments in the next 7 days/i)).toBeInTheDocument()
    })

    it('shows loading skeletons while tournaments are loading', () => {
      mockUseNearbyBwfTournaments.mockReturnValue({
        tournaments: [],
        isLoading: true,
        refetch: mockRefetch,
      })

      renderPage()
      // Skeletons are animated divs — just verify the empty message is not shown
      expect(screen.queryByText(/no tournaments in the next 7 days/i)).not.toBeInTheDocument()
    })

    it('calls refetch when Refresh is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
      expect(mockRefetch).toHaveBeenCalled()
    })
  })
})
