import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SessionDetailPage from '../SessionDetailPage'
import type { Session, MatchWithDetails } from '../../types/database'

// ─── Router mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
const mockLocation = { state: null as unknown, pathname: '/sessions/sess-1', search: '', hash: '', key: 'default' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'sess-1' }),
    useLocation: () => mockLocation,
  }
})

// ─── Hook mocks ───────────────────────────────────────────────────────────────

const mockDeleteMatch = { mutateAsync: vi.fn(), isPending: false }
const mockRefetchMatches = vi.fn()
let mockMatchesData: MatchWithDetails[] | undefined = []
let mockMatchesLoading = false
let mockMatchesError = false

vi.mock('../../hooks/useMatches', () => ({
  useMatches: () => ({
    data: mockMatchesData,
    isLoading: mockMatchesLoading,
    isError: mockMatchesError,
    refetch: mockRefetchMatches,
  }),
  useDeleteMatch: () => mockDeleteMatch,
}))

let mockSessionData: Session | undefined = undefined
const mockEndSession = { mutateAsync: vi.fn(), isPending: false }
const mockStartSession = { mutateAsync: vi.fn(), isPending: false }
const mockDeleteSession = { mutateAsync: vi.fn(), isPending: false }

vi.mock('../../hooks/useSessions', () => ({
  useSession: () => ({ data: mockSessionData }),
  useEndSession: () => mockEndSession,
  useStartSession: () => mockStartSession,
  useDeleteSession: () => mockDeleteSession,
}))

vi.mock('../../hooks/useRankings', () => ({
  useSessionLeaderboard: () => ({
    data: { rankings: [], leader: undefined },
    refetch: vi.fn(),
  }),
}))

vi.mock('../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => true,
}))

// ─── Component mocks ──────────────────────────────────────────────────────────

vi.mock('../../components/MatchesContent', () => ({
  default: ({ isLoading, isError, onRetry }: {
    isLoading: boolean; isError: boolean; onRetry: () => void
  }) => {
    if (isLoading) return <div>Loading matches…</div>
    if (isError) return <button onClick={onRetry}>Retry</button>
    return null
  },
}))

vi.mock('../../components/FloatingActionButton', () => ({
  default: ({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) => (
    <button onClick={onClick} aria-label={ariaLabel} data-testid="fab" />
  ),
}))

// Note: paths are relative to THIS test file (src/pages/__tests__/),
// so design-system is three levels up: ../../../design-system/

vi.mock('../../../design-system/components/session-stats-panel', () => ({
  SessionStatsPanel: ({ matchCount }: { matchCount: number }) => (
    <div data-testid="stats-panel">Stats: {matchCount}</div>
  ),
}))

vi.mock('../../../design-system/components/dialog', () => ({
  Dialog: ({
    open,
    title,
    actions,
  }: {
    open: boolean
    title: string
    actions: Array<{ label: string; onClick: () => void }>
  }) =>
    open ? (
      <div role="dialog">
        <p>{title}</p>
        {actions.map((a) => (
          <button key={a.label} onClick={a.onClick}>{a.label}</button>
        ))}
      </div>
    ) : null,
}))

vi.mock('../../../design-system/components/bottom-sheet', () => ({
  BottomSheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="bottom-sheet">{children}</div> : null,
  BottomSheetItem: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick}>{label}</button>
  ),
  BottomSheetDivider: () => <hr />,
  BottomSheetCancel: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}>Cancel</button>
  ),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PAST = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString()

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    label: 'Friday Night Smash',
    started_at: PAST,
    ended_at: null,
    bwf_tournament_id: null,
    created_by: 'user-1',
    created_at: PAST,
    ...overrides,
  }
}

function makeMatch(id: string): MatchWithDetails {
  return {
    id,
    session_id: 'sess-1',
    match_type: 'MEN_SINGLES',
    played_at: PAST,
    status: 'COMPLETED',
    queue_position: null,
    notes: null,
    created_by: 'user-1',
    created_at: PAST,
    teams: [],
    participants: [],
    scores: [],
  }
}

function makeRecordedMatch(id: string): MatchWithDetails {
  return {
    ...makeMatch(id),
    teams: [
      { id: `${id}-team-a`, match_id: id, team_label: 'TEAM_A', is_winner: true },
      { id: `${id}-team-b`, match_id: id, team_label: 'TEAM_B', is_winner: false },
    ],
  }
}

