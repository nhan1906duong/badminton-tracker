import { useEffect, useState } from 'react'

interface MascotSpeechBubbleProps {
  text: string
}

const TYPE_SPEED_MS = 35

/** Typewriter-effect speech bubble, anchored above its relatively-positioned parent. */
export function MascotSpeechBubble({ text }: MascotSpeechBubbleProps) {
  const [shown, setShown] = useState('')

  useEffect(() => {
    setShown('')
    let i = 0
    const interval = setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, TYPE_SPEED_MS)
    return () => clearInterval(interval)
  }, [text])

  return (
    <div
      className="absolute bottom-full right-0 mb-2"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-1) var(--space-2)',
        fontSize: 'var(--text-xs)',
        color: 'var(--fg)',
        boxShadow: '0 2px 8px oklch(0% 0 0 / 0.12)',
        maxWidth: 'min(75vw, 260px)',
        width: 'max-content',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        textAlign: 'center',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    >
      {shown}
      <span aria-hidden="true">{shown.length < text.length ? '▍' : ''}</span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: -4,
          right: 20,
          transform: 'rotate(45deg)',
          width: 8,
          height: 8,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      />
    </div>
  )
}
