import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CalendarTab } from '../CalendarTab'
import type { Session, MatchWithDetails } from '../../types/database'
import type { SessionLeaderboard, SessionWeeklyStats } from '../../hooks/useRankings'

// ─── Router ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ─── i18n ─────────────────────────────────────────────────────────────────────

vi.mock('../../i18n', () => ({
  useI18n: () => ({ locale: 'en', t: (key: string) => key }),
  LOCALE_TAG: { en: 'en-US', vi: 'vi-VN' },
}))

// ─── session-format ───────────────────────────────────────────────────────────

vi.mock('../../lib/session-format', () => ({
  getSessionStatus: (s: Session) => (s.ended_at ? 'completed' : 'active'),
  formatSessionDuration: () => '2h',
}))

// ─── Hooks ────────────────────────────────────────────────────────────────────

let mockSessions: Session[] = []
vi.mock('../../hooks/useSessions', () => ({
  useSessions: () => ({ data: mockSessions }),
}))

let mockLeaderboards: Map<string, SessionLeaderboard> = new Map()
vi.mock('../../hooks/useRankings', () => ({
  useSessionLeaderboards: () => ({ data: mockLeaderboards }),
}))

let mockMatches: Partial<MatchWithDetails>[] = []
vi.mock('../../hooks/useMatches', () => ({
  useMatches: () => ({ data: mockMatches }),
}))

// ─── Design-system components ─────────────────────────────────────────────────

vi.mock('../../../design-system/components/bwf-category-badge', () => ({
  BwfCategoryBadge: ({ categoryName }: { categoryName: string }) => (
    <span data-testid="bwf-badge">{categoryName}</span>
  ),
}))

vi.mock('../../../design-system/components/avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderTab() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CalendarTab />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    type: 'regular',
    label: 'Weekend Session',
    started_at: '2026-05-27T08:00:00.000Z',
    ended_at: '2026-05-27T10:00:00.000Z',
    created_by: 'user-1',
    created_at: '2026-05-27T08:00:00.000Z',
    bwf_tournament_id: null,
    bwf_tournaments: null,
    ...overrides,
  }
}

function makeChampion(overrides: Partial<SessionWeeklyStats> = {}): SessionWeeklyStats {
  return {
    playerId: 'p1',
    name: 'John Doe',
    avatarUrl: null,
    weeklyPoints: 80,
    averageWeeklyPoints: 10,
    wins: 7,
    losses: 1,
    matchesPlayed: 8,
    pointDifference: 12,
    ratingDelta: 15,
    ...overrides,
  }
}

function makeLeaderboard(champion: SessionWeeklyStats | undefined): SessionLeaderboard {
  return { rankings: champion ? [champion] : [], leader: champion }
}