// ─── Render helper ────────────────────────────────────────────────────────────

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/sessions/sess-1']}>
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// The real AppBar renders the right action with aria-label="Action"
function clickMenuButton() {
  fireEvent.click(screen.getByLabelText('Action'))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SessionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionData = makeSession()
    mockMatchesData = []
    mockMatchesLoading = false
    mockMatchesError = false
    mockDeleteMatch.isPending = false
    mockEndSession.isPending = false
    mockDeleteSession.isPending = false
    mockLocation.state = null
  })

  // ── Hero ──────────────────────────────────────────────────────────────────

  describe('hero section', () => {
    it('shows session title', () => {
      renderPage()
      expect(screen.getByText('Friday Night Smash')).toBeInTheDocument()
    })

    it('shows "Untitled Session" when label is null', () => {
      mockSessionData = makeSession({ label: null })
      renderPage()
      expect(screen.getByText('Untitled Session')).toBeInTheDocument()
    })

    it('shows "Live · in progress" for a live session', () => {
      renderPage()
      expect(screen.getByText('Live · in progress')).toBeInTheDocument()
    })

    it('shows "Scheduled" for a future session', () => {
      mockSessionData = makeSession({ started_at: FUTURE, ended_at: null })
      renderPage()
      expect(screen.getByText('Scheduled')).toBeInTheDocument()
    })

    it('shows "Completed" for an ended session', () => {
      mockSessionData = makeSession({ started_at: PAST, ended_at: PAST })
      renderPage()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  // ── Matches section ───────────────────────────────────────────────────────

  describe('matches section', () => {
    it('is hidden for scheduled sessions', () => {
      mockSessionData = makeSession({ started_at: FUTURE })
      renderPage()
      expect(screen.queryByRole('heading', { name: /^matches$/i })).not.toBeInTheDocument()
    })

    it('is visible for live sessions', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: /^matches$/i })).toBeInTheDocument()
    })

    it('is visible for ended sessions', () => {
      mockSessionData = makeSession({ ended_at: PAST })
      renderPage()
      expect(screen.getByRole('heading', { name: /^matches$/i })).toBeInTheDocument()
    })

    it('shows match count as "X played"', () => {
      mockMatchesData = [makeMatch('m1'), makeMatch('m2')]
      renderPage()
      expect(screen.getByText('2 played')).toBeInTheDocument()
    })

    it('shows "0 played" when no matches', () => {
      renderPage()
      expect(screen.getByText('0 played')).toBeInTheDocument()
    })

    it('shows "Loading…" in count while matches are fetching', () => {
      mockMatchesLoading = true
      mockMatchesData = undefined
      renderPage()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })
  })

  // ── Stats panel ───────────────────────────────────────────────────────────

  describe('stats panel', () => {
    it('is shown when recorded results exist', () => {
      mockMatchesData = [makeRecordedMatch('m1')]
      renderPage()
      expect(screen.getByTestId('stats-panel')).toBeInTheDocument()
    })

    it('is hidden when a completed match has no winner', () => {
      mockMatchesData = [makeMatch('m1')]
      renderPage()
      expect(screen.queryByTestId('stats-panel')).not.toBeInTheDocument()
    })

    it('is hidden when there are no matches', () => {
      mockMatchesData = []
      renderPage()
      expect(screen.queryByTestId('stats-panel')).not.toBeInTheDocument()
    })
  })

  // ── FAB ───────────────────────────────────────────────────────────────────

  describe('FAB', () => {
    it('is shown for live sessions', () => {
      renderPage()
      expect(screen.getByTestId('fab')).toBeInTheDocument()
    })

    it('is hidden for scheduled sessions', () => {
      mockSessionData = makeSession({ started_at: FUTURE })
      renderPage()
      expect(screen.queryByTestId('fab')).not.toBeInTheDocument()
    })

    it('is hidden for ended sessions', () => {
      mockSessionData = makeSession({ ended_at: PAST })
      renderPage()
      expect(screen.queryByTestId('fab')).not.toBeInTheDocument()
    })

    it('navigates to new match form on click', () => {
      renderPage()
      fireEvent.click(screen.getByTestId('fab'))
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/sess-1/matches/new')
    })
  })

  // ── Back navigation ───────────────────────────────────────────────────────

  describe('back navigation', () => {
    it('falls back to /sessions when no location state', () => {
      renderPage()
      fireEvent.click(screen.getByLabelText('Back'))
      expect(mockNavigate).toHaveBeenCalledWith('/sessions')
    })

    it('uses location.state.from when provided', () => {
      mockLocation.state = { from: '/tournaments/tour-1' }
      renderPage()
      fireEvent.click(screen.getByLabelText('Back'))
      expect(mockNavigate).toHaveBeenCalledWith('/tournaments/tour-1')
    })
  })

  // ── Bottom sheet menu ─────────────────────────────────────────────────────

  describe('bottom sheet menu', () => {
    it('is closed initially', () => {
      renderPage()
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument()
    })

    it('opens when the menu button is clicked', () => {
      renderPage()
      clickMenuButton()
      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument()
    })

    it('closes on Cancel', () => {
      renderPage()
      clickMenuButton()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument()
    })

    it('shows "New match" for a live session', () => {
      renderPage()
      clickMenuButton()
      expect(screen.getByRole('button', { name: 'New match' })).toBeInTheDocument()
    })

    it('hides "New match" for scheduled and ended sessions', () => {
      mockSessionData = makeSession({ started_at: FUTURE })
      renderPage()
      clickMenuButton()
      expect(screen.queryByRole('button', { name: 'New match' })).not.toBeInTheDocument()
    })

    it('shows "Start session" for a scheduled session', () => {
      mockSessionData = makeSession({ started_at: FUTURE })
      renderPage()
      clickMenuButton()
      expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    })

    it('hides "Start session" for a live session', () => {
      renderPage()
      clickMenuButton()
      expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument()
    })

    it('shows "End session" only for a live session', () => {
      renderPage()
      clickMenuButton()
      expect(screen.getByRole('button', { name: 'End session' })).toBeInTheDocument()
    })

    it('hides "End session" for ended sessions', () => {
      mockSessionData = makeSession({ ended_at: PAST })
      renderPage()
      clickMenuButton()
      expect(screen.queryByRole('button', { name: 'End session' })).not.toBeInTheDocument()
    })

    it('shows "View player stats" when matches exist', () => {
      mockMatchesData = [makeMatch('m1')]
      renderPage()
      clickMenuButton()
      expect(screen.getByRole('button', { name: 'View player stats' })).toBeInTheDocument()
    })

    it('hides "View player stats" when no matches', () => {
      renderPage()
      clickMenuButton()
      expect(screen.queryByRole('button', { name: 'View player stats' })).not.toBeInTheDocument()
    })

    it('always shows "Delete session"', () => {
      renderPage()
      clickMenuButton()
      expect(screen.getByRole('button', { name: 'Delete session' })).toBeInTheDocument()
    })

    it('navigates to new match form on "New match" click', () => {
      renderPage()
      clickMenuButton()
      fireEvent.click(screen.getByRole('button', { name: 'New match' }))
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/sess-1/matches/new')
    })

    it('navigates to player stats on "View player stats" click', () => {
      mockMatchesData = [makeMatch('m1')]
      renderPage()
      clickMenuButton()
      fireEvent.click(screen.getByRole('button', { name: 'View player stats' }))
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/sess-1/stats')
    })

    it('calls startSession.mutateAsync on "Start session" click', async () => {
      mockSessionData = makeSession({ started_at: FUTURE })
      mockStartSession.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      clickMenuButton()
      fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
      await waitFor(() => {
        expect(mockStartSession.mutateAsync).toHaveBeenCalledWith('sess-1')
      })
    })

    it('opens end session dialog on "End session" click', () => {
      renderPage()
      clickMenuButton()
      fireEvent.click(screen.getByRole('button', { name: 'End session' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('End this session?')).toBeInTheDocument()
    })

    it('opens delete session dialog on "Delete session" click', () => {
      renderPage()
      clickMenuButton()
      fireEvent.click(screen.getByRole('button', { name: 'Delete session' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Delete session?')).toBeInTheDocument()
    })
  })

  // ── End session dialog ────────────────────────────────────────────────────

  describe('end session', () => {
    function openEndDialog() {
      clickMenuButton()
      fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    }

    it('calls endSession.mutateAsync on confirm', async () => {
      mockEndSession.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      openEndDialog()
      fireEvent.click(screen.getAllByRole('button', { name: 'End session' }).at(-1)!)
      await waitFor(() => {
        expect(mockEndSession.mutateAsync).toHaveBeenCalledWith('sess-1')
      })
    })

    it('closes dialog after successful end', async () => {
      mockEndSession.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      openEndDialog()
      fireEvent.click(screen.getAllByRole('button', { name: 'End session' }).at(-1)!)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('closes dialog on Cancel', () => {
      renderPage()
      openEndDialog()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  // ── Delete session dialog ─────────────────────────────────────────────────

  describe('delete session', () => {
    function openDeleteDialog() {
      clickMenuButton()
      fireEvent.click(screen.getByRole('button', { name: 'Delete session' }))
    }

    it('calls deleteSession.mutateAsync on confirm', async () => {
      mockDeleteSession.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      openDeleteDialog()
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      await waitFor(() => {
        expect(mockDeleteSession.mutateAsync).toHaveBeenCalledWith('sess-1')
      })
    })

    it('navigates to /sessions after successful delete', async () => {
      mockDeleteSession.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      openDeleteDialog()
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/sessions')
      })
    })

    it('navigates to location.state.from after delete when set', async () => {
      mockLocation.state = { from: '/tournaments/tour-1' }
      mockDeleteSession.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      openDeleteDialog()
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tournaments/tour-1')
      })
    })

    it('closes dialog on Cancel', () => {
      renderPage()
      openDeleteDialog()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  // ── Delete match modal ────────────────────────────────────────────────────

  describe('delete match modal', () => {
    it('is hidden by default', () => {
      renderPage()
      expect(screen.queryByText('Delete Match?')).not.toBeInTheDocument()
    })
  })
})
