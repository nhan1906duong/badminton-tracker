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
  const [translateX, setTranslateX] = useState(0)

  useEffect(() => {
    setTranslateX(isOpen ? -DELETE_WIDTH : 0)
  }, [isOpen])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX
      currentX.current = isOpen ? -DELETE_WIDTH : 0
    },
    [isOpen]
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - startX.current
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
      {/* Background action layer */}
      <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-5">
        {renderAction()}
      </div>

      {/* Foreground content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
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
        }}
        className="relative w-full select-none bg-white rounded-2xl"
      >
        {children}
      </div>
    </div>
  )
}
