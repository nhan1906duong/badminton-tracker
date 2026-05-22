import { useState, useRef, useCallback, useEffect } from 'react'

const SWIPE_THRESHOLD = 60
const DELETE_WIDTH = 80

interface SwipeableItemProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onClick?: () => void
  renderAction: () => React.ReactNode
  children: React.ReactNode
  className?: string
}

export function SwipeableItem({
  isOpen,
  onOpen,
  onClose,
  onClick,
  renderAction,
  children,
  className = '',
}: SwipeableItemProps) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const isSwiping = useRef(false)
  const [translateX, setTranslateX] = useState(0)

  useEffect(() => {
    setTranslateX(isOpen ? -DELETE_WIDTH : 0)
  }, [isOpen])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isSwiping.current = false
      startX.current = e.touches[0].clientX
      currentX.current = isOpen ? -DELETE_WIDTH : 0
    },
    [isOpen]
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - startX.current
    if (Math.abs(delta) > 5) {
      isSwiping.current = true
    }
    let newX = currentX.current + delta
    if (newX > 0) newX = 0
    if (newX < -DELETE_WIDTH) newX = -DELETE_WIDTH
    setTranslateX(newX)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (translateX < -SWIPE_THRESHOLD) {
      setTranslateX(-DELETE_WIDTH)
      onOpen()
    } else {
      setTranslateX(0)
      onClose()
    }
  }, [translateX, onOpen, onClose])

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Background fill */}
      <div className="absolute inset-0 bg-red-500 rounded-2xl" />

      {/* Foreground content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isSwiping.current) {
            isSwiping.current = false
            return
          }
          if (isOpen) {
            setTranslateX(0)
            onClose()
          } else {
            onClick?.()
          }
        }}
        style={{
          transform: `translateX(${translateX}px)`,
          transition:
            translateX === 0 || translateX === -DELETE_WIDTH
              ? 'transform 0.2s ease-out'
              : 'none',
          touchAction: 'pan-y',
        }}
        className="relative w-full select-none rounded-2xl"
      >
        {children}
      </div>

      {/* Action layer — above foreground, clickable only when open */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-5 z-10"
        style={{
          width: `${DELETE_WIDTH}px`,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease-out',
        }}
      >
        {renderAction()}
      </div>
    </div>
  )
}