beforeEach(() => {
  mockNavigate.mockReset()
  mockSessions = []
  mockLeaderboards = new Map()
  mockMatches = []
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CalendarTab', () => {
  describe('empty state', () => {
    it('shows empty message when there are no sessions', () => {
      renderTab()
      expect(screen.getByText('calendar.noSessions')).toBeDefined()
    })

    it('shows empty message when all sessions are active (not completed)', () => {
      mockSessions = [makeSession({ ended_at: null })]
      renderTab()
      expect(screen.getByText('calendar.noSessions')).toBeDefined()
    })
  })

  describe('session display', () => {
    it('renders a completed session with its label', () => {
      mockSessions = [makeSession({ label: 'Club Night' })]
      renderTab()
      expect(screen.getByText('Club Night')).toBeDefined()
    })

    it('uses bwf_tournaments.category_name for tournament sessions without label', () => {
      mockSessions = [
        makeSession({
          label: null,
          type: 'tournament',
          bwf_tournaments: { category_name: 'All England 2026', category_slug: 'grade-2-level-1' },
        }),
      ]
      renderTab()
      // appears in both the h3 heading and the bwf badge
      expect(screen.getAllByText('All England 2026').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('heading', { name: 'All England 2026' })).toBeDefined()
    })

    it('shows BwfCategoryBadge for tournament sessions', () => {
      mockSessions = [
        makeSession({
          type: 'tournament',
          bwf_tournaments: { category_name: 'All England', category_slug: 'grade-2-level-1' },
        }),
      ]
      renderTab()
      expect(screen.getByTestId('bwf-badge')).toBeDefined()
    })

    it('does not show BwfCategoryBadge for regular sessions', () => {
      mockSessions = [makeSession({ type: 'regular', bwf_tournaments: null })]
      renderTab()
      expect(screen.queryByTestId('bwf-badge')).toBeNull()
    })

    it('shows timeline end cap after the last session', () => {
      mockSessions = [makeSession()]
      renderTab()
      expect(screen.getByText('Start of recorded history')).toBeDefined()
    })
  })

  describe('filtering', () => {
    it('excludes active sessions and only renders completed ones', () => {
      mockSessions = [
        makeSession({ id: 'sess-active', label: 'Active Session', ended_at: null }),
        makeSession({ id: 'sess-done', label: 'Done Session', ended_at: '2026-05-27T10:00:00.000Z' }),
      ]
      renderTab()
      expect(screen.queryByText('Active Session')).toBeNull()
      expect(screen.getByText('Done Session')).toBeDefined()
    })
  })

  describe('champion', () => {
    it('shows champion name in the card footer', () => {
      const session = makeSession()
      mockSessions = [session]
      mockLeaderboards.set(session.id, makeLeaderboard(makeChampion({ name: 'Jane Smith' })))
      renderTab()
      // name appears in both Avatar mock and the card footer
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1)
    })

    it('shows win rate rounded to nearest integer', () => {
      // 7 wins / 8 played = 87.5% → rounds to 88%
      const session = makeSession()
      mockSessions = [session]
      mockLeaderboards.set(session.id, makeLeaderboard(makeChampion({ wins: 7, losses: 1, matchesPlayed: 8 })))
      renderTab()
      expect(screen.getByText('88%')).toBeDefined()
    })

    it('shows W/L record for the champion', () => {
      const session = makeSession()
      mockSessions = [session]
      mockLeaderboards.set(session.id, makeLeaderboard(makeChampion({ wins: 6, losses: 2 })))
      renderTab()
      expect(screen.getByText('6W · 2L')).toBeDefined()
    })

    it('shows champion Avatar with their name', () => {
      const session = makeSession()
      mockSessions = [session]
      mockLeaderboards.set(session.id, makeLeaderboard(makeChampion({ name: 'Ana Torres' })))
      renderTab()
      expect(screen.getByTestId('avatar').textContent).toBe('Ana Torres')
    })

    it('renders without champion footer when leaderboard is empty', () => {
      const session = makeSession()
      mockSessions = [session]
      mockLeaderboards.set(session.id, makeLeaderboard(undefined))
      renderTab()
      // session still renders (its label should appear)
      expect(screen.getByText('Weekend Session')).toBeDefined()
      // no avatar since no champion
      expect(screen.queryByTestId('avatar')).toBeNull()
    })
  })

  describe('match count', () => {
    it('counts only COMPLETED matches for the session', () => {
      const session = makeSession()
      mockSessions = [session]
      mockMatches = [
        { session_id: session.id, status: 'COMPLETED' },
        { session_id: session.id, status: 'COMPLETED' },
        { session_id: session.id, status: 'LIVE' },
      ]
      renderTab()
      // "2 matches" should appear, not 3
      expect(screen.getByText(/^2$/)).toBeDefined()
      expect(screen.queryByText(/^3$/)).toBeNull()
    })

    it('does not count matches from other sessions', () => {
      const session = makeSession({ id: 'sess-a' })
      mockSessions = [session]
      mockMatches = [
        { session_id: 'sess-a', status: 'COMPLETED' },
        { session_id: 'sess-b', status: 'COMPLETED' },
        { session_id: 'sess-b', status: 'COMPLETED' },
      ]
      renderTab()
      // only 1 match belongs to sess-a
      expect(screen.getByText(/^1$/)).toBeDefined()
    })
  })

  describe('grouping', () => {
    it('shows a month header for sessions in the same month', () => {
      mockSessions = [
        makeSession({ id: 'sess-1', label: 'Morning', started_at: '2026-05-27T08:00:00.000Z', ended_at: '2026-05-27T10:00:00.000Z' }),
        makeSession({ id: 'sess-2', label: 'Evening', started_at: '2026-05-28T18:00:00.000Z', ended_at: '2026-05-28T20:00:00.000Z' }),
      ]
      renderTab()
      // 2 sessions in May 2026 — month header should say "2 sessions"
      expect(screen.getByText('2 sessions')).toBeDefined()
    })

    it('renders two month headers for sessions in different months', () => {
      mockSessions = [
        makeSession({ id: 'sess-1', label: 'May Session', started_at: '2026-05-27T08:00:00.000Z', ended_at: '2026-05-27T10:00:00.000Z' }),
        makeSession({ id: 'sess-2', label: 'June Session', started_at: '2026-06-10T08:00:00.000Z', ended_at: '2026-06-10T10:00:00.000Z' }),
      ]
      renderTab()
      const sessionCountLabels = screen.getAllByText('1 sessions')
      expect(sessionCountLabels).toHaveLength(2)
    })
  })

  describe('navigation', () => {
    it('navigates to the session detail page when a card is clicked', () => {
      const session = makeSession({ id: 'sess-42' })
      mockSessions = [session]
      renderTab()
      const card = screen.getByText('Weekend Session').closest('[role="link"]')!
      fireEvent.click(card)
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/sess-42', { state: { from: '/sessions' } })
    })

    it('navigates on Enter key press', () => {
      const session = makeSession({ id: 'sess-42' })
      mockSessions = [session]
      renderTab()
      const card = screen.getByText('Weekend Session').closest('[role="link"]')!
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/sess-42', { state: { from: '/sessions' } })
    })
  })
})
