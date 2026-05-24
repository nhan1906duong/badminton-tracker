import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Activity, ChevronLeft, Medal } from 'lucide-react'
import { AppBar, Avatar, EmptyState, LoadingState, StatRow } from '../../design-system/components'
import { useMatches } from '../hooks/useMatches'
import { useSession } from '../hooks/useSessions'
import { useSessionWeeklyRankings, type SessionWeeklyStats } from '../hooks/useRankings'
import { formatShortPlayerName } from '../lib/player-name'

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

function SessionRank({ rank }: { rank: number }) {
  const color =
    rank === 1 ? 'var(--accent)'
    : rank === 2 ? 'color-mix(in oklch, var(--accent) 70%, var(--muted))'
    : rank === 3 ? 'color-mix(in oklch, var(--accent) 45%, var(--muted))'
    : 'var(--muted)'

  return (
    <div
      aria-label={`Rank ${rank}`}
      style={{
        width: 36,
        flexShrink: 0,
        textAlign: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 900,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color,
      }}
    >
      {rank}
    </div>
  )
}

interface PlayerStatsRowProps {
  stat: SessionWeeklyStats
  rank: number
  isLast: boolean
  onClick: () => void
}

function PlayerStatsRow({ stat, rank, isLast, onClick }: PlayerStatsRowProps) {
  const winRate = stat.matchesPlayed > 0 ? Math.round((stat.wins / stat.matchesPlayed) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="active:opacity-60"
      style={{
        width: '100%',
        minHeight: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <SessionRank rank={rank} />
      <Avatar src={stat.avatarUrl} name={stat.name} size={36} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: 0,
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatShortPlayerName(stat.name)}
        </div>
        <div
          style={{
            marginTop: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--muted)',
          }}
        >
          <span><strong style={{ color: 'var(--fg)', fontWeight: 700 }}>{stat.matchesPlayed}</strong> matches</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span><strong style={{ color: 'var(--fg)', fontWeight: 700 }}>{stat.wins}</strong>W</span>
          <span><strong style={{ color: 'var(--fg)', fontWeight: 700 }}>{stat.losses}</strong>L</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span><strong style={{ color: 'var(--fg)', fontWeight: 700 }}>{winRate}%</strong></span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>{formatSigned(stat.pointDifference)} diff</span>
        </div>
      </div>

      <div
        style={{
          minWidth: 64,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0,
          }}
        >
          {stat.weeklyPoints}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
          }}
        >
          points
        </span>
      </div>
    </button>
  )
}

export default function SessionStatsPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: session } = useSession(sessionId)
  const { data: matches, isLoading: matchesLoading } = useMatches(sessionId)
  const { data: rankings = [], isLoading: rankingsLoading } = useSessionWeeklyRankings(sessionId)

  const completedMatches = useMemo(
    () => matches?.filter((m) => m.status === 'COMPLETED') ?? [],
    [matches]
  )
  const totalPoints = rankings.reduce((sum, s) => sum + s.weeklyPoints, 0)
  const averagePoints = rankings.length > 0 ? Math.round(totalPoints / rankings.length) : 0
  const isLoading = matchesLoading || rankingsLoading

  if (!sessionId) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] px-[var(--space-5)] py-[var(--space-5)]">
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>Session not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft className="w-5 h-5 -ml-1" />,
          onClick: () => navigate(`/sessions/${sessionId}`),
        }}
      />

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))' }}
      >
        <header style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)' }}>
          <div
            className="inline-flex items-center gap-[var(--space-2)]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
              marginBottom: 'var(--space-3)',
            }}
          >
            <Activity size={14} aria-hidden="true" />
            Session ranking
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: 0,
              color: 'var(--fg)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Player stats
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--muted)',
            }}
          >
            {session?.label ?? 'Session'} · {completedMatches.length} completed match{completedMatches.length === 1 ? '' : 'es'}
          </p>
        </header>

        <main className="px-[var(--space-5)]">
          {isLoading ? (
            <LoadingState message="Loading player stats..." />
          ) : rankings.length === 0 ? (
            <EmptyState
              icon={<Medal className="w-10 h-10 mx-auto" />}
              title="No player stats yet"
              description="Complete a match to populate this session ranking."
            />
          ) : (
            <>
              <section
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0 var(--space-4)',
                  marginBottom: 'var(--space-6)',
                }}
              >
                <StatRow label="Completed matches" value={completedMatches.length} />
                <StatRow label="Ranked players" value={rankings.length} />
                <StatRow label="Average points" value={averagePoints} />
              </section>

              <section>
                <div className="flex items-baseline justify-between gap-[var(--space-3)] mb-[var(--space-3)]">
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 900,
                      lineHeight: 1.1,
                      letterSpacing: 0,
                      color: 'var(--fg)',
                    }}
                  >
                    Ranking
                  </h2>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--muted)',
                    }}
                  >
                    Weekly points
                  </span>
                </div>

                <div>
                  {rankings.map((stat, index) => (
                    <PlayerStatsRow
                      key={stat.playerId}
                      stat={stat}
                      rank={index + 1}
                      isLast={index === rankings.length - 1}
                      onClick={() => navigate(`/players/${stat.playerId}`)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
