/**
 * Unit tests simulating the "players_update_linked_or_admin" RLS policy.
 *
 * The real policy lives in supabase/migrations/013_player_update_rls.sql.
 * Here we mock the Supabase client to return what the DB would return for
 * each identity: admin, linked user, and unlinked regular user.
 *
 * Supabase surfaces an RLS violation as error code '42501'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useUpdatePlayer } from '../usePlayers'
import { useAvatarUpload, useSetDefaultAvatar, useAvatarDelete } from '../useAvatarUpload'

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    storage: { from: (bucket: string) => mockStorageFrom(bucket) },
  },
}))

vi.mock('../../lib/image', () => ({
  compressImage: vi.fn().mockResolvedValue(new Blob(['fake'], { type: 'image/jpeg' })),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLAYER_ID = 'player-abc'
const PLAYER = {
  id: PLAYER_ID,
  name: 'Alice',
  rating: 1200,
  avatar_url: null as string | null,
  is_active: true,
}

/** Error Supabase returns when the RLS policy blocks an UPDATE. */
const RLS_ERROR = {
  code: '42501',
  message: 'new row violates row-level security policy for table "players"',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children),
  }
}

/**
 * Builder for useUpdatePlayer: chain is .update().eq().select().single()
 * The terminal call is .single() which returns a promise.
 */
function makeSelectBuilder(resolve: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['update', 'eq', 'select', 'single', 'maybeSingle']) {
    b[m] = vi.fn(() => b)
  }
  ;(b.single as ReturnType<typeof vi.fn>).mockResolvedValue(resolve)
  return b
}

/**
 * Builder for avatar mutations: chain is .update().eq()
 * The terminal call is .eq() which returns a promise.
 */
function makeUpdateBuilder(resolve: { error: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['update', 'eq']) {
    b[m] = vi.fn(() => b)
  }
  ;(b.eq as ReturnType<typeof vi.fn>).mockResolvedValue(resolve)
  return b
}

function makeStorageBucket(uploadError: unknown = null) {
  return {
    upload: vi.fn().mockResolvedValue({ error: uploadError }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: `https://storage.supabase.co/avatars/players/${PLAYER_ID}.jpg` },
    }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  }
}

function expectErrorCode(error: unknown, code: string) {
  expect(error).toMatchObject({ code })
}

// ─── useUpdatePlayer (name rename) ───────────────────────────────────────────

