import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MatchDetailPage from '../MatchDetailPage'
import type { MatchWithDetails, MatchScore, Player } from '../../types/database'

// ─── Router mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'sess-1', matchId: 'match-1' }),
  }
})

// ─── Hook mocks ───────────────────────────────────────────────────────────────

let mockMatchData: MatchWithDetails | null = null
let mockAllMatchesData: MatchWithDetails[] = []
let mockMatchLoading = false

const mockStartMatch = { mutateAsync: vi.fn(), isPending: false }
const mockRecordResult = { mutateAsync: vi.fn(), isPending: false }
const mockEndMatchNoWinner = { mutateAsync: vi.fn(), isPending: false }
const mockDeleteMatch = { mutateAsync: vi.fn(), isPending: false }
const mockReopenMatch = { mutateAsync: vi.fn(), isPending: false }

vi.mock('../../hooks/useMatches', () => ({
  useMatch: () => ({ data: mockMatchData, isLoading: mockMatchLoading }),
  useMatches: () => ({ data: mockAllMatchesData }),
  useStartMatch: () => mockStartMatch,
  useRecordResult: () => mockRecordResult,
  useEndMatchNoWinner: () => mockEndMatchNoWinner,
  useDeleteMatch: () => mockDeleteMatch,
  useReopenMatch: () => mockReopenMatch,
}))

vi.mock('../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => true,
}))

// ─── Design system mocks ──────────────────────────────────────────────────────

vi.mock('../../../design-system/components', () => ({
  AppBar: ({
    title,
    titleVisible,
    leftAction,
    rightAction,
  }: {
    title: string
    titleVisible?: boolean
    leftAction?: { icon?: React.ReactNode; onClick: () => void }
    rightAction?: { ariaLabel?: string; onClick: () => void }
  }) => (
    <header>
      {titleVisible && <h1>{title}</h1>}
      {leftAction && (
        <button onClick={leftAction.onClick}>Session</button>
      )}
      {rightAction && (
        <button aria-label={rightAction.ariaLabel ?? 'More'} onClick={rightAction.onClick} />
      )}
    </header>
  ),
}))

vi.mock('../../../design-system/components/bottom-sheet', () => ({
  BottomSheet: ({
    open,
    children,
  }: {
    open: boolean
    children: React.ReactNode
  }) => (open ? <div role="dialog">{children}</div> : null),
  BottomSheetItem: ({
    label,
    onClick,
  }: {
    label: string
    onClick: () => void
    danger?: boolean
  }) => <button onClick={onClick}>{label}</button>,
  BottomSheetDivider: () => <hr />,
  BottomSheetCancel: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}>Cancel</button>
  ),
}))

// ─── Test data ────────────────────────────────────────────────────────────────

const PLAYER_ALICE: Player = {
  id: 'p1',
  name: 'Alice Smith',

  rating: 1000,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
}
const PLAYER_BOB: Player = {
  id: 'p2',
  name: 'Bob Jones',

  rating: 1000,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
}
const PLAYER_CAROL: Player = {
  id: 'p3',
  name: 'Carol Davis',

  rating: 1000,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
}
const PLAYER_DAN: Player = {
  id: 'p4',
  name: 'Dan Wilson',

  rating: 1000,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
}

