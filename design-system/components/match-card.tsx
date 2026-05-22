import { Badge } from './badge'

interface MatchCardProps {
  status: 'live' | 'ended'
  outcome?: 'win' | 'loss'
  teamA: { name: string; players: string[] }
  teamB: { name: string; players: string[] }
  scoreA: number
  scoreB: number
  date: string
  duration?: string
  type: string
  compact?: boolean
}

export function MatchCard({
  status,
  outcome,
  teamA,
  teamB,
  scoreA,
  scoreB,
  date,
  duration,
  type,
  compact,
}: MatchCardProps) {
  const isLive = status === 'live'
  const isWin = outcome === 'win'
  const isLoss = outcome === 'loss'
  const winnerA = scoreA > scoreB

  return (
    <div
      className={`bg-[var(--surface)] p-4 ${compact ? 'p-3' : ''}`}
      style={{
        border: isLive ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Meta bar */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-mono uppercase tracking-[0.06em]"
          style={{ color: 'var(--muted)' }}
        >
          {date}
        </span>
        {isLive ? (
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--accent)' }}
            />
            <span
              className="text-[11px] font-bold font-mono uppercase tracking-[0.08em]"
              style={{ color: 'var(--accent)' }}
            >
              Live
            </span>
          </div>
        ) : isWin ? (
          <Badge variant="win">Win</Badge>
        ) : isLoss ? (
          <Badge variant="loss">Loss</Badge>
        ) : null}
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-3">
        {/* Team A */}
        <div className="flex-1 min-w-0 text-left">
          <div
            className={`font-semibold leading-[1.2] tracking-[-0.01em] ${compact ? 'text-[15px]' : 'text-[18px]'}`}
            style={{
              fontFamily: 'var(--font-display)',
              color: winnerA ? 'var(--fg)' : 'var(--muted)',
              fontWeight: winnerA ? 800 : 500,
            }}
          >
            {teamA.name}
          </div>
          <div
            className={`mt-0.5 ${compact ? 'text-[11px]' : 'text-[13px]'}`}
            style={{ color: winnerA ? 'var(--fg)' : 'var(--muted)' }}
          >
            {teamA.players.join(', ')}
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center justify-center shrink-0 min-w-[80px]">
          <div className="flex items-center gap-2">
            <span
              className={`font-extrabold leading-none tracking-[-0.03em] ${compact ? 'text-[24px]' : 'text-[32px]'}`}
              style={{
                fontFamily: 'var(--font-display)',
                color: winnerA ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {scoreA}
            </span>
            <span
              className="text-[24px] font-normal"
              style={{ color: 'var(--border)' }}
            >
              :
            </span>
            <span
              className={`font-extrabold leading-none tracking-[-0.03em] ${compact ? 'text-[24px]' : 'text-[32px]'}`}
              style={{
                fontFamily: 'var(--font-display)',
                color: !winnerA ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {scoreB}
            </span>
          </div>
          {!isLive && !compact && (
            <span
              className="text-[11px] font-bold font-mono uppercase tracking-[0.08em] mt-2"
              style={{ color: isWin ? 'var(--accent)' : 'var(--muted)' }}
            >
              {isWin ? 'W' : isLoss ? 'L' : ''}
            </span>
          )}
        </div>

        {/* Team B */}
        <div className="flex-1 min-w-0 text-right">
          <div
            className={`font-semibold leading-[1.2] tracking-[-0.01em] ${compact ? 'text-[15px]' : 'text-[18px]'}`}
            style={{
              fontFamily: 'var(--font-display)',
              color: !winnerA ? 'var(--fg)' : 'var(--muted)',
              fontWeight: !winnerA ? 800 : 500,
            }}
          >
            {teamB.name}
          </div>
          <div
            className={`mt-0.5 ${compact ? 'text-[11px]' : 'text-[13px]'}`}
            style={{ color: !winnerA ? 'var(--fg)' : 'var(--muted)' }}
          >
            {teamB.players.join(', ')}
          </div>
        </div>
      </div>

      {/* Footer */}
      {(duration || type) && !compact && (
        <div
          className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {duration && (
            <span
              className="text-[11px] font-mono"
              style={{ color: 'var(--muted)' }}
            >
              {duration}
            </span>
          )}
          {type && (
            <span
              className="text-[11px] font-mono uppercase tracking-[0.06em]"
              style={{ color: 'var(--muted)' }}
            >
              {type}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
