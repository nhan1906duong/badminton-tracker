# Phase 01: Database Migration

**Priority:** Critical — blocks all other phases  
**Status:** Pending  
**Estimated Effort:** Small

## Context

- `sessions` table currently has: `id`, `label`, `started_at`, `ended_at`, `bwf_tournament_id`, `created_by`, `created_at`
- No explicit session type — regular vs tournament is implicit via `bwf_tournament_id`
- Need `type` column + league config columns + 2 new tables

## Requirements

### Functional
- Add `type` enum column to `sessions`
- Add nullable `league_match_type` and `league_total_rounds`
- Create `league_teams` table
- Create `league_team_players` junction table
- Migrate existing sessions to correct type
- Add RLS policies for new tables

### Non-functional
- Zero downtime (app handles nullable gracefully)
- Backward compatible

## Related Code Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/014_session_types.sql` |

## Implementation Steps

1. **Add type column**
   ```sql
   ALTER TABLE sessions ADD COLUMN type TEXT NOT NULL DEFAULT 'regular';
   ```

2. **Migrate existing rows**
   ```sql
   UPDATE sessions SET type = 'tournament' WHERE bwf_tournament_id IS NOT NULL;
   ```

3. **Add league config columns**
   ```sql
   ALTER TABLE sessions ADD COLUMN league_match_type TEXT;
   ALTER TABLE sessions ADD COLUMN league_total_rounds INT DEFAULT 2;
   ```

4. **Create league_teams table**
   ```sql
   CREATE TABLE league_teams (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
     name TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   CREATE INDEX idx_league_teams_session ON league_teams(session_id);
   ```

5. **Create league_team_players junction**
   ```sql
   CREATE TABLE league_team_players (
     league_team_id UUID REFERENCES league_teams(id) ON DELETE CASCADE NOT NULL,
     player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
     PRIMARY KEY (league_team_id, player_id)
   );
   CREATE INDEX idx_ltp_team ON league_team_players(league_team_id);
   CREATE INDEX idx_ltp_player ON league_team_players(player_id);
   ```

6. **RLS policies for league_teams**
   ```sql
   ALTER TABLE league_teams ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "league_teams_select_all_auth"
     ON league_teams FOR SELECT TO authenticated USING (true);
   CREATE POLICY "league_teams_insert_session_owner"
     ON league_teams FOR INSERT TO authenticated
     WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = league_teams.session_id AND sessions.created_by = auth.uid()));
   CREATE POLICY "league_teams_delete_session_owner"
     ON league_teams FOR DELETE TO authenticated
     USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = league_teams.session_id AND sessions.created_by = auth.uid()));
   ```

7. **RLS policies for league_team_players**
   ```sql
   ALTER TABLE league_team_players ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "ltp_select_all_auth"
     ON league_team_players FOR SELECT TO authenticated USING (true);
   CREATE POLICY "ltp_insert_team_owner"
     ON league_team_players FOR INSERT TO authenticated
     WITH CHECK (EXISTS (
       SELECT 1 FROM league_teams JOIN sessions ON league_teams.session_id = sessions.id
       WHERE league_teams.id = league_team_players.league_team_id AND sessions.created_by = auth.uid()
     ));
   CREATE POLICY "ltp_delete_team_owner"
     ON league_team_players FOR DELETE TO authenticated
     USING (EXISTS (
       SELECT 1 FROM league_teams JOIN sessions ON league_teams.session_id = sessions.id
       WHERE league_teams.id = league_team_players.league_team_id AND sessions.created_by = auth.uid()
     ));
   ```

8. **Check constraint for league columns**
   ```sql
   ALTER TABLE sessions ADD CONSTRAINT chk_league_fields
     CHECK (type != 'league' OR (league_match_type IS NOT NULL AND league_total_rounds IS NOT NULL));
   ```

## Success Criteria

- [ ] Migration runs without error
- [ ] Existing sessions have correct type
- [ ] New tables have proper indexes
- [ ] RLS policies allow correct access patterns
- [ ] Supabase types regenerate cleanly

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Check constraint breaks existing data | Only applies when type='league', existing rows are regular/tournament |
| RLS too restrictive | Test with auth user creating session → team → adding players |

## Next Steps

Proceed to [Phase 02: Types & Constants](phase-02-types-and-constants.md)
