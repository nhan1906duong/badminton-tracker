import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useRenameSession } from '../useSessions'

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

/** Build a builder where .eq() is the terminal (awaitable) call. */
function makeUpdateBuilder(resolve: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'is', 'limit', 'order', 'maybeSingle', 'single']) {
    builder[m] = vi.fn(() => builder)
  }
  builder['eq'] = vi.fn(() => Promise.resolve(resolve))
  return builder
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useRenameSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates label with trimmed value', async () => {
    const builder = makeUpdateBuilder({ data: null, error: null })
    mockFrom.mockReturnValue(builder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRenameSession(), { wrapper })

    result.current.mutate({ id: 'sess-1', label: '  Friday Night  ' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.update).toHaveBeenCalledWith({ label: 'Friday Night' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'sess-1')
  })

  it('saves null when label is blank after trimming', async () => {
    const builder = makeUpdateBuilder({ data: null, error: null })
    mockFrom.mockReturnValue(builder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRenameSession(), { wrapper })

    result.current.mutate({ id: 'sess-1', label: '   ' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(builder.update).toHaveBeenCalledWith({ label: null })
  })

  it('throws when supabase returns an error', async () => {
    const builder = makeUpdateBuilder({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(builder)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useRenameSession(), { wrapper })

    result.current.mutate({ id: 'sess-1', label: 'Test' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('DB error')
  })

  it('invalidates sessions list and single-session queries on success', async () => {
    const builder = makeUpdateBuilder({ data: null, error: null })
    mockFrom.mockReturnValue(builder)

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useRenameSession(), { wrapper })
    result.current.mutate({ id: 'sess-1', label: 'New Name' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions', 'sess-1'] })
  })
})
