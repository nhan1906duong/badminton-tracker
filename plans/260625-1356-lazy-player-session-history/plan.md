# Lazy Player Session History

**Status:** In Progress  
**Branch:** feature/session-league  
**Date:** 2026-06-25

## Goal

Replace the paginated match-first history with a session-first accordion:
- **Eager**: list all sessions the player joined with aggregate stats (matches, W, L, win%)
- **Lazy**: match details fetched only when a session row is tapped/expanded

## Why

Current implementation cursor-paginates raw matches and groups them client-side. This means 20 matches must load before any session summary appears, and "Load more" is needed to reveal older sessions. The new design shows all sessions immediately and defers the expensive per-match data until the user actually wants it.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Postgres RPC](phase-01-postgres-rpc.md) | ✅ Done |
| 2 | [New hooks](phase-02-hooks.md) | ✅ Done |
| 3 | [UI update](phase-03-ui-update.md) | ✅ Done |

## Files Changed

### New
- `supabase/migrations/20260625000000_player_session_stats_rpc.sql`
- `src/hooks/usePlayerSessionStats.ts`
- `src/hooks/usePlayerMatchesBySession.ts`
- `src/components/session-match-list.tsx`

### Modified
- `src/pages/PlayerDetailPage.tsx` — swap hooks, remove "Load more"

### Removed
- `src/hooks/usePlayerMatchHistory.ts` — replaced by `usePlayerSessionStats`
