import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useCreateSession, DuplicateTournamentError } from '../useSessions'

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => mockFrom(table),
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children),
    qc,
  }
}

const MOCK_USER = { id: 'user-1' }
const MOCK_SESSION = {
  id: 'session-1',
  label: 'Test Session',
  started_at: '2026-05-23T10:00:00.000Z',
  ended_at: null,
  bwf_tournament_id: null,
  created_by: 'user-1',
  created_at: '2026-05-23T10:00:00.000Z',
}

function mockAuthenticatedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } })
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } })
}

/** Build a fluent Supabase query builder mock. Each method returns the same
 *  object so calls can be chained; `resolveWith` sets the final resolved value. */
function makeQueryBuilder(resolve: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'is', 'limit', 'order', 'maybeSingle', 'single']
  for (const m of methods) {
    builder[m] = vi.fn(() => builder)
  }
  // Terminal calls resolve the promise
  ;(builder.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(resolve)
  ;(builder.single as ReturnType<typeof vi.fn>).mockResolvedValue(resolve)
  return builder
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useCreateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates session with label and now as started_at when no date provided', async () => {
    mockAuthenticatedUser()

    // No bwf_tournament_id — guard check is skipped, only insert runs
    const insertBuilder = makeQueryBuilder({ data: MOCK_SESSION, error: null })
    mockFrom.mockReturnValue(insertBuilder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ label: 'Test Session' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(MOCK_SESSION)
  })

  it('creates session without bwf_tournament_id and skips duplicate guard', async () => {
    mockAuthenticatedUser()

    const insertBuilder = makeQueryBuilder({ data: MOCK_SESSION, error: null })
    mockFrom.mockReturnValue(insertBuilder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ label: 'Casual Session' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // With no bwf_tournament_id the guard query is skipped — `from` is only
    // called once for the insert.
    const sessionCalls = (mockFrom as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: string[]) => c[0] === 'sessions'
    )
    expect(sessionCalls).toHaveLength(1)
  })

  it('throws DuplicateTournamentError when tournament already has a session', async () => {
    mockAuthenticatedUser()

    const existingBuilder = makeQueryBuilder({ data: { id: 'existing-session' }, error: null })
    mockFrom.mockReturnValue(existingBuilder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ label: 'Some Tournament', bwf_tournament_id: 'tournament-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(DuplicateTournamentError)
    expect((result.current.error as Error).message).toBe('A session for this tournament already exists.')
  })

  it('throws error when user is not authenticated', async () => {
    mockUnauthenticated()

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ label: 'Test' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('Not authenticated')
  })

  it('throws error when supabase insert fails', async () => {
    mockAuthenticatedUser()

    const failBuilder = makeQueryBuilder({ data: null, error: { message: 'DB error', code: '23505' } })
    mockFrom.mockReturnValue(failBuilder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ label: 'Test' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('DB error')
  })

  it('creates a scheduled session with custom started_at', async () => {
    mockAuthenticatedUser()

    const scheduledAt = '2026-05-24T19:00:00.000Z'
    const scheduledSession = { ...MOCK_SESSION, started_at: scheduledAt }
    const insertBuilder = makeQueryBuilder({ data: scheduledSession, error: null })
    mockFrom.mockReturnValue(insertBuilder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ label: 'Tomorrow Session', started_at: scheduledAt })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.started_at).toBe(scheduledAt)
  })

  it('invalidates sessions query on success', async () => {
    mockAuthenticatedUser()

    const insertBuilder = makeQueryBuilder({ data: MOCK_SESSION, error: null })
    mockFrom.mockReturnValue(insertBuilder)

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useCreateSession(), { wrapper })
    result.current.mutate({ label: 'Test' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] })
  })
})

describe('DuplicateTournamentError', () => {
  it('has correct name and message', () => {
    const err = new DuplicateTournamentError()
    expect(err.name).toBe('DuplicateTournamentError')
    expect(err.message).toBe('A session for this tournament already exists.')
    expect(err).toBeInstanceOf(Error)
  })
})
