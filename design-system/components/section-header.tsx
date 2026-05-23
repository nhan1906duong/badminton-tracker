interface SectionHeaderProps {
  title: string
  action?: { label: string; onClick: () => void }
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h3
        className="text-[24px] font-extrabold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
      >
        {title}
      </h3>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[13px] font-semibold cursor-pointer active:opacity-70 transition-opacity"
          style={{ color: 'var(--accent)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
