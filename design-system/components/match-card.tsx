const SHUTTLE_SVG_PATHS = (
  <>
    <path fill="white" d="M 354 84 L 346 82 L 341 83 L 337 85 L 331 91 L 141 322 L 140 325 L 186 371 L 189 370 L 426 174 L 429 165 L 428 160 L 425 154 L 419 148 L 410 144 L 396 144 L 386 142 L 379 138 L 373 132 L 368 122 L 366 98 L 363 92 Z" />
    <path fill="white" d="M 426 188 L 195 380 L 204 389 L 207 395 L 207 403 L 212 402 L 224 396 L 231 394 L 243 388 L 250 386 L 262 380 L 269 378 L 281 372 L 288 370 L 300 364 L 307 362 L 319 356 L 326 354 L 338 348 L 345 346 L 357 340 L 364 338 L 376 332 L 383 330 L 395 324 L 459 298 L 472 291 L 479 281 L 480 277 L 479 263 L 476 257 L 470 251 L 438 238 L 432 234 L 426 227 L 422 217 L 422 206 Z" />
    <path fill="white" d="M 248 32 L 233 31 L 223 36 L 218 42 L 176 140 L 174 147 L 168 159 L 166 166 L 160 178 L 158 185 L 152 197 L 150 204 L 144 216 L 142 223 L 136 235 L 134 242 L 128 254 L 126 261 L 120 273 L 118 280 L 112 292 L 108 304 L 116 304 L 122 307 L 131 316 L 323 85 L 305 89 L 294 89 L 284 85 L 277 79 L 273 73 L 260 41 L 254 35 Z" />
    <path fill="var(--accent)" d="M 107 320 L 101 323 L 66 351 L 54 363 L 50 369 L 43 385 L 41 394 L 41 413 L 43 422 L 48 435 L 57 448 L 68 458 L 83 466 L 93 469 L 117 470 L 132 466 L 142 461 L 149 456 L 160 445 L 190 407 L 191 395 L 188 389 L 122 323 L 116 320 Z" />
  </>
)

function LiveShuttle() {
  return (
    // 352×172 animation scaled to 33% — matches ShuttleLoading small variant
    <div style={{ width: 130, height: 57, overflow: 'hidden' }}>
      <div style={{ transform: 'scale(0.33)', transformOrigin: 'top left' }}>
        <div className="relative w-[352px] h-[172px]">
          <div className="absolute top-0 left-0 shuttle-flight">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="56" height="56" aria-hidden="true" className="shuttle-icon">
              {SHUTTLE_SVG_PATHS}
            </svg>
          </div>
          <div
            className="absolute bottom-0 left-0 w-14 h-2 rounded-full shuttle-shadow"
            style={{ background: 'black', filter: 'blur(5px)' }}
          />
        </div>
      </div>
    </div>
  )
}

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
          {isLive ? (
            <LiveShuttle />
          ) : (
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
          )}

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
