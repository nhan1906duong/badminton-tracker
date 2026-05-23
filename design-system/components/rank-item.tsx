interface RankItemProps {
  rank: number
  avatar: string
  name: string
  stats: string
  winRate: number
}

export function RankItem({ rank, avatar, name, stats, winRate }: RankItemProps) {
  const isTop = rank <= 2

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Rank number */}
      <div
        className="w-8 text-center text-[24px] font-extrabold shrink-0"
        style={{
          fontFamily: 'var(--font-display)',
          color: isTop ? 'var(--accent)' : 'var(--muted)',
        }}
      >
        {rank}
      </div>

      {/* Avatar */}
      <div
        className="w-10 h-10 shrink-0 flex items-center justify-center font-extrabold text-[18px]"
        style={{
          fontFamily: 'var(--font-display)',
          background: 'var(--fg)',
          color: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {avatar}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div
          className="text-[15px] font-semibold leading-[1.3] truncate"
          style={{ color: 'var(--fg)' }}
        >
          {name}
        </div>
        <div
          className="text-[13px] leading-[1.3]"
          style={{ color: 'var(--muted)' }}
        >
          {stats}
        </div>
      </div>

      {/* Win rate */}
      <div
        className="text-[13px]"
        style={{ color: 'var(--muted)' }}
      >
        {winRate}%
      </div>
    </div>
  )
}
