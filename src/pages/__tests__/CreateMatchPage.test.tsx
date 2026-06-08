import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateMatchPage from '../CreateMatchPage'
import { useNewMatchStore } from '../../stores/new-match-store'
import type { MatchWithDetails, Player, SessionAttendance } from '../../types/database'

// ─── Router mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'sess-1' }),
  }
})

// ─── Test data ────────────────────────────────────────────────────────────────

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Alice Smith', rating: 1000, created_by: 'user-1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'p2', name: 'Bob Jones', rating: 1000, created_by: 'user-1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'p3', name: 'Carol Davis', rating: 1000, created_by: 'user-1', created_at: '2026-01-01T00:00:00Z' },
  { id: 'p4', name: 'Dan Wilson', rating: 1000, created_by: 'user-1', created_at: '2026-01-01T00:00:00Z' },
]

// ─── Hook mocks ───────────────────────────────────────────────────────────────

vi.mock('../../hooks/usePlayers', () => ({
  usePlayers: () => ({ data: PLAYERS }),
}))

let mockMatchesData: MatchWithDetails[] = []
const mockCreateMatch = { mutateAsync: vi.fn(), isPending: false }
let mockAttendancesData: SessionAttendance[] = []

vi.mock('../../hooks/useMatches', () => ({
  useMatches: () => ({ data: mockMatchesData }),
  useCreateMatch: () => mockCreateMatch,
}))

vi.mock('../../hooks/useSessionAttendances', () => ({
  useSessionAttendances: () => ({ data: mockAttendancesData }),
}))

vi.mock('../../hooks/useSessions', () => ({
  useSession: () => ({
    data: {
      id: 'sess-1',
      label: 'Morning Session',
      started_at: '2026-05-23T08:00:00Z',
      ended_at: null,
      bwf_tournament_id: null,
      created_by: 'user-1',
      created_at: '2026-05-23T08:00:00Z',
    },
  }),
}))

vi.mock('../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => true,
}))

// ─── Design system mocks ──────────────────────────────────────────────────────

