import { Suspense, lazy, useEffect, useState } from 'react'
import { getMascot, getMascotDisplayPath } from '../lib/mascots'
import { pickMascotQuote } from '../lib/mascot-quotes'
import { usePlayerQuotes } from '../hooks/usePlayerQuotes'
import { MascotSpeechBubble } from './MascotSpeechBubble'
import { useI18n } from '../i18n'

const LottieMascot = lazy(() => import('./LottieMascot'))

const IDLE_QUOTE_INTERVAL_MS = 6000

interface PlayerMascotProps {
  mascotId?: string | null
  size?: number
  reaction?: 'win' | 'lose'
  /** Show a typewriter speech bubble above the mascot, reacting to `reaction` (or idle chatter). */
  speak?: boolean
  /** When set, the player's own custom quotes are mixed into the idle chatter pool. */
  playerId?: string
  className?: string
}

/**
 * Renders a player's chosen mascot. Lazy-loads the Lottie runtime and
 * renders nothing while loading or if the .lottie asset fails to load.
 */
export function PlayerMascot({ mascotId, size = 48, reaction, speak = false, playerId, className = '' }: PlayerMascotProps) {
  const { locale } = useI18n()
  const mascot = getMascot(mascotId)
  const [quote, setQuote] = useState<string | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const { data: customQuotes = [] } = usePlayerQuotes(speak && !reaction ? playerId ?? '' : '')

  useEffect(() => {
    setSrc(mascot ? getMascotDisplayPath(mascot) : null)
  }, [mascot])

  useEffect(() => {
    if (!speak || !mascot) {
      setQuote(null)
      return
    }
    if (reaction) {
      setQuote(pickMascotQuote(reaction, locale))
      return
    }
    const extraQuotes = customQuotes.map((q) => q.text)
    setQuote(pickMascotQuote('idle', locale, extraQuotes))
    const interval = setInterval(() => {
      setQuote(pickMascotQuote('idle', locale, extraQuotes))
    }, IDLE_QUOTE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [speak, reaction, mascot, locale, customQuotes])

  if (!mascot || !src) return null

  const isCollection = Array.isArray(mascot.lottiePath) && mascot.lottiePath.length > 1

  const handleTap = () => {
    if (!isCollection) return
    setSrc((current) => {
      let next = getMascotDisplayPath(mascot)
      while (next === current) next = getMascotDisplayPath(mascot)
      return next
    })
  }

  return (
    <div
      className={`relative inline-flex ${isCollection ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
      onClick={handleTap}
    >
      <Suspense fallback={null}>
        <LottieMascot key={src} src={src} size={size} scale={mascot.scale} className={className} />
      </Suspense>
      {quote && <MascotSpeechBubble text={quote} />}
    </div>
  )
}
