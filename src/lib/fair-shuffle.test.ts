import { describe, it, expect } from 'vitest'
import {
  generateNextMatch,
  generateMatchSchedule,
  applyMatchResult,
  makeSplitKey,
  enumerateSplits,
  type ShufflePlayer,
  type ShuffleMatch,
} from './fair-shuffle'

function makePlayers(count: number): ShufflePlayer[] {
  return Array.from({ length: count }, (_, i) => ({ id: String(i + 1), name: `Player${i + 1}` }))
}

function emptyInput(players: ShufflePlayer[]) {
  return {
    selectedPlayers: players,
    playedSplits: new Set<string>(),
    recentMatchHistory: [] as ShuffleMatch[],
  }
}

// ── makeSplitKey ─────────────────────────────────────────────────────────────

describe('makeSplitKey', () => {
  it('is symmetric — team order does not matter', () => {
    expect(makeSplitKey(['a', 'b'], ['c', 'd'])).toBe(makeSplitKey(['c', 'd'], ['a', 'b']))
  })

  it('is symmetric — player order within a team does not matter', () => {
    expect(makeSplitKey(['a', 'b'], ['c', 'd'])).toBe(makeSplitKey(['b', 'a'], ['d', 'c']))
  })

  it('produces a stable string', () => {
    expect(makeSplitKey(['a', 'b'], ['c', 'd'])).toBe('a+b|c+d')
  })

  it('different splits produce different keys', () => {
    const ab_cd = makeSplitKey(['a', 'b'], ['c', 'd'])
    const ac_bd = makeSplitKey(['a', 'c'], ['b', 'd'])
    const ad_bc = makeSplitKey(['a', 'd'], ['b', 'c'])
    expect(new Set([ab_cd, ac_bd, ad_bc]).size).toBe(3)
  })
})

// ── enumerateSplits ───────────────────────────────────────────────────────────

