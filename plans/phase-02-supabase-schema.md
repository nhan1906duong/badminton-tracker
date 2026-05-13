# Phase 2 — Supabase Schema

## Overview
- **Priority**: P0
- **Status**: Pending
- **Description**: Design and implement PostgreSQL schema in Supabase with tables, relationships, RLS policies.

## Data Model

### Tables

#### `players`
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
```

#### `matches`
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_type TEXT NOT NULL DEFAULT 'MEN_DOUBLES',
  played_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `match_teams`
```sql
CREATE TABLE match_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  team_label TEXT NOT NULL, -- 'TEAM_A' | 'TEAM_B'
  is_winner BOOLEAN DEFAULT false,
  UNIQUE(match_id, team_label)
);
```

#### `match_participants`
```sql
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES match_teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) NOT NULL,
  UNIQUE(match_id, player_id)
);
```

#### `match_scores`
```sql
CREATE TABLE match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  set_number INT NOT NULL,
  team_a_score INT NOT NULL DEFAULT 0,
  team_b_score INT NOT NULL DEFAULT 0,
  UNIQUE(match_id, set_number)
);
```

### Enums
- `match_type`: `MEN_SINGLES`, `WOMEN_SINGLES`, `MEN_DOUBLES`, `WOMEN_DOUBLES`, `MIXED_DOUBLES`

## Row Level Security (RLS)

Enable RLS on all tables. Policies:
- `players`: SELECT for all authenticated users; INSERT/UPDATE/DELETE for creator or any authenticated user (open sharing model)
- `matches`: SELECT for all authenticated users; INSERT/UPDATE/DELETE for creator
- `match_teams`, `match_participants`, `match_scores`: Same as matches (cascade via match ownership)

## Implementation Steps

1. Create Supabase project at https://supabase.com
2. Run schema SQL in SQL Editor
3. Enable RLS on all tables
4. Create policies
5. Generate TypeScript types:
   ```bash
   npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/database.ts
   ```

## Files to Create
- `supabase/migrations/001_initial_schema.sql`
- `src/types/database.ts` (generated)

## Success Criteria
- [ ] All tables created in Supabase
- [ ] RLS enabled with correct policies
- [ ] TypeScript types generated and imported
- [ ] Can insert/read test data via Supabase client

## Next Steps
- Proceed to [Phase 3 — Auth & Users](phase-03-auth-users.md)
