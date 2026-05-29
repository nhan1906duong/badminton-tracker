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

function emptyState() {
  return {
    splitRecord: new Map<string, { team1Wins: number; team2Wins: number }>(),
    cycleUsedSplits: new Set<string>(),
    playerWins: new Map<string, number>(),
    playerPlayed: new Map<string, number>(),
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
      generateNextMatch({ selectedPlayers: makePlayers(3), ...emptyState() })
    ).toThrow("Please select at least 4 players to generate a men's doubles match.")
  })

  it('throws with 0 players', () => {
    expect(() =>
      generateNextMatch({ selectedPlayers: [], ...emptyState() })
    ).toThrow()
  })
})

// ── generateNextMatch — match structure ───────────────────────────────────────

describe('generateNextMatch — match structure', () => {
  it('returns exactly 4 playing players', () => {
    const m = generateNextMatch({ selectedPlayers: makePlayers(6), ...emptyState() })
    expect([...m.team1, ...m.team2]).toHaveLength(4)
  })

  it('each team has exactly 2 players', () => {
    const m = generateNextMatch({ selectedPlayers: makePlayers(6), ...emptyState() })
    expect(m.team1).toHaveLength(2)
    expect(m.team2).toHaveLength(2)
  })

  it('no player appears twice in the same match', () => {
    const m = generateNextMatch({ selectedPlayers: makePlayers(6), ...emptyState() })
    const ids = [...m.team1, ...m.team2].map(p => p.id)
    expect(new Set(ids).size).toBe(4)
  })

  it('resting players are a subset of selected players', () => {
    const players = makePlayers(6)
    const selectedIds = new Set(players.map(p => p.id))
    const m = generateNextMatch({ selectedPlayers: players, ...emptyState() })
    for (const p of m.resting) expect(selectedIds.has(p.id)).toBe(true)
  })

  it('non-selected players never appear', () => {
    const all = makePlayers(10)
    const selected = all.slice(0, 6)
    const nonIds = new Set(all.slice(6).map(p => p.id))
    const m = generateNextMatch({ selectedPlayers: selected, ...emptyState() })
    for (const p of [...m.team1, ...m.team2, ...m.resting]) {
      expect(nonIds.has(p.id)).toBe(false)
    }
  })

  it('with exactly 4 players, no one rests', () => {
    const m = generateNextMatch({ selectedPlayers: makePlayers(4), ...emptyState() })
    expect(m.resting).toHaveLength(0)
  })

  it('with 5 players, exactly 1 rests', () => {
    const m = generateNextMatch({ selectedPlayers: makePlayers(5), ...emptyState() })
    expect(m.resting).toHaveLength(1)
  })

  it('with 6 players, exactly 2 rest', () => {
    const m = generateNextMatch({ selectedPlayers: makePlayers(6), ...emptyState() })
    expect(m.resting).toHaveLength(2)
  })
})

// ── Cycle behavior ────────────────────────────────────────────────────────────

describe('cycle behavior', () => {
  it('4 players: covers all 3 splits before repeating', () => {
    const players = makePlayers(4)
    const state = emptyState()
    const total = enumerateSplits(players).length // 3
    const seen = new Set<string>()

    for (let i = 0; i < total; i++) {
      const m = generateNextMatch({ selectedPlayers: players, ...state })
      const key = makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id])
      expect(seen.has(key)).toBe(false)
      seen.add(key)
      applyMatchResult(m, null, state.splitRecord, state.cycleUsedSplits, total, state.playerWins, state.playerPlayed)
    }

    expect(seen.size).toBe(3)
  })

  it('cycle resets after all splits are used — 4th match is a valid split', () => {
    const players = makePlayers(4)
    const state = emptyState()
    const total = enumerateSplits(players).length // 3

    for (let i = 0; i < total; i++) {
      const m = generateNextMatch({ selectedPlayers: players, ...state })
      applyMatchResult(m, null, state.splitRecord, state.cycleUsedSplits, total, state.playerWins, state.playerPlayed)
    }

    // cycle should have reset
    expect(state.cycleUsedSplits.size).toBe(0)

    // 4th match should work fine
    const m4 = generateNextMatch({ selectedPlayers: players, ...state })
    expect([...m4.team1, ...m4.team2]).toHaveLength(4)
  })

  it('5 players: covers all 15 splits in first 15 matches', () => {
    const players = makePlayers(5)
    const state = emptyState()
    const total = enumerateSplits(players).length // 15
    const seen = new Set<string>()

    for (let i = 0; i < total; i++) {
      const m = generateNextMatch({ selectedPlayers: players, ...state })
      const key = makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id])
      expect(seen.has(key)).toBe(false)
      seen.add(key)
      applyMatchResult(m, null, state.splitRecord, state.cycleUsedSplits, total, state.playerWins, state.playerPlayed)
    }

    expect(seen.size).toBe(15)
  })
})

// ── applyMatchResult ──────────────────────────────────────────────────────────