describe('enumerateSplits', () => {
  it('returns 3 splits for 4 players', () => {
    expect(enumerateSplits(makePlayers(4))).toHaveLength(3)
  })

  it('returns 15 splits for 5 players (C(5,4)×3)', () => {
    expect(enumerateSplits(makePlayers(5))).toHaveLength(15)
  })

  it('returns 45 splits for 6 players (C(6,4)×3)', () => {
    expect(enumerateSplits(makePlayers(6))).toHaveLength(45)
  })

  it('returns empty for fewer than 4 players', () => {
    expect(enumerateSplits(makePlayers(3))).toHaveLength(0)
  })

  it('all split keys are unique', () => {
    const splits = enumerateSplits(makePlayers(6))
    const keys = splits.map(s => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('each split has 2 players per team', () => {
    for (const s of enumerateSplits(makePlayers(5))) {
      expect(s.team1).toHaveLength(2)
      expect(s.team2).toHaveLength(2)
    }
  })

  it('no player appears in both teams of the same split', () => {
    for (const s of enumerateSplits(makePlayers(6))) {
      const ids = [...s.team1, ...s.team2].map(p => p.id)
      expect(new Set(ids).size).toBe(4)
    }
  })

  it('with 5 players each split has exactly 1 resting', () => {
    for (const s of enumerateSplits(makePlayers(5))) {
      expect(s.resting).toHaveLength(1)
    }
  })
})

// ── generateNextMatch — validation ───────────────────────────────────────────

describe('generateNextMatch — validation', () => {
  it('throws with fewer than 4 players', () => {
    expect(() =>
      generateNextMatch({ selectedPlayers: makePlayers(3), playedSplits: new Set(), recentMatchHistory: [] })
    ).toThrow("Please select at least 4 players to generate a men's doubles match.")
  })

  it('throws with 0 players', () => {
    expect(() =>
      generateNextMatch({ selectedPlayers: [], playedSplits: new Set(), recentMatchHistory: [] })
    ).toThrow()
  })
})

// ── generateNextMatch — match structure ───────────────────────────────────────

describe('generateNextMatch — match structure', () => {
  it('returns exactly 4 playing players', () => {
    const m = generateNextMatch(emptyInput(makePlayers(6)))
    expect([...m.team1, ...m.team2]).toHaveLength(4)
  })

  it('each team has exactly 2 players', () => {
    const m = generateNextMatch(emptyInput(makePlayers(6)))
    expect(m.team1).toHaveLength(2)
    expect(m.team2).toHaveLength(2)
  })

  it('no player appears twice in the same match', () => {
    const m = generateNextMatch(emptyInput(makePlayers(6)))
    const ids = [...m.team1, ...m.team2].map(p => p.id)
    expect(new Set(ids).size).toBe(4)
  })

  it('resting players are a subset of selected players', () => {
    const players = makePlayers(6)
    const selectedIds = new Set(players.map(p => p.id))
    const m = generateNextMatch(emptyInput(players))
    for (const p of m.resting) expect(selectedIds.has(p.id)).toBe(true)
  })

  it('non-selected players never appear', () => {
    const all = makePlayers(10)
    const selected = all.slice(0, 6)
    const nonIds = new Set(all.slice(6).map(p => p.id))
    const m = generateNextMatch(emptyInput(selected))
    for (const p of [...m.team1, ...m.team2, ...m.resting]) {
      expect(nonIds.has(p.id)).toBe(false)
    }
  })

  it('with exactly 4 players, no one rests', () => {
    const m = generateNextMatch(emptyInput(makePlayers(4)))
    expect(m.resting).toHaveLength(0)
  })

  it('with 5 players, exactly 1 rests', () => {
    const m = generateNextMatch(emptyInput(makePlayers(5)))
    expect(m.resting).toHaveLength(1)
  })

  it('with 6 players, exactly 2 rest', () => {
    const m = generateNextMatch(emptyInput(makePlayers(6)))
    expect(m.resting).toHaveLength(2)
  })
})

// ── generateNextMatch — tier selection ───────────────────────────────────────
//
// Tier 3 (best): not played in session + no partner pair repeated from last 2 matches
// Tier 2:        not played in session + a team pair appeared recently
// Tier 1:        already played in session
//
// Algorithm picks randomly from the best non-empty tier.

describe('generateNextMatch — tier selection', () => {
  it('tier 3: always picks the sole unplayed, non-recent split when the other two are played', () => {
    const players = makePlayers(4)
    const splits = enumerateSplits(players)
    const playedSplits = new Set([splits[0].key, splits[1].key])
    for (let i = 0; i < 20; i++) {
      const m = generateNextMatch({ selectedPlayers: players, playedSplits, recentMatchHistory: [] })
      const key = makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id])
      expect(key).toBe(splits[2].key)
    }
  })

  it('tier 3: never picks a split whose partner pairs appeared in a recent match when tier-3 alternatives exist', () => {
    const players = makePlayers(4)
    const splits = enumerateSplits(players)
    // splits[0] is demoted to tier 2 because its partner pairs are in recent history
    const recentMatch: ShuffleMatch = { team1: splits[0].team1, team2: splits[0].team2, resting: [] }
    // splits[1] and splits[2] share no partner pairs with splits[0], so they are tier 3
    for (let i = 0; i < 30; i++) {
      const m = generateNextMatch({ selectedPlayers: players, playedSplits: new Set(), recentMatchHistory: [recentMatch] })
      const key = makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id])
      expect(key).not.toBe(splits[0].key)
    }
  })

  it('tier 2 fallback: picks the only unplayed split even when its partner pairs appeared recently', () => {
    const players = makePlayers(4)
    const splits = enumerateSplits(players)
    // splits[0] and splits[1] are played (tier 1); splits[2] is unplayed but has recent partners (tier 2)
    const playedSplits = new Set([splits[0].key, splits[1].key])
    const recentMatch: ShuffleMatch = { team1: splits[2].team1, team2: splits[2].team2, resting: [] }
    for (let i = 0; i < 10; i++) {
      const m = generateNextMatch({ selectedPlayers: players, playedSplits, recentMatchHistory: [recentMatch] })
      const key = makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id])
      expect(key).toBe(splits[2].key)
    }
  })

  it('tier 1 fallback: returns a valid split when all splits are already played', () => {
    const players = makePlayers(4)
    const splits = enumerateSplits(players)
    const playedSplits = new Set(splits.map(s => s.key))
    const validKeys = new Set(splits.map(s => s.key))
    for (let i = 0; i < 10; i++) {
      const m = generateNextMatch({ selectedPlayers: players, playedSplits, recentMatchHistory: [] })
      const key = makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id])
      expect(validKeys.has(key)).toBe(true)
    }
  })

  it('no-repeat: never returns the same split twice in a row when alternatives exist in the tier', () => {
    const players = makePlayers(4) // 3 splits — always 2+ candidates in tier 3 on first call
    let lastKey: string | null = null
    for (let i = 0; i < 20; i++) {
      const m = generateNextMatch({
        selectedPlayers: players,
        playedSplits: new Set(),
        recentMatchHistory: [],
        lastPickKey: lastKey ?? undefined,
      })
      const key = makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id])
      if (lastKey !== null) expect(key).not.toBe(lastKey)
      lastKey = key
    }
  })

  it('no-repeat: still returns a result when only one split is available (no lastPickKey filtering)', () => {
    const players = makePlayers(4)
    const splits = enumerateSplits(players)
    // Only splits[2] left unplayed; lastPickKey is splits[2] itself — pool size = 1, so filtering is skipped
    const playedSplits = new Set([splits[0].key, splits[1].key])
    for (let i = 0; i < 10; i++) {
      const m = generateNextMatch({
        selectedPlayers: players,
        playedSplits,
        recentMatchHistory: [],
        lastPickKey: splits[2].key,
      })
      const key = makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id])
      expect(key).toBe(splits[2].key)
    }
  })
})

