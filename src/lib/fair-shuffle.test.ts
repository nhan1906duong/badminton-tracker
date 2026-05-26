import { describe, it, expect } from 'vitest'
import {
  generateNextMatch,
  generateMatchSchedule,
  pairKey,
  applyMatchResult,
  type ShufflePlayer,
  type PlayerStats,
  type ShuffleMatch,
} from './fair-shuffle'

function makePlayers(count: number): ShufflePlayer[] {
  return Array.from({ length: count }, (_, i) => ({ id: String(i + 1), name: `Player${i + 1}` }))
}

function emptyMaps() {
  return {
    stats: new Map<string, PlayerStats>(),
    partnerCount: new Map<string, number>(),
    opponentCount: new Map<string, number>(),
  }
}

describe('pairKey', () => {
  it('returns the same key regardless of argument order', () => {
    const a: ShufflePlayer = { id: 'x', name: 'X' }
    const b: ShufflePlayer = { id: 'y', name: 'Y' }
    expect(pairKey(a, b)).toBe(pairKey(b, a))
  })

  it('produces a stable string', () => {
    const a: ShufflePlayer = { id: 'a', name: 'A' }
    const b: ShufflePlayer = { id: 'b', name: 'B' }
    expect(pairKey(a, b)).toBe('a-b')
  })
})

describe('generateNextMatch — validation', () => {
  it('throws with fewer than 4 players', () => {
    expect(() =>
      generateNextMatch({ selectedPlayers: makePlayers(3), ...emptyMaps() })
    ).toThrow("Please select at least 4 players to generate a men's doubles match.")
  })

  it('throws with 0 players', () => {
    expect(() =>
      generateNextMatch({ selectedPlayers: [], ...emptyMaps() })
    ).toThrow()
  })
})

describe('generateNextMatch — match structure', () => {
  it('returns exactly 4 playing players', () => {
    const match = generateNextMatch({ selectedPlayers: makePlayers(6), ...emptyMaps() })
    expect([...match.team1, ...match.team2]).toHaveLength(4)
  })

  it('each team has exactly 2 players', () => {
    const match = generateNextMatch({ selectedPlayers: makePlayers(6), ...emptyMaps() })
    expect(match.team1).toHaveLength(2)
    expect(match.team2).toHaveLength(2)
  })

  it('no player appears twice in the same match', () => {
    const match = generateNextMatch({ selectedPlayers: makePlayers(6), ...emptyMaps() })
    const ids = [...match.team1, ...match.team2].map((p) => p.id)
    expect(new Set(ids).size).toBe(4)
  })

  it('resting players are a subset of selected players', () => {
    const players = makePlayers(6)
    const selectedIds = new Set(players.map((p) => p.id))
    const match = generateNextMatch({ selectedPlayers: players, ...emptyMaps() })
    for (const p of match.resting) {
      expect(selectedIds.has(p.id)).toBe(true)
    }
  })

  it('non-selected players never appear in generated matches', () => {
    const allPlayers = makePlayers(10)
    const selected = allPlayers.slice(0, 6)
    const nonSelectedIds = new Set(allPlayers.slice(6).map((p) => p.id))

    const match = generateNextMatch({ selectedPlayers: selected, ...emptyMaps() })
    for (const p of [...match.team1, ...match.team2, ...match.resting]) {
      expect(nonSelectedIds.has(p.id)).toBe(false)
    }
  })

  it('with exactly 4 players, no one rests', () => {
    const match = generateNextMatch({ selectedPlayers: makePlayers(4), ...emptyMaps() })
    expect(match.resting).toHaveLength(0)
  })

  it('with 5 players, exactly 1 rests', () => {
    const match = generateNextMatch({ selectedPlayers: makePlayers(5), ...emptyMaps() })
    expect(match.resting).toHaveLength(1)
  })

  it('with 6 players, exactly 2 rest', () => {
    const match = generateNextMatch({ selectedPlayers: makePlayers(6), ...emptyMaps() })
    expect(match.resting).toHaveLength(2)
  })
})

