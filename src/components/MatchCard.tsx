import { useNavigate } from 'react-router-dom'
import type { MatchWithDetails } from '../types/database'
import { MATCH_TYPE_LABEL } from '../lib/match-helpers'
import { formatShortPlayerName } from '../lib/player-name'

function formatDuration(playedAt: string, endedAt: string | null | undefined, isEnded: boolean): string {
  const start = new Date(playedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : isEnded ? start : Date.now()
  const totalMin = Math.floor((end - start) / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h === 0 ? `${m} min` : `${h}h ${m}m`
}

function formatStartTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

interface MatchCardProps {
  match: MatchWithDetails
  matchNumber: number
  dateLabel?: string
  readonly?: boolean
}

export default function MatchCard({ match, matchNumber, dateLabel, readonly }: MatchCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (readonly) return
    navigate(`/sessions/${match.session_id}/matches/${match.id}`)
  }

  const teamA = match.participants.filter(
    (p) => match.teams.find((t) => t.id === p.team_id)?.team_label === 'TEAM_A'
  )
  const teamB = match.participants.filter(
    (p) => match.teams.find((t) => t.id === p.team_id)?.team_label === 'TEAM_B'
  )
  const winnerTeam = match.teams.find((t) => t.is_winner)
  const winnerLabel = winnerTeam?.team_label
  const teamAWon = winnerLabel === 'TEAM_A'
  const teamBWon = winnerLabel === 'TEAM_B'
  const isEnded = !!winnerLabel
  const hasScores = match.scores.length > 0

  return (
    <div
      className={`relative transition-colors select-none ${!readonly ? 'cursor-pointer active:opacity-80' : ''}`}
      style={{
        background: 'var(--surface)',
        border: match.status === 'LIVE' ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4) var(--space-5)',
      }}
      onClick={handleClick}
    >
      {/* Meta bar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <span
          className="uppercase tracking-[0.06em]"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}
        >
          {dateLabel ?? `M${matchNumber} · ${formatStartTime(match.played_at)}`}
        </span>

        {match.status === 'LIVE' && (
          <div
            className="inline-flex items-center uppercase tracking-[0.08em]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--accent)',
              gap: 'var(--space-2)',
            }}
          >
            <span
              className="rounded-full animate-pulse"
              style={{ width: 8, height: 8, background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }}
            />
            Live
          </div>
        )}
        {match.status === 'SCHEDULED' && (
          <span
            className="inline-flex items-center uppercase tracking-[0.06em]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              padding: 'var(--space-1) var(--space-2)',
              background: 'var(--bg)',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              lineHeight: 1,
            }}
          >
            Scheduled
          </span>
        )}
      </div>

      {/* Teams + Score */}
      <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
        {/* Team A — left */}
        <div className="flex-1 min-w-0 text-left flex flex-col" style={{ gap: 2 }}>
          {teamA.map((p) => (
            <button
              key={p.player.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/players/${p.player.id}`) }}
              className="active:opacity-60"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: teamAWon ? 800 : teamBWon ? 500 : 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: teamBWon ? 'var(--muted)' : 'var(--fg)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {formatShortPlayerName(p.player.name)}
            </button>
          ))}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--muted)',
              marginTop: 2,
            }}
          >
            Team A
          </div>
        </div>

        {/* Score center */}
        <div className="flex flex-col items-center justify-center shrink-0" style={{ minWidth: 80 }}>
          <div className="flex items-center leading-none" style={{ gap: 'var(--space-2)' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: teamAWon ? 'var(--accent)' : teamBWon ? 'var(--muted)' : 'var(--fg)',
              }}
            >
              {hasScores ? match.scores[0].team_a_score : '—'}
            </span>
            <span style={{ color: 'var(--border)', fontWeight: 400, fontSize: 'var(--text-xl)' }}>
              :
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: teamBWon ? 'var(--accent)' : teamAWon ? 'var(--muted)' : 'var(--fg)',
              }}
            >
              {hasScores ? match.scores[0].team_b_score : '—'}
            </span>
          </div>

          {isEnded && (
            <div
              className="uppercase tracking-[0.08em]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                marginTop: 'var(--space-2)',
                lineHeight: 1,
                color: teamAWon ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {teamAWon ? 'W' : 'L'}
            </div>
          )}
        </div>

        {/* Team B — right */}
        <div className="flex-1 min-w-0 text-right flex flex-col" style={{ gap: 2 }}>
          {teamB.map((p) => (
            <button
              key={p.player.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/players/${p.player.id}`) }}
              className="active:opacity-60"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: teamBWon ? 800 : teamAWon ? 500 : 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: teamAWon ? 'var(--muted)' : 'var(--fg)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'right',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {formatShortPlayerName(p.player.name)}
            </button>
          ))}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--muted)',
              marginTop: 2,
            }}
          >
            Team B
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
          {match.scores.length > 1
            ? match.scores.map((s) => `${s.team_a_score}–${s.team_b_score}`).join(' · ')
            : match.status === 'SCHEDULED'
            ? 'Not started'
            : formatDuration(match.played_at, match.ended_at, isEnded)}
        </span>
        <span
          className="uppercase tracking-[0.06em]"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}
        >
          {MATCH_TYPE_LABEL[match.match_type]}
        </span>
      </div>
    </div>
  )
}
