import { create } from 'zustand'
import type { MatchType, SetScore } from '../types/database'
import { getTeamSize } from '../lib/match-helpers'

interface NewMatchState {
  matchType: MatchType
  selectedIds: string[]
  teamAIds: string[]
  teamBIds: string[]
  scores: SetScore[]
  winner: 'TEAM_A' | 'TEAM_B' | null

  setMatchType: (type: MatchType) => void
  toggleSelected: (id: string, requiredCount: number) => void
  addSelected: (id: string, requiredCount: number) => void
  setScores: (scores: SetScore[]) => void
  setWinner: (winner: 'TEAM_A' | 'TEAM_B' | null) => void
  reset: () => void
}

const initialState = {
  matchType: 'MEN_DOUBLES' as MatchType,
  selectedIds: [],
  teamAIds: [],
  teamBIds: [],
  scores: [],
  winner: null,
}

// Split selected ids into team A / B based on team size for the match type.
function splitIntoTeams(ids: string[], teamSize: number): { a: string[]; b: string[] } {
  const a: string[] = []
  const b: string[] = []
  for (let i = 0; i < ids.length; i++) {
    if (i < teamSize) a.push(ids[i])
    else b.push(ids[i])
  }
  return { a, b }
}

export const useNewMatchStore = create<NewMatchState>((set, get) => ({
  ...initialState,

  setMatchType: (type) => {
    // Changing match type resets all flow state (selections invalid for new type).
    set({
      matchType: type,
      selectedIds: [],
      teamAIds: [],
      teamBIds: [],
      scores: [],
      winner: null,
    })
  },

  toggleSelected: (id, requiredCount) => {
    const { selectedIds, matchType } = get()
    const teamSize = getTeamSize(matchType)
    const currentlySelected = selectedIds.includes(id)
    let next: string[]

    if (currentlySelected) {
      next = selectedIds.filter((pid) => pid !== id)
    } else {
      if (selectedIds.length >= requiredCount) return
      next = [...selectedIds, id]
    }

    const { a, b } = splitIntoTeams(next, teamSize)
    set({ selectedIds: next, teamAIds: a, teamBIds: b })
  },

  addSelected: (id, requiredCount) => {
    const { selectedIds, matchType } = get()
    if (selectedIds.includes(id) || selectedIds.length >= requiredCount) return
    const teamSize = getTeamSize(matchType)
    const next = [...selectedIds, id]
    const { a, b } = splitIntoTeams(next, teamSize)
    set({ selectedIds: next, teamAIds: a, teamBIds: b })
  },

  setScores: (scores) => set({ scores }),
  setWinner: (winner) => set({ winner }),
  reset: () => set(initialState),
}))