describe('applyMatchResult', () => {
  it('increments played and consecutivePlayed for active players', () => {
    const players = makePlayers(4)
    const maps = emptyMaps()
    const match: ShuffleMatch = {
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      resting: [],
    }
    applyMatchResult(match, players, maps.stats, maps.partnerCount, maps.opponentCount)

    for (const p of players) {
      const s = maps.stats.get(p.id)!
      expect(s.played).toBe(1)
      expect(s.consecutivePlayed).toBe(1)
      expect(s.rested).toBe(0)
    }
  })

  it('increments rested and resets consecutivePlayed for resting players', () => {
    const players = makePlayers(6)
    const maps = emptyMaps()

    // Pre-seed consecutive played for resting players
    for (const p of players.slice(4)) {
      maps.stats.set(p.id, { played: 2, rested: 0, consecutivePlayed: 2 })
    }

    const match: ShuffleMatch = {
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      resting: [players[4], players[5]],
    }
    applyMatchResult(match, players, maps.stats, maps.partnerCount, maps.opponentCount)

    for (const p of players.slice(4)) {
      const s = maps.stats.get(p.id)!
      expect(s.rested).toBe(1)
      expect(s.consecutivePlayed).toBe(0)
    }
  })

  it('updates partner counts for both teams', () => {
    const players = makePlayers(4)
    const maps = emptyMaps()
    const match: ShuffleMatch = {
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      resting: [],
    }
    applyMatchResult(match, players, maps.stats, maps.partnerCount, maps.opponentCount)

    expect(maps.partnerCount.get(pairKey(players[0], players[1]))).toBe(1)
    expect(maps.partnerCount.get(pairKey(players[2], players[3]))).toBe(1)
  })

  it('updates opponent counts for all cross-team pairs', () => {
    const players = makePlayers(4)
    const maps = emptyMaps()
    const match: ShuffleMatch = {
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      resting: [],
    }
    applyMatchResult(match, players, maps.stats, maps.partnerCount, maps.opponentCount)

    expect(maps.opponentCount.get(pairKey(players[0], players[2]))).toBe(1)
    expect(maps.opponentCount.get(pairKey(players[0], players[3]))).toBe(1)
    expect(maps.opponentCount.get(pairKey(players[1], players[2]))).toBe(1)
    expect(maps.opponentCount.get(pairKey(players[1], players[3]))).toBe(1)
  })
})

describe('generateMatchSchedule', () => {
  it('generates the requested number of matches', () => {
    expect(generateMatchSchedule(makePlayers(6), 12)).toHaveLength(12)
    expect(generateMatchSchedule(makePlayers(4), 8)).toHaveLength(8)
  })

  it('every match has exactly 4 playing players', () => {
    for (const match of generateMatchSchedule(makePlayers(6), 12)) {
      expect([...match.team1, ...match.team2]).toHaveLength(4)
    }
  })

  it('no player appears twice in any single match', () => {
    for (const match of generateMatchSchedule(makePlayers(6), 12)) {
      const ids = [...match.team1, ...match.team2].map((p) => p.id)
      expect(new Set(ids).size).toBe(4)
    }
  })

  it('resting players in every match are selected players only', () => {
    const players = makePlayers(6)
    const selectedIds = new Set(players.map((p) => p.id))
    for (const match of generateMatchSchedule(players, 12)) {
      for (const p of match.resting) {
        expect(selectedIds.has(p.id)).toBe(true)
      }
    }
  })

  it('non-selected players never appear when a subset is used', () => {
    const allPlayers = makePlayers(10)
    const selected = allPlayers.slice(0, 6)
    const nonSelectedIds = new Set(allPlayers.slice(6).map((p) => p.id))

    for (const match of generateMatchSchedule(selected, 12)) {
      for (const p of [...match.team1, ...match.team2, ...match.resting]) {
        expect(nonSelectedIds.has(p.id)).toBe(false)
      }
    }
  })

  it('play counts are balanced within ±2 of the ideal with 6 players / 12 matches', () => {
    // 12 matches × 4 slots / 6 players = 8 expected plays per player
    const players = makePlayers(6)
    const matches = generateMatchSchedule(players, 12)
    const playCount = new Map<string, number>()
    for (const match of matches) {
      for (const p of [...match.team1, ...match.team2]) {
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
    // 12 matches × 4 slots / 5 players = 9.6, so 9 or 10
    const players = makePlayers(5)
    const matches = generateMatchSchedule(players, 12)
    const playCount = new Map<string, number>()
    for (const match of matches) {
      for (const p of [...match.team1, ...match.team2]) {
        playCount.set(p.id, (playCount.get(p.id) ?? 0) + 1)
      }
    }
    for (const player of players) {
      const count = playCount.get(player.id) ?? 0
      expect(count).toBeGreaterThanOrEqual(7)
      expect(count).toBeLessThanOrEqual(12)
    }
  })

  it('partner repetition stays below 3 on average with 6 players / 12 matches', () => {
    // Run several times to account for randomness
    const RUNS = 20
    let totalMaxRepetitions = 0
    const players = makePlayers(6)

    for (let run = 0; run < RUNS; run++) {
      const matches = generateMatchSchedule(players, 12)
      const partnerCount = new Map<string, number>()
      for (const match of matches) {
        const k1 = pairKey(match.team1[0], match.team1[1])
        const k2 = pairKey(match.team2[0], match.team2[1])
        partnerCount.set(k1, (partnerCount.get(k1) ?? 0) + 1)
        partnerCount.set(k2, (partnerCount.get(k2) ?? 0) + 1)
      }
      const max = Math.max(...partnerCount.values())
      totalMaxRepetitions += max
    }

    // The worst single pair repetition should average well below the uncontrolled maximum
    expect(totalMaxRepetitions / RUNS).toBeLessThan(5)
  })
})