function makeMatch(overrides: Partial<MatchWithDetails> = {}): MatchWithDetails {
  return {
    id: 'match-1',
    session_id: 'sess-1',
    match_type: 'MEN_DOUBLES',
    played_at: '2026-05-23T10:00:00Z',
    status: 'SCHEDULED',
    queue_position: null,
    notes: null,
    created_by: 'user-1',
    created_at: '2026-05-23T10:00:00Z',
    teams: [
      { id: 'team-a-1', match_id: 'match-1', team_label: 'TEAM_A', is_winner: false },
      { id: 'team-b-1', match_id: 'match-1', team_label: 'TEAM_B', is_winner: false },
    ],
    participants: [
      { id: 'mp1', match_id: 'match-1', team_id: 'team-a-1', player_id: 'p1', player: PLAYER_ALICE },
      { id: 'mp2', match_id: 'match-1', team_id: 'team-a-1', player_id: 'p2', player: PLAYER_BOB },
      { id: 'mp3', match_id: 'match-1', team_id: 'team-b-1', player_id: 'p3', player: PLAYER_CAROL },
      { id: 'mp4', match_id: 'match-1', team_id: 'team-b-1', player_id: 'p4', player: PLAYER_DAN },
    ],
    scores: [],
    ...overrides,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/sessions/sess-1/matches/match-1']}>
        <MatchDetailPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MatchDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMatchLoading = false
    mockMatchData = null
    mockAllMatchesData = []
  })

  describe('loading and empty states', () => {
    it('shows a loading spinner when data is loading', () => {
      mockMatchLoading = true
      const { container } = renderPage()
      expect(container.querySelector('.animate-spin')).toBeTruthy()
    })

    it('shows "Match not found." when no match data is returned', () => {
      mockMatchData = null
      renderPage()
      expect(screen.getByText('Match not found.')).toBeInTheDocument()
    })
  })

  describe('SCHEDULED match', () => {
    beforeEach(() => {
      mockMatchData = makeMatch({ status: 'SCHEDULED' })
      mockAllMatchesData = [mockMatchData]
    })

    it('shows "Ready to start" status', () => {
      renderPage()
      expect(screen.getByText(/ready to start/i)).toBeInTheDocument()
    })

    it('shows team names in the huddle panel', () => {
      renderPage()
      // VS layout renders full concatenated names in separate divs
      expect(screen.getByText('Alice S. + Bob J.')).toBeInTheDocument()
      expect(screen.getByText('Carol D. + Dan W.')).toBeInTheDocument()
    })

    it('Start button is disabled before picking a serve', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /pick who serves first/i })).toBeDisabled()
    })

    it('Start button enables after picking Team A serves first', () => {
      renderPage()
      const serveButtons = screen.getAllByRole('radio')
      fireEvent.click(serveButtons[0]) // Team A
      expect(screen.getByRole('button', { name: /start match/i })).not.toBeDisabled()
    })

    it('calls startMatch.mutateAsync with matchId when Start is clicked', async () => {
      mockStartMatch.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      fireEvent.click(screen.getAllByRole('radio')[0])
      fireEvent.click(screen.getByRole('button', { name: /start match/i }))

      await waitFor(() => {
        expect(mockStartMatch.mutateAsync).toHaveBeenCalledWith('match-1')
      })
    })
  })

  describe('LIVE match', () => {
    beforeEach(() => {
      mockMatchData = makeMatch({ status: 'LIVE' })
      mockAllMatchesData = [mockMatchData]
    })

    it('shows "Live · in progress" status', () => {
      renderPage()
      expect(screen.getByText(/live · in progress/i)).toBeInTheDocument()
    })

    it('shows the scoreboard section', () => {
      renderPage()
      expect(screen.getByRole('region', { name: /score/i })).toBeInTheDocument()
    })

    it('"Undo last point" is disabled when no points have been scored', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /undo last point/i })).toBeDisabled()
    })

    it('"Undo last point" becomes enabled after scoring a point', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /score point for team a/i }))
      expect(screen.getByRole('button', { name: /undo last point/i })).not.toBeDisabled()
    })

    it('increments Team A score when Team A side is tapped', () => {
      renderPage()
      expect(screen.queryByText('#1')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /score point for team a/i }))
      // Point log entry #1 appears after scoring the first point
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('shows point log entry after scoring', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /score point for team a/i }))
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('shows "Record team win" and "End match" buttons', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /record team win/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /end match/i })).toBeInTheDocument()
    })

    it('opens award sheet when "Record team win" is clicked', () => {
      renderPage()
      // The bottom bar has a "Record team win" button when score hasn't reached threshold
      const recordWinBtns = screen.getAllByRole('button', { name: /record team win/i })
      fireEvent.click(recordWinBtns[0])
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText('Record team win')).toBeInTheDocument()
    })

    it('calls recordResult.mutateAsync when a team is awarded the win', async () => {
      mockRecordResult.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      const recordWinBtns = screen.getAllByRole('button', { name: /record team win/i })
      fireEvent.click(recordWinBtns[0])

      const dialog = screen.getByRole('dialog')
      // Award sheet shows two team buttons (Team A, Team B) plus Cancel
      const winButtons = within(dialog).getAllByRole('button')
      fireEvent.click(winButtons[0]) // Team A

      await waitFor(() => {
        expect(mockRecordResult.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'match-1',
            winner_team: 'TEAM_A',
          })
        )
      })
    })

    it('ends a match without recording a winner', async () => {
      mockEndMatchNoWinner.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /^end match$/i }))

      const dialog = screen.getByRole('dialog')
      fireEvent.click(within(dialog).getByRole('button', { name: /^end match$/i }))

      await waitFor(() => {
        expect(mockEndMatchNoWinner.mutateAsync).toHaveBeenCalledWith({
          id: 'match-1',
          scores: [{ set_number: 1, team_a_score: 0, team_b_score: 0 }],
        })
      })
      expect(mockRecordResult.mutateAsync).not.toHaveBeenCalled()
    })

    it('auto-shows finalize button when score reaches winning threshold', () => {
      // Set up a match where Team A is at 21 and Team B is at 19 (21-19 wins)
      // We do this by clicking 21 times
      renderPage()
      const teamABtn = screen.getByRole('button', { name: /score point for team a/i })
      for (let i = 0; i < 21; i++) fireEvent.click(teamABtn)
      const teamBBtn = screen.getByRole('button', { name: /score point for team b/i })
      for (let i = 0; i < 19; i++) fireEvent.click(teamBBtn)
      expect(screen.getByRole('button', { name: /award match to team a/i })).toBeInTheDocument()
    })
  })

  describe('COMPLETED match', () => {
    beforeEach(() => {
      const scores: MatchScore[] = [
        { id: 's1', match_id: 'match-1', set_number: 1, team_a_score: 21, team_b_score: 15 },
      ]
      mockMatchData = makeMatch({
        status: 'COMPLETED',
        teams: [
          { id: 'team-a-1', match_id: 'match-1', team_label: 'TEAM_A', is_winner: true },
          { id: 'team-b-1', match_id: 'match-1', team_label: 'TEAM_B', is_winner: false },
        ],
        scores,
      })
      mockAllMatchesData = [mockMatchData]
    })

    it('shows "Final" status', () => {
      renderPage()
      expect(screen.getByText(/final/i)).toBeInTheDocument()
    })

    it('displays the final scores', () => {
      renderPage()
      expect(screen.getByText('21')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('shows Winner badge for the winning team', () => {
      renderPage()
      expect(screen.getByText(/winner/i)).toBeInTheDocument()
    })

    it('shows "Back to session" button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /back to session/i })).toBeInTheDocument()
    })

    it('"Back to session" navigates back', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /back to session/i }))
      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })

    it('shows "Re-open match for editing" button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /re-open match for editing/i })).toBeInTheDocument()
    })

    it('calls reopenMatch.mutateAsync when re-open is clicked', async () => {
      mockReopenMatch.mutateAsync.mockResolvedValue(undefined)
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /re-open match for editing/i }))

      await waitFor(() => {
        expect(mockReopenMatch.mutateAsync).toHaveBeenCalledWith('match-1')
      })
    })
  })

  describe('menu sheet', () => {
    it('opens menu when "More options" button is clicked', () => {
      mockMatchData = makeMatch({ status: 'LIVE' })
      mockAllMatchesData = [mockMatchData]
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /more options/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('shows "Delete match" option in the menu', () => {
      mockMatchData = makeMatch({ status: 'SCHEDULED' })
      mockAllMatchesData = [mockMatchData]
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /more options/i }))
      expect(screen.getByText('Delete match')).toBeInTheDocument()
    })

    it('deletes match and navigates back after confirmation', async () => {
      mockDeleteMatch.mutateAsync.mockResolvedValue(undefined)
      mockMatchData = makeMatch({ status: 'SCHEDULED' })
      mockAllMatchesData = [mockMatchData]
      renderPage()

      fireEvent.click(screen.getByRole('button', { name: /more options/i }))
      fireEvent.click(screen.getByText('Delete match'))
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(mockDeleteMatch.mutateAsync).toHaveBeenCalledWith('match-1')
        expect(mockNavigate).toHaveBeenCalledWith(-1)
      })
    })

    it('warns before deleting a live match', () => {
      mockMatchData = makeMatch({ status: 'LIVE' })
      mockAllMatchesData = [mockMatchData]
      renderPage()

      fireEvent.click(screen.getByRole('button', { name: /more options/i }))
      fireEvent.click(screen.getByText('Delete match'))

      expect(screen.getByText('Delete recorded match?')).toBeInTheDocument()
      expect(screen.getByText(/live or completed/)).toBeInTheDocument()
    })

    it('shows live-only actions (Undo, Swap serve) in menu for LIVE match', () => {
      mockMatchData = makeMatch({ status: 'LIVE' })
      mockAllMatchesData = [mockMatchData]
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /more options/i }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Undo last point')).toBeInTheDocument()
      expect(within(dialog).getByText('Swap serve')).toBeInTheDocument()
    })

    it('shows "Re-open match" in menu for COMPLETED match', () => {
      mockMatchData = makeMatch({
        status: 'COMPLETED',
        teams: [
          { id: 'team-a-1', match_id: 'match-1', team_label: 'TEAM_A', is_winner: true },
          { id: 'team-b-1', match_id: 'match-1', team_label: 'TEAM_B', is_winner: false },
        ],
        scores: [{ id: 's1', match_id: 'match-1', set_number: 1, team_a_score: 21, team_b_score: 15 }],
      })
      mockAllMatchesData = [mockMatchData]
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /more options/i }))
      expect(screen.getByText('Re-open match')).toBeInTheDocument()
    })
  })

  describe('match title and navigation', () => {
    it('shows match number based on position in session', () => {
      const match2 = makeMatch({ id: 'match-2' })
      mockMatchData = makeMatch({ status: 'SCHEDULED' })
      mockAllMatchesData = [match2, mockMatchData] // match-1 is at index 1 → number = 2 - 1 = 1
      renderPage()
      expect(screen.getByText(/match 1/i)).toBeInTheDocument()
    })

    it('navigates back when Session (back) button is clicked', () => {
      mockMatchData = makeMatch({ status: 'SCHEDULED' })
      mockAllMatchesData = [mockMatchData]
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /session/i }))
      expect(mockNavigate).toHaveBeenCalledWith(-1)
    })
  })
})