describe('useUpdatePlayer – RLS: players_update_linked_or_admin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('admin: update succeeds for any player', async () => {
    // DB returns the updated row — admin passes the RLS check.
    mockFrom.mockReturnValue(makeSelectBuilder({ data: { ...PLAYER, name: 'Alice Edited' }, error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdatePlayer(), { wrapper })

    result.current.mutate({ id: PLAYER_ID, name: 'Alice Edited' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.name).toBe('Alice Edited')
  })

  it('linked user: update succeeds for own player', async () => {
    // profiles.player_id === player.id — RLS allows the update.
    mockFrom.mockReturnValue(makeSelectBuilder({ data: { ...PLAYER, name: 'Alice New' }, error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdatePlayer(), { wrapper })

    result.current.mutate({ id: PLAYER_ID, name: 'Alice New' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.name).toBe('Alice New')
  })

  it('unlinked regular user: update is rejected with RLS error', async () => {
    // No matching profiles row — RLS blocks the UPDATE and returns 42501.
    mockFrom.mockReturnValue(makeSelectBuilder({ data: null, error: RLS_ERROR }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdatePlayer(), { wrapper })

    result.current.mutate({ id: PLAYER_ID, name: 'Hacker' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expectErrorCode(result.current.error, '42501')
  })
})

// ─── useAvatarUpload (player entity) ─────────────────────────────────────────

describe('useAvatarUpload – RLS: players_update_linked_or_admin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('admin: avatar upload succeeds for any player', async () => {
    const bucket = makeStorageBucket()
    mockStorageFrom.mockReturnValue(bucket)
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAvatarUpload(), { wrapper })

    result.current.mutate({ file: new File(['img'], 'a.jpg', { type: 'image/jpeg' }), entity: 'players', id: PLAYER_ID })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(bucket.upload).toHaveBeenCalledOnce()
  })

  it('linked user: avatar upload succeeds for own player', async () => {
    const bucket = makeStorageBucket()
    mockStorageFrom.mockReturnValue(bucket)
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAvatarUpload(), { wrapper })

    result.current.mutate({ file: new File(['img'], 'a.jpg', { type: 'image/jpeg' }), entity: 'players', id: PLAYER_ID })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('unlinked regular user: DB update is rejected with RLS error after upload', async () => {
    // Storage upload succeeds, but the subsequent players UPDATE is blocked by RLS.
    const bucket = makeStorageBucket()
    mockStorageFrom.mockReturnValue(bucket)
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: RLS_ERROR }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAvatarUpload(), { wrapper })

    result.current.mutate({ file: new File(['img'], 'a.jpg', { type: 'image/jpeg' }), entity: 'players', id: PLAYER_ID })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expectErrorCode(result.current.error, '42501')
    // Storage upload still happened — the RLS block is at the DB layer.
    expect(bucket.upload).toHaveBeenCalledOnce()
  })

  it('storage upload failure is thrown before reaching DB update', async () => {
    const storageError = { message: 'storage quota exceeded' }
    const bucket = makeStorageBucket(storageError)
    mockStorageFrom.mockReturnValue(bucket)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAvatarUpload(), { wrapper })

    result.current.mutate({ file: new File(['img'], 'a.jpg', { type: 'image/jpeg' }), entity: 'players', id: PLAYER_ID })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { message: string }).message).toBe('storage quota exceeded')
    // DB was never called because the upload failed first.
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

// ─── useSetDefaultAvatar (player entity) ─────────────────────────────────────

describe('useSetDefaultAvatar – RLS: players_update_linked_or_admin', () => {
  beforeEach(() => vi.clearAllMocks())

  const DEFAULT_URL = 'https://multiavatar.com/3'

  it('linked user: set default avatar succeeds for own player', async () => {
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSetDefaultAvatar(), { wrapper })

    result.current.mutate({ url: DEFAULT_URL, entity: 'players', id: PLAYER_ID })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(DEFAULT_URL)
  })

  it('unlinked regular user: set default avatar is rejected with RLS error', async () => {
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: RLS_ERROR }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSetDefaultAvatar(), { wrapper })

    result.current.mutate({ url: DEFAULT_URL, entity: 'players', id: PLAYER_ID })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expectErrorCode(result.current.error, '42501')
  })

  it('old custom avatar is cleaned up from storage before DB update', async () => {
    const bucket = makeStorageBucket()
    mockStorageFrom.mockReturnValue(bucket)
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSetDefaultAvatar(), { wrapper })

    // oldAvatarUrl is a custom uploaded URL, not a multiavatar default
    result.current.mutate({
      url: DEFAULT_URL,
      entity: 'players',
      id: PLAYER_ID,
      oldAvatarUrl: 'https://storage.supabase.co/avatars/players/player-abc.jpg',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(bucket.remove).toHaveBeenCalledWith([`players/${PLAYER_ID}.jpg`])
  })

  it('multiavatar old URL skips storage cleanup', async () => {
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useSetDefaultAvatar(), { wrapper })

    result.current.mutate({
      url: DEFAULT_URL,
      entity: 'players',
      id: PLAYER_ID,
      oldAvatarUrl: 'https://multiavatar.com/5',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // mockStorageFrom was never called because cleanup was skipped.
    expect(mockStorageFrom).not.toHaveBeenCalled()
  })
})

// ─── useAvatarDelete (player entity) ─────────────────────────────────────────

describe('useAvatarDelete – RLS: players_update_linked_or_admin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('linked user: avatar deletion succeeds for own player', async () => {
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAvatarDelete(), { wrapper })

    result.current.mutate({ entity: 'players', id: PLAYER_ID })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('unlinked regular user: avatar deletion is rejected with RLS error', async () => {
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: RLS_ERROR }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAvatarDelete(), { wrapper })

    result.current.mutate({ entity: 'players', id: PLAYER_ID })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expectErrorCode(result.current.error, '42501')
  })

  it('custom old avatar is removed from storage before DB update', async () => {
    const bucket = makeStorageBucket()
    mockStorageFrom.mockReturnValue(bucket)
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAvatarDelete(), { wrapper })

    result.current.mutate({
      entity: 'players',
      id: PLAYER_ID,
      oldAvatarUrl: 'https://storage.supabase.co/avatars/players/player-abc.jpg',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(bucket.remove).toHaveBeenCalledWith([`players/${PLAYER_ID}.jpg`])
  })

  it('no old avatar skips storage cleanup', async () => {
    mockFrom.mockReturnValue(makeUpdateBuilder({ error: null }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAvatarDelete(), { wrapper })

    result.current.mutate({ entity: 'players', id: PLAYER_ID, oldAvatarUrl: null })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockStorageFrom).not.toHaveBeenCalled()
  })
})
