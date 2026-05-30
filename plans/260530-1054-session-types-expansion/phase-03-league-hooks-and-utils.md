# Phase 03: League Hooks & Utils

**Priority:** High — core league logic  
**Status:** Pending  
**Estimated Effort:** Medium  
**Blocked By:** [Phase 02](phase-02-types-and-constants.md)

## Context

Need hooks for league team CRUD, team standings calculation, and a round-robin schedule generator.

## Requirements

### Functional
- `useLeagueTeams(sessionId)` — fetch teams with players for a session
- `useCreateLeagueTeam()` — create team + add players
- `useUpdateLeagueTeam()` — rename team, update roster
- `useDeleteLeagueTeam()` — remove team
- `useLeagueStandings(sessionId)` — derive team W/L/Pts from matches
- `generateRoundRobin(teams, rounds)` — client-side schedule generator

### Non-functional
- Standings computed on client from match data (no stored table)
- Round-robin is pure function, no side effects

## Related Code Files

| Action | File |
|--------|------|
| Create | `src/hooks/useLeagueTeams.ts` |
| Create | `src/hooks/useLeagueStandings.ts` |
| Create | `src/lib/round-robin.ts` |

## Implementation Steps

### 1. Round-Robin Generator (`src/lib/round-robin.ts`)

```typescript
export interface RoundRobinFixture {
  round: number
  teamAIndex: number
  teamBIndex: number
}

export function generateRoundRobin(teamCount: number, totalRounds: number): RoundRobinFixture[] {
  // Circle method: fix team 0, rotate others
  const fixtures: RoundRobinFixture[] = []
  const teams = Array.from({ length: teamCount }, (_, i) => i)
  const half = Math.floor(teamCount / 2)

  for (let cycle = 0; cycle < totalRounds; cycle++) {
    const roundOffset = cycle * (teamCount - 1)
    for (let round = 0; round < teamCount - 1; round++) {
      const currentTeams = [...teams]
      // Rotate (skip first, rotate rest)
      const rotated = [currentTeams[0], ...currentTeams.slice(1).slice(round).concat(currentTeams.slice(1, round + 1))]
      for (let i = 0; i < half; i++) {
        const a = rotated[i]
        const b = rotated[teamCount - 1 - i]
        fixtures.push({
          round: roundOffset + round + 1,
          teamAIndex: Math.min(a, b),
          teamBIndex: Math.max(a, b),
        })
      }
    }
  }
  return fixtures
}
```

### 2. League Teams Hook (`src/hooks/useLeagueTeams.ts`)

```typescript
export function useLeagueTeams(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['league-teams', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_teams')
        .select('*, players:league_team_players(player:players(*))')
        .eq('session_id', sessionId!)
      if (error) throw error
      return (data ?? []).map((t) => ({
        ...t,
        players: t.players?.map((p: { player: Player }) => p.player).filter(Boolean) ?? [],
      })) as LeagueTeamWithPlayers[]
    },
    enabled: !!sessionId,
  })
}

export function useCreateLeagueTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      sessionId: string
      name: string
      playerIds: string[]
    }) => {
      const { data: team, error } = await supabase
        .from('league_teams')
        .insert({ session_id: input.sessionId, name: input.name })
        .select()
        .single()
      if (error) throw error

      if (input.playerIds.length > 0) {
        const { error: pError } = await supabase
          .from('league_team_players')
          .insert(input.playerIds.map((pid) => ({
            league_team_id: team.id,
            player_id: pid,
          })))
        if (pError) throw pError
      }
      return team
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['league-teams', vars.sessionId] })
    },
  })
}

export function useUpdateLeagueTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      teamId: string
      sessionId: string
      name?: string
      playerIds?: string[]
    }) => {
      if (input.name) {
        const { error } = await supabase
          .from('league_teams')
          .update({ name: input.name })
          .eq('id', input.teamId)
        if (error) throw error
      }
      if (input.playerIds !== undefined) {
        // Delete existing, insert new
        await supabase.from('league_team_players').delete().eq('league_team_id', input.teamId)
        if (input.playerIds.length > 0) {
          const { error } = await supabase.from('league_team_players').insert(
            input.playerIds.map((pid) => ({ league_team_id: input.teamId, player_id: pid }))
          )
          if (error) throw error
        }
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['league-teams', vars.sessionId] })
    },
  })
}

export function useDeleteLeagueTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ teamId, sessionId }: { teamId: string; sessionId: string }) => {
      const { error } = await supabase.from('league_teams').delete().eq('id', teamId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['league-teams', vars.sessionId] })
    },
  })
}
```

### 3. League Standings Hook (`src/hooks/useLeagueStandings.ts`)

```typescript
export interface TeamStanding {
  teamId: string
  teamName: string
  played: number
  wins: number
  losses: number
  points: number
}

export function useLeagueStandings(sessionId: string | undefined) {
  const { data: teams } = useLeagueTeams(sessionId)
  const { data: matches } = useMatches(sessionId)

  return useMemo(() => {
    if (!teams || !matches) return null

    // Build player → team map
    const playerToTeam = new Map<string, string>()
    for (const team of teams) {
      for (const player of team.players) {
        playerToTeam.set(player.id, team.id)
      }
    }

    // Initialize standings
    const standings = new Map<string, TeamStanding>()
    for (const team of teams) {
      standings.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0, wins: 0, losses: 0, points: 0,
      })
    }

    // Process completed matches with winners
    for (const match of matches) {
      if (match.status !== 'COMPLETED') continue
      const winnerTeam = match.teams.find((t) => t.is_winner)
      if (!winnerTeam) continue

      const winnerPlayers = match.participants
        .filter((p) => p.team_id === winnerTeam.id)
        .map((p) => p.player_id)

      const loserTeam = match.teams.find((t) => !t.is_winner)
      if (!loserTeam) continue
      const loserPlayers = match.participants
        .filter((p) => p.team_id === loserTeam.id)
        .map((p) => p.player_id)

      // Map to league teams
      const winnerLeagueTeam = playerToTeam.get(winnerPlayers[0])
      const loserLeagueTeam = playerToTeam.get(loserPlayers[0])
      if (!winnerLeagueTeam || !loserLeagueTeam) continue
      if (winnerLeagueTeam === loserLeagueTeam) continue // same team playing itself? skip

      const w = standings.get(winnerLeagueTeam)!
      const l = standings.get(loserLeagueTeam)!
      w.played++; w.wins++; w.points += 2
      l.played++; l.losses++; l.points += 0
    }

    return Array.from(standings.values()).sort((a, b) =>
      b.points - a.points || b.wins - a.wins || a.played - b.played
    )
  }, [teams, matches])
}
```

## Success Criteria

- [ ] `generateRoundRobin(4, 2)` returns 12 fixtures (6 rounds × 2 matches)
- [ ] `useLeagueTeams` fetches teams with nested players
- [ ] `useCreateLeagueTeam` creates team + links players in one operation
- [ ] `useLeagueStandings` correctly derives W/L/Pts from completed matches
- [ ] Standings sorted by points DESC, wins DESC

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Standings O(n²) with many matches | Teams capped at ~4, matches capped at ~12 per round, negligible |
| Player on multiple teams in same league | DB PK prevents this; UI validates |

## Next Steps

Proceed to [Phase 04: Update Session Hooks](phase-04-update-session-hooks.md)
