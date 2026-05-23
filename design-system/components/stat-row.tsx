interface StatRowProps {
  label: string
  value: string | number
}

export function StatRow({ label, value }: StatRowProps) {
  return (
    <div
      className="flex justify-between items-center py-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span
        className="text-[13px]"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </span>
      <span
        className="text-[18px] font-extrabold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
      >
        {value}
      </span>
    </div>
  )
}