// ── applyMatchResult ──────────────────────────────────────────────────────────

describe('applyMatchResult', () => {
  it('adds the split key to playedSplits', () => {
    const players = makePlayers(4)
    const playedSplits = new Set<string>()
    const match: ShuffleMatch = { team1: [players[0], players[1]], team2: [players[2], players[3]], resting: [] }
    applyMatchResult(match, playedSplits, [])
    const key = makeSplitKey([players[0].id, players[1].id], [players[2].id, players[3].id])
    expect(playedSplits.has(key)).toBe(true)
  })

  it('appends the match to recentMatchHistory', () => {
    const players = makePlayers(4)
    const recentMatchHistory: ShuffleMatch[] = []
    const match: ShuffleMatch = { team1: [players[0], players[1]], team2: [players[2], players[3]], resting: [] }
    applyMatchResult(match, new Set(), recentMatchHistory)
    expect(recentMatchHistory).toHaveLength(1)
    expect(recentMatchHistory[0]).toBe(match)
  })

  it('trims recentMatchHistory to at most 2 entries', () => {
    const players = makePlayers(4)
    const splits = enumerateSplits(players)
    const recentMatchHistory: ShuffleMatch[] = []
    for (const s of splits) {
      applyMatchResult({ team1: s.team1, team2: s.team2, resting: s.resting }, new Set(), recentMatchHistory)
    }
    expect(recentMatchHistory).toHaveLength(2)
  })

  it('retains the 2 most recent entries after overflow', () => {
    const players = makePlayers(4)
    const splits = enumerateSplits(players) // 3 splits
    const recentMatchHistory: ShuffleMatch[] = []
    const matches = splits.map(s => ({ team1: s.team1, team2: s.team2, resting: s.resting }))
    for (const m of matches) {
      applyMatchResult(m, new Set(), recentMatchHistory)
    }
    expect(recentMatchHistory[0]).toBe(matches[1])
    expect(recentMatchHistory[1]).toBe(matches[2])
  })
})

// ── generateMatchSchedule ─────────────────────────────────────────────────────

describe('generateMatchSchedule', () => {
  it('generates the requested number of matches', () => {
    expect(generateMatchSchedule(makePlayers(6), 12)).toHaveLength(12)
    expect(generateMatchSchedule(makePlayers(4), 8)).toHaveLength(8)
  })

  it('every match has exactly 4 playing players', () => {
    for (const m of generateMatchSchedule(makePlayers(6), 12)) {
      expect([...m.team1, ...m.team2]).toHaveLength(4)
    }
  })

  it('no player appears twice in any single match', () => {
    for (const m of generateMatchSchedule(makePlayers(6), 12)) {
      const ids = [...m.team1, ...m.team2].map(p => p.id)
      expect(new Set(ids).size).toBe(4)
    }
  })

  it('resting players in every match are selected players only', () => {
    const players = makePlayers(6)
    const selectedIds = new Set(players.map(p => p.id))
    for (const m of generateMatchSchedule(players, 12)) {
      for (const p of m.resting) expect(selectedIds.has(p.id)).toBe(true)
    }
  })

  it('non-selected players never appear when a subset is used', () => {
    const all = makePlayers(10)
    const selected = all.slice(0, 6)
    const nonIds = new Set(all.slice(6).map(p => p.id))
    for (const m of generateMatchSchedule(selected, 12)) {
      for (const p of [...m.team1, ...m.team2, ...m.resting]) {
        expect(nonIds.has(p.id)).toBe(false)
      }
    }
  })

  it('with 4 players: first 3 matches cover all 3 distinct splits before any repeat', () => {
    // Tier-3 candidates drain in order, so the 3 unplayed splits are always exhausted first
    const players = makePlayers(4)
    const matches = generateMatchSchedule(players, 3)
    const keys = matches.map(m => makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id]))
    expect(new Set(keys).size).toBe(3)
  })

  it('partner repetition stays low with 6 players / 12 matches (avg max < 5 over 20 runs)', () => {
    const RUNS = 20
    let totalMax = 0
    const players = makePlayers(6)
    for (let r = 0; r < RUNS; r++) {
      const counts = new Map<string, number>()
      for (const m of generateMatchSchedule(players, 12)) {
        const p1 = [m.team1[0].id, m.team1[1].id].sort().join('+')
        const p2 = [m.team2[0].id, m.team2[1].id].sort().join('+')
        counts.set(p1, (counts.get(p1) ?? 0) + 1)
        counts.set(p2, (counts.get(p2) ?? 0) + 1)
      }
      totalMax += Math.max(...counts.values())
    }
    expect(totalMax / RUNS).toBeLessThan(5)
  })
})
