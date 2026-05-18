import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SessionStore {
  activePlayers: Record<string, string[]>
  togglePlayer: (sessionId: string, playerId: string) => void
  setPlayers: (sessionId: string, playerIds: string[]) => void
  clearSession: (sessionId: string) => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      activePlayers: {},

      togglePlayer: (sessionId, playerId) => {
        set((state) => {
          const current = state.activePlayers[sessionId] || []
          const next = current.includes(playerId)
            ? current.filter((id) => id !== playerId)
            : [...current, playerId]
          return {
            activePlayers: { ...state.activePlayers, [sessionId]: next },
          }
        })
      },

      setPlayers: (sessionId, playerIds) => {
        set((state) => ({
          activePlayers: { ...state.activePlayers, [sessionId]: playerIds },
        }))
      },

      clearSession: (sessionId) => {
        set((state) => {
          const next = { ...state.activePlayers }
          delete next[sessionId]
          return { activePlayers: next }
        })
      },
    }),
    {
      name: 'badminton-session-store',
    }
  )
)
