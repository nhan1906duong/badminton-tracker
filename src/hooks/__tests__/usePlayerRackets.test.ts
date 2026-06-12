import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useCreatePlayerRacket, useUpdatePlayerRacket, useDeletePlayerRacket } from '../usePlayerRackets'

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
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

/** Build a builder where .single() is the terminal (awaitable) call. */
function makeSingleBuilder(resolve: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order']) {
    builder[m] = vi.fn(() => builder)
  }
  builder['single'] = vi.fn(() => Promise.resolve(resolve))
  return builder
}

/** Build a builder where .eq() is the terminal (awaitable) call. */
function makeEqTerminalBuilder(resolve: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'order']) {
    builder[m] = vi.fn(() => builder)
  }
  builder['eq'] = vi.fn(() => Promise.resolve(resolve))
  return builder
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('usePlayerRackets mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a racket and invalidates the player rackets query', async () => {
    const racket = { id: 'racket-1', player_id: 'player-1', brand: 'Yonex', real_name: 'Astrox 100ZZ', nickname: null, created_at: '2026-01-01' }
    const builder = makeSingleBuilder({ data: racket, error: null })
    mockFrom.mockReturnValue(builder)

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useCreatePlayerRacket(), { wrapper })

    result.current.mutate({ player_id: 'player-1', brand: 'Yonex', real_name: 'Astrox 100ZZ' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockFrom).toHaveBeenCalledWith('player_rackets')
    expect(builder.insert).toHaveBeenCalledWith({ player_id: 'player-1', brand: 'Yonex', real_name: 'Astrox 100ZZ', nickname: null })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['player-rackets', 'player-1'] })
  })

  it('updates a racket', async () => {
    const racket = { id: 'racket-1', player_id: 'player-1', brand: 'Victor', real_name: 'Thruster K Falcon', nickname: 'Falcon', created_at: '2026-01-01' }
    const builder = makeSingleBuilder({ data: racket, error: null })
    mockFrom.mockReturnValue(builder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdatePlayerRacket(), { wrapper })

    result.current.mutate({ id: 'racket-1', brand: 'Victor', real_name: 'Thruster K Falcon', nickname: 'Falcon' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.update).toHaveBeenCalledWith({ brand: 'Victor', real_name: 'Thruster K Falcon', nickname: 'Falcon' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'racket-1')
  })

  it('deletes a racket and invalidates the player rackets query', async () => {
    const builder = makeEqTerminalBuilder({ data: null, error: null })
    mockFrom.mockReturnValue(builder)

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useDeletePlayerRacket(), { wrapper })

    result.current.mutate({ id: 'racket-1', player_id: 'player-1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 'racket-1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['player-rackets', 'player-1'] })
  })

  it('throws when supabase returns an error on create', async () => {
    const builder = makeSingleBuilder({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(builder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreatePlayerRacket(), { wrapper })

    result.current.mutate({ player_id: 'player-1', brand: 'Yonex', real_name: 'Astrox 100ZZ' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('DB error')
  })
})
