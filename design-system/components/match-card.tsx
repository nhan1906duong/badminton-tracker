interface MatchCardProps {
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED'
  teamAPlayers: string[]
  teamBPlayers: string[]
  matchLabel: string
  scoreA?: number
  scoreB?: number
  duration?: string
  type: string
  teamAWon?: boolean
}

function formatDuration(duration: string | undefined, status: 'SCHEDULED' | 'LIVE' | 'COMPLETED'): string {
  if (status === 'SCHEDULED') return 'Not started'
  return duration ?? '—'
}

export function MatchCard({
  status,
  teamAPlayers,
  teamBPlayers,
  matchLabel,
  scoreA,
  scoreB,
  duration,
  type,
  teamAWon,
}: MatchCardProps) {
  const isLive = status === 'LIVE'
  const isCompleted = status === 'COMPLETED'
  const teamBWon = isCompleted && teamAWon === false
  const hasScores = scoreA != null && scoreB != null

  return (
    <div
      className="bg-[var(--surface)] select-none"
      style={{
        border: isLive ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4) var(--space-5)',
      }}
    >
      {/* Meta bar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <span
          className="uppercase tracking-[0.06em]"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}
        >
          {matchLabel}
        </span>

        {isLive && (
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
        {status === 'SCHEDULED' && (
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
          {teamAPlayers.map((name) => (
            <div
              key={name}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-sm)',
                fontWeight: teamAWon ? 800 : teamBWon ? 500 : 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: teamBWon ? 'var(--muted)' : 'var(--fg)',
              }}
            >
              {name}
            </div>
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
              {hasScores ? scoreA : '—'}
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
              {hasScores ? scoreB : '—'}
            </span>
          </div>

          {isCompleted && (
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
          {teamBPlayers.map((name) => (
            <div
              key={name}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-sm)',
                fontWeight: teamBWon ? 800 : teamAWon ? 500 : 700,
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: teamAWon ? 'var(--muted)' : 'var(--fg)',
              }}
            >
              {name}
            </div>
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
          {formatDuration(duration, status)}
        </span>
        <span
          className="uppercase tracking-[0.06em]"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}
        >
          {type}
        </span>
      </div>
    </div>
  )
}
