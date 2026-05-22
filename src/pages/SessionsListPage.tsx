import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { useMatches } from '../hooks/useMatches'
import { SessionCard } from '../../design-system/components'
import { Plus } from 'lucide-react'
import FloatingActionButton from '../components/FloatingActionButton'
import {
  formatSessionDuration,
  formatSessionDateTime,
  getSessionName,
  getSessionStatus,
} from '../lib/session-format'
import type { MatchWithDetails } from '../types/database'

interface SessionStat {
  matchCount: number
  topPlayer?: {
    name: string
    initials: string
    record: string
    winRate: number
  }
}

export default function SessionsListPage() {
  const navigate = useNavigate()
  const { data: sessions, isLoading: sessionsLoading } = useSessions()
  const { data: allMatches, isLoading: matchesLoading } = useMatches()

  const sessionStats = useMemo(() => {
    if (!allMatches) return new Map<string, SessionStat>()

    const stats = new Map<string, SessionStat>()
    const matchesBySession = new Map<string, MatchWithDetails[]>()

    for (const match of allMatches) {
      const list = matchesBySession.get(match.session_id) ?? []
      list.push(match)
      matchesBySession.set(match.session_id, list)
    }

    for (const [sessionId, matches] of matchesBySession) {
      const playerMap = new Map<string, { name: string; wins: number; played: number }>()

      for (const match of matches) {
        const winnerTeam = match.teams.find((t) => t.is_winner)
        if (!winnerTeam) continue

        for (const p of match.participants) {
          const team = match.teams.find((t) => t.id === p.team_id)
          if (!team) continue

          const existing = playerMap.get(p.player_id)
          if (existing) {
            existing.played++
            if (team.id === winnerTeam.id) existing.wins++
          } else {
            playerMap.set(p.player_id, {
              name: p.player.name,
              wins: team.id === winnerTeam.id ? 1 : 0,
              played: 1,
            })
          }
        }
      }

      let best: { name: string; wins: number; played: number } | null = null
      for (const [, p] of playerMap) {
        if (!best || p.wins > best.wins || (p.wins === best.wins && p.played < best.played)) {
          best = p
        }
      }

      const topPlayer =
        best && best.played > 0
          ? {
              name: best.name,
              initials: best.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2),
              record: `${best.wins}W – ${best.played - best.wins}L · played ${best.played}`,
              winRate: Math.round((best.wins / best.played) * 100),
            }
          : undefined

      stats.set(sessionId, { matchCount: matches.length, topPlayer })
    }

    return stats
  }, [allMatches])

  const isLoading = sessionsLoading || matchesLoading

  return (
    <div className="min-h-svh" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-5 space-y-4 pb-32">
        {isLoading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
            Loading sessions...
          </div>
        ) : sessions && sessions.length > 0 ? (
          sessions.map((session) => {
            const stat = sessionStats.get(session.id)
            return (
              <button
                key={session.id}
                onClick={() => navigate(`/sessions/${session.id}`, { state: { from: '/sessions' } })}
                className="w-full text-left active:scale-[0.98] transition-transform"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                <SessionCard
                  status={getSessionStatus(session)}
                  name={getSessionName(session)}
                  dateTime={formatSessionDateTime(session.started_at)}
                  duration={formatSessionDuration(session.started_at, session.ended_at)}
                  matchCount={stat?.matchCount ?? 0}
                  topPlayer={stat?.topPlayer}
                  compact
                />
              </button>
            )
          })
        ) : (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No sessions yet.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Tap + to start one.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <FloatingActionButton
        onClick={() => navigate('/sessions/new')}
        icon={<Plus className="w-6 h-6" />}
        ariaLabel="Create new session"
      />
    </div>
  )
}
