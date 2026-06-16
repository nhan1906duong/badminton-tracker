import { useState } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-web'

interface LottieMascotProps {
  src: string
  size: number
  scale?: number
  className?: string
}

export default function LottieMascot({ src, size, scale = 1, className = '' }: LottieMascotProps) {
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <div style={{ width: size, height: size, overflow: 'hidden' }} className={className}>
      <div style={{ width: '100%', height: '100%', transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <DotLottieReact
          src={src}
          loop
          autoplay
          dotLottieRefCallback={(dotLottie: DotLottie | null) => {
            dotLottie?.addEventListener('loadError', () => setFailed(true))
          }}
        />
      </div>
    </div>
  )
}
