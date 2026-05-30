import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LeagueTeamWithPlayers, MatchWithDetails } from '../types/database'
import { generateRoundRobin } from '../lib/round-robin'
import { useI18n } from '../i18n'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'

interface LeagueScheduleGridProps {
  teams: LeagueTeamWithPlayers[]
  totalRounds: number
  matches: MatchWithDetails[] | undefined
  sessionId: string
}

export default function LeagueScheduleGrid({ teams, totalRounds, matches, sessionId }: LeagueScheduleGridProps) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1]))

  const fixtures = useMemo(() => {
    return generateRoundRobin(teams.length, totalRounds)
  }, [teams.length, totalRounds])

  // Group fixtures by round
  const rounds = useMemo(() => {
    const map = new Map<number, typeof fixtures>()
    for (const f of fixtures) {
      const list = map.get(f.round) ?? []
      list.push(f)
      map.set(f.round, list)
    }
    return map
  }, [fixtures])

  // Map fixtures to their pre-created scheduled/live/completed matches.
  const fixtureToMatch = useMemo(() => {
    const map = new Map<string, MatchWithDetails | null>()
    const sessionMatches = matches ?? []

    const fixtureMatchesTeam = (m: MatchWithDetails, teamAPlayerIds: Set<string>, teamBPlayerIds: Set<string>) => {
      const teamAMatch = m.teams.find((t) => t.team_label === 'TEAM_A')
      const teamBMatch = m.teams.find((t) => t.team_label === 'TEAM_B')
      if (!teamAMatch || !teamBMatch) return false

      const aPlayers = m.participants
        .filter((p) => p.team_id === teamAMatch.id)
        .map((p) => p.player_id)
      const bPlayers = m.participants
        .filter((p) => p.team_id === teamBMatch.id)
        .map((p) => p.player_id)

      const aIsTeamA = aPlayers.every((id) => teamAPlayerIds.has(id)) && aPlayers.length === teamAPlayerIds.size
      const aIsTeamB = aPlayers.every((id) => teamBPlayerIds.has(id)) && aPlayers.length === teamBPlayerIds.size
      const bIsTeamA = bPlayers.every((id) => teamAPlayerIds.has(id)) && bPlayers.length === teamAPlayerIds.size
      const bIsTeamB = bPlayers.every((id) => teamBPlayerIds.has(id)) && bPlayers.length === teamBPlayerIds.size

      return (aIsTeamA && bIsTeamB) || (aIsTeamB && bIsTeamA)
    }

    for (const f of fixtures) {
      const teamA = teams[f.teamAIndex]
      const teamB = teams[f.teamBIndex]
      if (!teamA || !teamB) continue

      const teamAPlayerIds = new Set(teamA.players.map((p) => p.id))
      const teamBPlayerIds = new Set(teamB.players.map((p) => p.id))

      const match = sessionMatches.find((m) =>
        m.league_round === f.round && fixtureMatchesTeam(m, teamAPlayerIds, teamBPlayerIds)
      ) ?? sessionMatches.find((m) =>
        m.league_round == null && m.status === 'COMPLETED' && fixtureMatchesTeam(m, teamAPlayerIds, teamBPlayerIds)
      )

      const key = `${f.round}-${f.teamAIndex}-${f.teamBIndex}`
      map.set(key, match ?? null)
    }

    return map
  }, [fixtures, teams, matches])

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(round)) next.delete(round)
      else next.add(round)
      return next
    })
  }

  const handlePlay = (teamAIndex: number, teamBIndex: number) => {
    const teamA = teams[teamAIndex]
    const teamB = teams[teamBIndex]
    if (!teamA || !teamB) return
    navigate(`/sessions/${sessionId}/matches/new?teamA=${teamA.id}&teamB=${teamB.id}`)
  }

  const handleViewMatch = (match: MatchWithDetails) => {
    navigate(`/sessions/${sessionId}/matches/${match.id}`)
  }

  if (teams.length < 2) return null

  return (
    <div className="flex flex-col gap-2">
      {Array.from(rounds.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, roundFixtures]) => {
          const isExpanded = expandedRounds.has(round)
          return (
            <div
              key={round}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden"
            >
              {/* Round header */}
              <button
                type="button"
                onClick={() => toggleRound(round)}
                className="flex items-center justify-between w-full px-4 py-3 text-left active:bg-[var(--bg)] transition-colors"
              >
                <span
                  className="font-[family:var(--font-display)] font-bold text-[var(--fg)]"
                  style={{ fontSize: 15 }}
                >
                  {t('sessionDetail.round', { round })}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
                )}
              </button>

              {/* Fixtures */}
              {isExpanded && (
                <div className="border-t border-[var(--border)]">
                  {roundFixtures.map((f) => {
                    const teamA = teams[f.teamAIndex]
                    const teamB = teams[f.teamBIndex]
                    if (!teamA || !teamB) return null

                    const key = `${f.round}-${f.teamAIndex}-${f.teamBIndex}`
                    const match = fixtureToMatch.get(key)
                    const isCompleted = match?.status === 'COMPLETED'
                    const isScheduled = match?.status === 'SCHEDULED'
                    const isLive = match?.status === 'LIVE'
                    const winner = match?.teams.find((t) => t.is_winner)
                    const winnerIsTeamA = winner
                      ? match?.participants.some((p) => p.team_id === winner.id && teamA.players.some((tp) => tp.id === p.player_id))
                      : false
                    const winnerIsTeamB = winner
                      ? match?.participants.some((p) => p.team_id === winner.id && teamB.players.some((tp) => tp.id === p.player_id))
                      : false

                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-[family:var(--font-display)] font-bold truncate ${
                                isCompleted && winnerIsTeamA ? 'text-[var(--accent)]' : 'text-[var(--fg)]'
                              }`}
                              style={{ fontSize: 14 }}
                            >
                              {teamA.name}
                            </span>
                            <span className="font-[family:var(--font-mono)] text-[var(--muted)]" style={{ fontSize: 11 }}>
                              {t('sessionDetail.vs')}
                            </span>
                            <span
                              className={`font-[family:var(--font-display)] font-bold truncate ${
                                isCompleted && winnerIsTeamB ? 'text-[var(--accent)]' : 'text-[var(--fg)]'
                              }`}
                              style={{ fontSize: 14 }}
                            >
                              {teamB.name}
                            </span>
                          </div>
                        </div>

                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => match && handleViewMatch(match)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-[family:var(--font-mono)] font-bold"
                            style={{ fontSize: 11 }}
                          >
                            <Check className="w-3 h-3" />
                            {t('sessionDetail.completedShort')}
                          </button>
                        ) : match ? (
                          <button
                            type="button"
                            onClick={() => handleViewMatch(match)}
                            className={`px-3 py-1.5 rounded-[var(--radius-sm)] font-[family:var(--font-body)] font-bold active:opacity-80 transition-opacity ${
                              isLive
                                ? 'bg-[var(--accent)] text-[var(--surface)]'
                                : 'bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)]'
                            }`}
                            style={{ fontSize: 12 }}
                          >
                            {isScheduled ? t('common.scheduled') : t('sessionDetail.playMatch')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePlay(f.teamAIndex, f.teamBIndex)}
                            className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--surface)] font-[family:var(--font-body)] font-bold active:opacity-80 transition-opacity"
                            style={{ fontSize: 12 }}
                          >
                            {t('sessionDetail.playMatch')}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}