describe('applyMatchResult', () => {
  it('adds the split key to cycleUsedSplits', () => {
    const players = makePlayers(4)
    const state = emptyState()
    const total = enumerateSplits(players).length
    const match: ShuffleMatch = {
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      resting: [],
    }
    applyMatchResult(match, null, state.splitRecord, state.cycleUsedSplits, total, state.playerWins, state.playerPlayed)
    expect(state.cycleUsedSplits.size).toBe(1)
  })

  it('resets cycleUsedSplits when all splits are used', () => {
    const players = makePlayers(4)
    const state = emptyState()
    const total = enumerateSplits(players).length // 3
    const splits = enumerateSplits(players)

    for (const s of splits) {
      applyMatchResult(
        { team1: s.team1, team2: s.team2, resting: s.resting },
        null,
        state.splitRecord,
        state.cycleUsedSplits,
        total,
        state.playerWins,
        state.playerPlayed,
      )
    }

    expect(state.cycleUsedSplits.size).toBe(0)
  })

  it('records winning team in playerWins', () => {
    const players = makePlayers(4)
    const state = emptyState()
    const total = enumerateSplits(players).length
    const match: ShuffleMatch = {
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      resting: [],
    }
    applyMatchResult(match, 'team1', state.splitRecord, state.cycleUsedSplits, total, state.playerWins, state.playerPlayed)
    expect(state.playerWins.get(players[0].id)).toBe(1)
    expect(state.playerWins.get(players[1].id)).toBe(1)
    expect(state.playerWins.get(players[2].id)).toBeUndefined()
    expect(state.playerWins.get(players[3].id)).toBeUndefined()
  })

  it('records win in splitRecord for the normalized team', () => {
    const players = makePlayers(4)
    const state = emptyState()
    const total = enumerateSplits(players).length
    const match: ShuffleMatch = {
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      resting: [],
    }
    applyMatchResult(match, 'team1', state.splitRecord, state.cycleUsedSplits, total, state.playerWins, state.playerPlayed)
    const key = makeSplitKey([players[0].id, players[1].id], [players[2].id, players[3].id])
    const rec = state.splitRecord.get(key)!
    expect(rec.team1Wins + rec.team2Wins).toBe(1)
  })

  it('tracks playerPlayed for all 4 playing players', () => {
    const players = makePlayers(6)
    const state = emptyState()
    const total = enumerateSplits(players).length
    const match: ShuffleMatch = {
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      resting: [players[4], players[5]],
    }
    applyMatchResult(match, null, state.splitRecord, state.cycleUsedSplits, total, state.playerWins, state.playerPlayed)
    expect(state.playerPlayed.get(players[0].id)).toBe(1)
    expect(state.playerPlayed.get(players[1].id)).toBe(1)
    expect(state.playerPlayed.get(players[4].id)).toBeUndefined()
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

  it('play counts are balanced within ±2 of the ideal with 6 players / 12 matches', () => {
    // 12 matches × 4 slots / 6 players = 8 expected plays each
    const players = makePlayers(6)
    const matches = generateMatchSchedule(players, 12)
    const playCount = new Map<string, number>()
    for (const m of matches) {
      for (const p of [...m.team1, ...m.team2]) {
        playCount.set(p.id, (playCount.get(p.id) ?? 0) + 1)
      }
    }
    for (const player of players) {
      const count = playCount.get(player.id) ?? 0
      expect(count).toBeGreaterThanOrEqual(6)
      expect(count).toBeLessThanOrEqual(10)
    }
  })

  it('play counts are balanced with 5 players / 12 matches', () => {
    // 12 × 4 / 5 = 9.6, so expect 8–12
    const players = makePlayers(5)
    const matches = generateMatchSchedule(players, 12)
    const playCount = new Map<string, number>()
    for (const m of matches) {
      for (const p of [...m.team1, ...m.team2]) {
        playCount.set(p.id, (playCount.get(p.id) ?? 0) + 1)
      }
    }
    for (const player of players) {
      const count = playCount.get(player.id) ?? 0
      expect(count).toBeGreaterThanOrEqual(7)
      expect(count).toBeLessThanOrEqual(12)
    }
  })

  it('no split repeats within the same cycle (4 players)', () => {
    const players = makePlayers(4)
    const matches = generateMatchSchedule(players, 3)
    const keys = matches.map(m => makeSplitKey([m.team1[0].id, m.team1[1].id], [m.team2[0].id, m.team2[1].id]))
    expect(new Set(keys).size).toBe(3)
  })

  it('partner repetition stays reasonable with 6 players / 12 matches', () => {
    const RUNS = 20
    let totalMax = 0
    const players = makePlayers(6)
    for (let r = 0; r < RUNS; r++) {
      const counts = new Map<string, number>()
      for (const m of generateMatchSchedule(players, 12)) {
        const k1 = makeSplitKey([m.team1[0].id, m.team1[1].id], [])
        const k2 = makeSplitKey([m.team2[0].id, m.team2[1].id], [])
        // use simple partner pair key
        const p1 = [m.team1[0].id, m.team1[1].id].sort().join('+')
        const p2 = [m.team2[0].id, m.team2[1].id].sort().join('+')
        counts.set(p1, (counts.get(p1) ?? 0) + 1)
        counts.set(p2, (counts.get(p2) ?? 0) + 1)
        void k1; void k2
      }
      totalMax += Math.max(...counts.values())
    }
    expect(totalMax / RUNS).toBeLessThan(5)
  })
})
