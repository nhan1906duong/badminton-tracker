---
name: project-rpc-conventions
description: Conventions for Postgres RPCs in the badminton match tracker (SECURITY DEFINER, grants, auth checks)
metadata:
  type: project
---

RPC conventions observed/decided for this Supabase project (migrations in `supabase/migrations/`).

**Why:** The project pushes aggregation/writes into Postgres RPCs (scalability + atomicity). Read RPCs already exist (`get_leaderboard_page`, `get_player_ranking_summary`, `count_ranked_matches`, `get_badge_leaders`, `refresh_player_session_stats`, `refresh_player_all_time_stats`).

**How to apply:**
- Existing READ RPCs use `security invoker`. New WRITE RPCs (the mutations-to-RPCs migration) should use `security definer` + `set search_path = public`, because they replace direct table writes that were RLS-gated — so each write RPC must re-check auth/admin INSIDE the function (`auth.uid()` not null; `is_admin()` for deletes). `is_admin()` helper exists since `008_role.sql`.
- Admin-only operations today (RLS in 008_role.sql): delete sessions, matches, players.
- Add `grant execute on function <sig> to authenticated, anon;` matching each table's current grant audience (some tables are anon-readable per `018_public_read.sql`, `022_rackets_quotes_anon_read.sql`).
- Migration filenames are timestamp-prefixed; the mutations-to-RPCs plan uses the `2026062500001X_*` sequence (after `...0006`).
- Composite hook inputs (score arrays, player-id arrays, league fixtures) are passed as `jsonb`; create/update RPCs `returns <table>` so hooks keep `.single()`-style return typing.

See [[project-elo-plpgsql-port]].