vi.mock('../../../design-system/components', () => ({
  AppBar: ({ onBack, backLabel }: { onBack?: () => void; backLabel?: string }) => (
    <header>
      {onBack && <button onClick={onBack}>{backLabel ?? 'Back'}</button>}
    </header>
  ),
  SegmentedControl: ({ value, tabs, onChange }: { value: string; tabs: Array<{ id: string; label: string }>; onChange: (v: string) => void }) => (
    <div role="tablist">
      {tabs.map(tab => (
        <button key={tab.id} role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  ),
  SectionLabel: ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
    <div>
      <span>{children}</span>
      {action}
    </div>
  ),
  Avatar: ({ name }: { name: string }) => <div aria-label={name} />,
}))

vi.mock('../../../design-system/components/match-type-chips', () => ({
  MatchTypeChips: ({ value, onChange }: { value: string; onChange: (t: string) => void }) => (
    <div>
      {['MEN_SINGLES', 'MEN_DOUBLES', 'WOMEN_SINGLES', 'WOMEN_DOUBLES', 'MIXED_DOUBLES'].map(t => (
        <button
          key={t}
          role="radio"
          aria-selected={value === t}
          aria-label={t}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../../../design-system/components/bottom-sheet', () => ({
  BottomSheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog" aria-label="Player picker">{children}</div> : null,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/sessions/sess-1/matches/new']}>
        <CreateMatchPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CreateMatchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMatchesData = []
    mockAttendancesData = []
    mockCreateMatch.isPending = false
    useNewMatchStore.getState().reset()
  })

  describe('initial state', () => {
    it('renders page title', () => {
      renderPage()
      expect(screen.getByText('New match')).toBeInTheDocument()
    })

    it('CTA is disabled and reports the slot count when no players are selected', () => {
      renderPage()
      // Default match type is MEN_DOUBLES → 4 slots, 0 filled → "Pick 4 more players"
      const btn = screen.getByRole('button', { name: /pick 4 more players/i })
      expect(btn).toBeDisabled()
    })

    it('Cancel button navigates back', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    it('defaults to Now mode', () => {
      renderPage()
      expect(screen.getByRole('tab', { name: /now/i })).toHaveAttribute('aria-selected', 'true')
    })

    it('shows "Starts immediately" panel in Now mode', () => {
      renderPage()
      expect(screen.getByText(/starts immediately/i)).toBeInTheDocument()
    })
  })

  describe('CTA state', () => {
    it('enables CTA when all slots are filled for MEN_SINGLES', () => {
      useNewMatchStore.setState({
        matchType: 'MEN_SINGLES',
        teamA: ['p1'],
        teamB: ['p2'],
        mode: 'now',
        scheduledAt: null,
      })
      renderPage()
      expect(screen.getByRole('button', { name: /start match now/i })).not.toBeDisabled()
    })

    it('CTA stays disabled and reports remaining slots when only some are filled', () => {
      useNewMatchStore.setState({
        matchType: 'MEN_DOUBLES',
        teamA: ['p1', null],
        teamB: [null, null],
        mode: 'now',
        scheduledAt: null,
      })
      renderPage()
      // 4 slots, 1 filled → "Pick 3 more players"
      expect(screen.getByRole('button', { name: /pick 3 more players/i })).toBeDisabled()
    })

    it('CTA uses singular form when one slot is missing', () => {
      useNewMatchStore.setState({
        matchType: 'MEN_DOUBLES',
        teamA: ['p1', 'p2'],
        teamB: ['p3', null],
        mode: 'now',
        scheduledAt: null,
      })
      renderPage()
      expect(screen.getByRole('button', { name: /pick 1 more player\b/i })).toBeDisabled()
    })

    it('shows "Add to queue" label in queue mode with all players filled', () => {
      useNewMatchStore.setState({
        matchType: 'MEN_SINGLES',
        teamA: ['p1'],
        teamB: ['p2'],
        mode: 'queue',
        scheduledAt: null,
      })
      renderPage()
      expect(screen.getByRole('button', { name: /add to queue/i })).not.toBeDisabled()
    })

    it('warns when a live match already exists in now mode', async () => {
      mockMatchesData = [
        {
          id: 'live-match',
          session_id: 'sess-1',
          match_type: 'MEN_SINGLES',
          played_at: '2026-05-23T09:00:00Z',
          status: 'LIVE',
          queue_position: null,
          notes: null,
          created_by: 'user-1',
          created_at: '2026-05-23T09:00:00Z',
          teams: [],
          participants: [],
          scores: [],
        } as MatchWithDetails,
      ]
      useNewMatchStore.setState({
        matchType: 'MEN_SINGLES',
        teamA: ['p1'],
        teamB: ['p2'],
        mode: 'now',
        scheduledAt: null,
      })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /start match now/i }))

      await waitFor(() => {
        expect(screen.getByText(/finish the current live match/i)).toBeInTheDocument()
      })
    })
  })

  describe('mode switching', () => {
    it('switches to Queue mode when Queue tab is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('tab', { name: /queue/i }))
      expect(screen.getByRole('tab', { name: /queue/i })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: /now/i })).toHaveAttribute('aria-selected', 'false')
    })

    it('switches to Schedule mode when Schedule tab is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('tab', { name: /schedule/i }))
      expect(screen.getByRole('tab', { name: /schedule/i })).toHaveAttribute('aria-selected', 'true')
    })

    it('shows date/time pickers in Schedule mode', () => {
      renderPage()
      fireEvent.click(screen.getByRole('tab', { name: /schedule/i }))
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Time')).toBeInTheDocument()
    })

    it('shows queue panel in Queue mode', () => {
      renderPage()
      fireEvent.click(screen.getByRole('tab', { name: /queue/i }))
      expect(screen.getByText(/next to play|after \d+ queued/i)).toBeInTheDocument()
    })
  })

  describe('match creation', () => {
    it('calls mutateAsync with correct args for now mode', async () => {
      mockCreateMatch.mutateAsync.mockResolvedValue({})
      useNewMatchStore.setState({
        matchType: 'MEN_SINGLES',
        teamA: ['p1'],
        teamB: ['p2'],
        mode: 'now',
        scheduledAt: null,
      })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /start match now/i }))

      await waitFor(() => {
        expect(mockCreateMatch.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            session_id: 'sess-1',
            match_type: 'MEN_SINGLES',
            status: 'LIVE',
            team_a_player_ids: ['p1'],
            team_b_player_ids: ['p2'],
          })
        )
      })
    })

    it('creates match with SCHEDULED status in queue mode', async () => {
      mockCreateMatch.mutateAsync.mockResolvedValue({})
      useNewMatchStore.setState({
        matchType: 'MEN_SINGLES',
        teamA: ['p1'],
        teamB: ['p2'],
        mode: 'queue',
        scheduledAt: null,
      })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /add to queue/i }))

      await waitFor(() => {
        expect(mockCreateMatch.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'SCHEDULED',
            team_a_player_ids: ['p1'],
            team_b_player_ids: ['p2'],
          })
        )
      })
    })

    it('navigates back after successful creation', async () => {
      mockCreateMatch.mutateAsync.mockResolvedValue({})
      useNewMatchStore.setState({
        matchType: 'MEN_SINGLES',
        teamA: ['p1'],
        teamB: ['p2'],
        mode: 'now',
        scheduledAt: null,
      })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /start match now/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(-1)
      })
    })

    it('shows error message when creation fails', async () => {
      mockCreateMatch.mutateAsync.mockRejectedValue(new Error('Network error'))
      useNewMatchStore.setState({
        matchType: 'MEN_SINGLES',
        teamA: ['p1'],
        teamB: ['p2'],
        mode: 'now',
        scheduledAt: null,
      })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /start match now/i }))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('shows "Creating…" while mutation is pending', () => {
      mockCreateMatch.isPending = true
      renderPage()
      expect(screen.getByText(/creating…/i)).toBeInTheDocument()
    })
  })

  describe('player picker', () => {
    it('opens picker when a player slot is tapped', () => {
      renderPage()
      const slots = screen.getAllByText('Tap to add')
      fireEvent.click(slots[0])
      expect(screen.getByRole('dialog', { name: /player picker/i })).toBeInTheDocument()
    })

    it('shows all active players in the picker', () => {
      renderPage()
      fireEvent.click(screen.getAllByText('Tap to add')[0])
      expect(screen.getByText('Alice S.')).toBeInTheDocument()
      expect(screen.getByText('Bob J.')).toBeInTheDocument()
    })

    it('hides declined players from the regular-session picker', () => {
      mockAttendancesData = [
        {
          id: 'att-1',
          session_id: 'sess-1',
          player_id: 'p2',
          status: 'declined',
          created_at: '2026-05-23T07:00:00Z',
          updated_at: '2026-05-23T07:00:00Z',
          created_by: 'user-2',
        },
      ]
      renderPage()
      fireEvent.click(screen.getAllByText('Tap to add')[0])
      expect(screen.getByText('Alice S.')).toBeInTheDocument()
      expect(screen.queryByText('Bob J.')).not.toBeInTheDocument()
    })

    it('selects a player and closes the picker', () => {
      useNewMatchStore.setState({
        matchType: 'MEN_SINGLES',
        teamA: [null],
        teamB: [null],
        mode: 'now',
        scheduledAt: null,
      })
      renderPage()
      fireEvent.click(screen.getAllByText('Tap to add')[0])
      fireEvent.click(screen.getByText('Alice S.'))
      expect(screen.queryByRole('dialog', { name: /player picker/i })).not.toBeInTheDocument()
    })
  })
})
