import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useCreatePlayerRacket,
  useDeletePlayerRacket,
  useUpdatePlayerRacket,
} from '../usePlayerRackets'

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (name: string, params: unknown) => mockRpc(name, params),
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children),
    qc,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('usePlayerRackets mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a racket and invalidates the player rackets query', async () => {
    const racket = {
      id: 'racket-1',
      player_id: 'player-1',
      brand: 'Yonex',
      real_name: 'Astrox 100ZZ',
      nickname: null,
      created_at: '2026-01-01',
    }
    mockRpc.mockResolvedValueOnce({ data: [racket], error: null } as any)

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useCreatePlayerRacket(), { wrapper })

    result.current.mutate({ player_id: 'player-1', brand: 'Yonex', real_name: 'Astrox 100ZZ' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRpc).toHaveBeenCalledWith('create_player_racket', {
      p_player_id: 'player-1',
      p_brand: 'Yonex',
      p_real_name: 'Astrox 100ZZ',
      p_nickname: null,
      p_mascot_id: null,
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['player-rackets', 'player-1'] })
  })

  it('updates a racket', async () => {
    const racket = {
      id: 'racket-1',
      player_id: 'player-1',
      brand: 'Victor',
      real_name: 'Thruster K Falcon',
      nickname: 'Falcon',
      created_at: '2026-01-01',
    }
    mockRpc.mockResolvedValueOnce({ data: [racket], error: null } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdatePlayerRacket(), { wrapper })

    result.current.mutate({
      id: 'racket-1',
      brand: 'Victor',
      real_name: 'Thruster K Falcon',
      nickname: 'Falcon',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRpc).toHaveBeenCalledWith('update_player_racket', {
      p_id: 'racket-1',
      p_brand: 'Victor',
      p_real_name: 'Thruster K Falcon',
      p_nickname: 'Falcon',
      p_mascot_id: null,
    })
  })

  it('deletes a racket and invalidates the player rackets query', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null } as any)

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useDeletePlayerRacket(), { wrapper })

    result.current.mutate({ id: 'racket-1', player_id: 'player-1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRpc).toHaveBeenCalledWith('delete_player_racket', { p_id: 'racket-1' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['player-rackets', 'player-1'] })
  })

  it('throws when supabase returns an error on create', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreatePlayerRacket(), { wrapper })

    result.current.mutate({ player_id: 'player-1', brand: 'Yonex', real_name: 'Astrox 100ZZ' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('DB error')
  })
})
