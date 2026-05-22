interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export function LoadingState({ size = 'md', message }: LoadingStateProps) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div
        className={`${sizeMap[size]} border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin`}
      />
      {message && (
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {message}
        </p>
      )}
    </div>
  )
}
