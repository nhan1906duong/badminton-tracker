import { useState } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-web'

interface LottieMascotProps {
  src: string
  size: number
  className?: string
}

export default function LottieMascot({ src, size, className = '' }: LottieMascotProps) {
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <div style={{ width: size, height: size }} className={className}>
      <DotLottieReact
        src={src}
        loop
        autoplay
        dotLottieRefCallback={(dotLottie: DotLottie | null) => {
          dotLottie?.addEventListener('loadError', () => setFailed(true))
        }}
      />
    </div>
  )
}
