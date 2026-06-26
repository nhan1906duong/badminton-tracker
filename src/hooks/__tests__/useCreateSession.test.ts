import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useCreateSession, DuplicateTournamentError } from '../useSessions'

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => mockFrom(table),
    rpc: (name: string, params: unknown) => mockRpc(name, params),
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useCreateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates session with label and now as started_at when no date provided', async () => {
    mockAuthenticatedUser()

    mockRpc.mockResolvedValueOnce({ data: [MOCK_SESSION], error: null } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ type: 'regular', label: 'Test Session' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(MOCK_SESSION)
  })

  it('creates session without bwf_tournament_id', async () => {
    mockAuthenticatedUser()

    mockRpc.mockResolvedValueOnce({ data: [MOCK_SESSION], error: null } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ type: 'regular', label: 'Casual Session' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRpc).toHaveBeenCalledWith('create_session', {
      p_type: 'regular',
      p_label: 'Casual Session',
      p_started_at: expect.any(String),
      p_bwf_tournament_id: null,
      p_league_match_type: null,
      p_league_total_rounds: null,
    })
  })

  it('throws DuplicateTournamentError when RPC returns duplicate tournament error', async () => {
    mockAuthenticatedUser()

    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'A session for this tournament already exists' },
    } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ type: 'tournament', label: 'Some Tournament', bwf_tournament_id: 'tournament-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(DuplicateTournamentError)
    expect((result.current.error as Error).message).toBe('A session for this tournament already exists.')
  })

  it('throws error when RPC returns authentication error', async () => {
    mockAuthenticatedUser()

    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not authenticated' },
    } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ type: 'regular', label: 'Test' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('Not authenticated')
  })

  it('throws error when RPC fails', async () => {
    mockAuthenticatedUser()

    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error', code: '23505' } } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ type: 'regular', label: 'Test' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('DB error')
  })

  it('creates a scheduled session with custom started_at', async () => {
    mockAuthenticatedUser()

    const scheduledAt = '2026-05-24T19:00:00.000Z'
    const scheduledSession = { ...MOCK_SESSION, started_at: scheduledAt }
    mockRpc.mockResolvedValueOnce({ data: [scheduledSession], error: null } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateSession(), { wrapper })

    result.current.mutate({ type: 'regular', label: 'Tomorrow Session', started_at: scheduledAt })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.started_at).toBe(scheduledAt)
  })

  it('invalidates sessions query on success', async () => {
    mockAuthenticatedUser()

    mockRpc.mockResolvedValueOnce({ data: [MOCK_SESSION], error: null } as any)

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useCreateSession(), { wrapper })
    result.current.mutate({ type: 'regular', label: 'Test' })

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
