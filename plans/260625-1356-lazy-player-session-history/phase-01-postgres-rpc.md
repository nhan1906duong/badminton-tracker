# Phase 1 — Postgres RPC

## RPC: `get_player_session_stats(p_player_id)`

Returns one row per session the player participated in, with aggregate stats.

**Returns:**
| Column | Type | Notes |
|--------|------|-------|
| `session_id` | uuid | |
| `label` | text | nullable |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz | nullable |
| `type` | text | `regular\|tournament\|league` |
| `match_count` | bigint | completed matches with a winner |
| `wins` | bigint | player's team `is_winner = true` |
| `losses` | bigint | player's team `is_winner = false` (match has winner) |

**Logic:**
- Join: `sessions → matches → match_participants (player filter) → match_teams`
- Filter: `m.status = 'COMPLETED'` AND match has at least one winning team
- Group by session
- Order by `started_at DESC`

**File:** `supabase/migrations/20260625000000_player_session_stats_rpc.sql`
