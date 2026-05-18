# Phase 01 — DB Migration

## SQL: `supabase/migrations/002_sessions.sql`

1. **sessions table**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `label TEXT`
   - `started_at TIMESTAMPTZ DEFAULT now()`
   - `ended_at TIMESTAMPTZ` (NULL = open)
   - `created_by UUID REFERENCES auth.users(id) NOT NULL`
   - `created_at TIMESTAMPTZ DEFAULT now()`

2. **matches table**
   - Add `session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL`

3. **Wipe old data** — `DELETE FROM match_scores; DELETE FROM match_participants; DELETE FROM match_teams; DELETE FROM matches;`

4. **Indexes**
   - `idx_sessions_created_by ON sessions(created_by)`
   - `idx_matches_session_id ON matches(session_id)`
   - `idx_sessions_ended_at ON sessions(ended_at)`
   - Partial unique: `CREATE UNIQUE INDEX one_open_session_per_user ON sessions(created_by) WHERE ended_at IS NULL;`

5. **RLS on sessions** (same owner-based pattern as matches).

## Post-migration

Run `npx supabase db reset` (local) or push to remote.
