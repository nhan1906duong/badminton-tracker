import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { useOpenSession } from '../hooks/useSessions'
import { usePlayers } from '../hooks/usePlayers'
import { useMatches } from '../hooks/useMatches'
import { TrendingUp } from 'lucide-react'
import { SessionCard } from '../../design-system/components'
import DonorListItem from '../components/DonorListItem'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
import {
  formatSessionDuration,
  formatSessionDateTime,
  getSessionName,
  getSessionStatus,
} from '../lib/session-format'
import type { MatchWithDetails } from '../types/database'

export default function HomePage() {
  const navigate = useNavigate()
  const { stats, totalLost, isLoading } = usePlayerStats()
  const { data: activeSession } = useOpenSession()
  const { data: players } = usePlayers()
  const { data: sessionMatches } = useMatches(activeSession?.id ?? '')

  const totalPenalty = totalLost * LOSS_PENALTY_VND

  const avatarMap = useMemo(() => {
    const map = new Map<string, string | null>()
    players?.forEach((p) => map.set(p.id, p.avatar_url ?? null))
    return map
  }, [players])

  const donors = useMemo(
    () =>
      stats
        .filter((s) => s.losses > 0)
        .sort((a, b) => b.losses - a.losses)
        .map((s) => ({
          ...s,
          avatarUrl: avatarMap.get(s.playerId) ?? null,
        })),
    [stats, avatarMap],
  )

  const topPlayer = useMemo(() => {
    if (!sessionMatches || sessionMatches.length === 0) return undefined

    const playerMap = new Map<
      string,
      { name: string; wins: number; played: number }
    >()

    for (const match of sessionMatches as MatchWithDetails[]) {
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

    if (!best || best.played === 0) return undefined

    const winRate = Math.round((best.wins / best.played) * 100)
    const initials = best.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

    return {
      name: best.name,
      initials,
      record: `${best.wins}W – ${best.played - best.wins}L · played ${best.played}`,
      winRate,
    }
  }, [sessionMatches])

  return (
    <div className="min-h-svh" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-5 space-y-5 pb-32">
        {/* Active Session */}
        {activeSession ? (
          <button
            onClick={() => navigate(`/sessions/${activeSession.id}`, { state: { from: '/' } })}
            className="w-full text-left active:scale-[0.98] transition-transform"
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <SessionCard
              status={getSessionStatus(activeSession)}
              name={getSessionName(activeSession)}
              dateTime={formatSessionDateTime(activeSession.started_at)}
              duration={formatSessionDuration(activeSession.started_at, activeSession.ended_at)}
              matchCount={sessionMatches?.length ?? 0}
              topPlayer={topPlayer}
              compact
            />
          </button>
        ) : (
          <button
            onClick={() => navigate('/sessions/new')}
            className="w-full text-left active:scale-[0.98] transition-transform"
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 flex items-center justify-center"
                  style={{
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span
                    className="text-[13px] font-extrabold"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}
                  >
                    +
                  </span>
                </div>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: 'var(--fg)' }}>
                    No Active Session
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
                    Tap to start one
                  </p>
                </div>
              </div>
              <span style={{ color: 'var(--muted)' }}>&rsaquo;</span>
            </div>
          </button>
        )}

        {/* Total Lost Card */}
        <section
          className="p-4 space-y-1"
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--muted)' }}>
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Total Lost</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>
            {formatCurrency(totalPenalty)}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {totalLost} losses &times; {formatCurrency(LOSS_PENALTY_VND)}
          </p>
        </section>

        {/* Donors list */}
        <section className="space-y-3">
          <span className="text-sm font-bold px-1" style={{ color: 'var(--fg)' }}>Donated Players</span>

          {isLoading ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>
              Loading stats...
            </div>
          ) : donors.length === 0 ? (
            <div
              className="text-center py-8"
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No donations yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {donors.map((d) => (
                <DonorListItem
                  key={d.playerId}
                  playerId={d.playerId}
                  name={d.name}
                  avatarUrl={d.avatarUrl}
                  losses={d.losses}
                  matchesPlayed={d.matchesPlayed}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
