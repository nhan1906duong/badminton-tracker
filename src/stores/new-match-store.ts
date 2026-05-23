import { create } from 'zustand'
import type { MatchType } from '../types/database'
import { getTeamSize } from '../lib/match-helpers'

export type CreateMatchMode = 'now' | 'schedule' | 'queue'

interface NewMatchState {
  matchType: MatchType
  teamA: (string | null)[]
  teamB: (string | null)[]
  mode: CreateMatchMode
  scheduledAt: Date | null

  setMatchType: (type: MatchType) => void
  setSlot: (team: 'A' | 'B', index: number, playerId: string | null) => void
  setMode: (mode: CreateMatchMode) => void
  setScheduledAt: (date: Date | null) => void
  reset: () => void
}

function emptyTeam(matchType: MatchType): (string | null)[] {
  return Array(getTeamSize(matchType)).fill(null)
}

const initialState = {
  matchType: 'MEN_DOUBLES' as MatchType,
  teamA: [null, null] as (string | null)[],
  teamB: [null, null] as (string | null)[],
  mode: 'now' as CreateMatchMode,
  scheduledAt: null,
}

export const useNewMatchStore = create<NewMatchState>((set, get) => ({
  ...initialState,

  setMatchType: (type) => {
    set({
      matchType: type,
      teamA: emptyTeam(type),
      teamB: emptyTeam(type),
    })
  },

  setSlot: (team, index, playerId) => {
    const state = get()
    if (team === 'A') {
      const next = [...state.teamA]
      next[index] = playerId
      set({ teamA: next })
    } else {
      const next = [...state.teamB]
      next[index] = playerId
      set({ teamB: next })
    }
  },

  setMode: (mode) => set({ mode }),
  setScheduledAt: (date) => set({ scheduledAt: date }),

  reset: () => set(initialState),
}))
