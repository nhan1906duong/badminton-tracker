interface ScoreBlockProps {
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  editable?: boolean
  onScoreChange?: (a: number, b: number) => void
}

export function ScoreBlock({
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  editable,
  onScoreChange,
}: ScoreBlockProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Team A */}
      <div className="flex-1 text-center">
        <div
          className="text-[13px]"
          style={{ color: 'var(--muted)' }}
        >
          {teamAName}
        </div>
        {editable ? (
          <input
            type="number"
            value={scoreA}
            onChange={(e) => onScoreChange?.(parseInt(e.target.value) || 0, scoreB)}
            className="w-20 h-11 text-center bg-[var(--bg)] border border-[var(--border)] text-[32px] font-extrabold outline-none focus:border-[var(--fg)]"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--fg)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        ) : (
          <div
            className="text-[48px] font-extrabold leading-none min-w-[60px]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
          >
            {scoreA}
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        className="text-[24px]"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--muted)', lineHeight: 1 }}
      >
        :
      </div>

      {/* Team B */}
      <div className="flex-1 text-center">
        <div
          className="text-[13px]"
          style={{ color: 'var(--muted)' }}
        >
          {teamBName}
        </div>
        {editable ? (
          <input
            type="number"
            value={scoreB}
            onChange={(e) => onScoreChange?.(scoreA, parseInt(e.target.value) || 0)}
            className="w-20 h-11 text-center bg-[var(--bg)] border border-[var(--border)] text-[32px] font-extrabold outline-none focus:border-[var(--fg)]"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--fg)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        ) : (
          <div
            className="text-[48px] font-extrabold leading-none min-w-[60px]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
          >
            {scoreB}
          </div>
        )}
      </div>
    </div>
  )
}
