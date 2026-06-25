import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useRenameSession } from '../useSessions'

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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children),
    qc,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useRenameSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates label with the provided value', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRenameSession(), { wrapper })

    result.current.mutate({ id: 'sess-1', label: 'Friday Night' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRpc).toHaveBeenCalledWith('rename_session', { p_id: 'sess-1', p_label: 'Friday Night' })
  })

  it('updates label with the provided value including whitespace', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRenameSession(), { wrapper })

    result.current.mutate({ id: 'sess-1', label: '  Friday Night  ' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRpc).toHaveBeenCalledWith('rename_session', { p_id: 'sess-1', p_label: '  Friday Night  ' })
  })

  it('throws when supabase returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } } as any)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRenameSession(), { wrapper })

    result.current.mutate({ id: 'sess-1', label: 'Test' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('DB error')
  })

  it('invalidates sessions list and single-session queries on success', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null } as any)

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useRenameSession(), { wrapper })
    result.current.mutate({ id: 'sess-1', label: 'New Name' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions', 'sess-1'] })
  })
})
