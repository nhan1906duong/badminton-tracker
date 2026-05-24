import { useEffect, useRef, useState, useCallback } from 'react'

const THRESHOLD = 80     // px of touch delta to trigger refresh
const MAX_H = 52         // max indicator height in px
const DAMPING = MAX_H / THRESHOLD

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

// SVG arc spinner: shows pull progress as a partial arc, spins when refreshing
function PullSpinner({ progress, spinning }: { progress: number; spinning: boolean }) {
  const size = 22
  const r = (size - 4) / 2
  const circumference = 2 * Math.PI * r

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        opacity: Math.min(progress * 1.5, 1),
        flexShrink: 0,
        ...(spinning ? { animation: 'spin 0.8s linear infinite' } : {}),
      }}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={spinning ? circumference * 0.2 : circumference * (1 - progress)}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
    </svg>
  )
}

/**
 * Wraps page content to add pull-to-refresh on mobile.
 * The indicator slides in from the top pushing content down — no content
 * transform, so position:fixed children (FAB, bottom nav) are unaffected.
 *
 * Usage:
 *   <PullToRefresh onRefresh={useCallback(async () => { await refetch() }, [refetch])}>
 *     <div className="min-h-svh ...">...</div>
 *   </PullToRefresh>
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [indicatorH, setIndicatorH] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Refs avoid stale closure issues inside event handlers
  const touching = useRef(false)
  const touchStartY = useRef(0)
  const currentH = useRef(0)
  const isRefreshing = useRef(false)

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing.current) return
    isRefreshing.current = true
    setRefreshing(true)
    setIndicatorH(MAX_H)
    currentH.current = MAX_H
    try {
      await onRefresh()
    } finally {
      isRefreshing.current = false
      setRefreshing(false)
      setIndicatorH(0)
      currentH.current = 0
    }
  }, [onRefresh])

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY !== 0 || isRefreshing.current) return
      touchStartY.current = e.touches[0].clientY
      touching.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!touching.current || isRefreshing.current) return
      if (window.scrollY !== 0) {
        touching.current = false
        return
      }
      const delta = e.touches[0].clientY - touchStartY.current
      if (delta <= 0) {
        if (currentH.current > 0) {
          currentH.current = 0
          setIndicatorH(0)
        }
        return
      }
      // Prevent native overscroll when pulling
      e.preventDefault()
      const h = Math.min(delta * DAMPING, MAX_H)
      currentH.current = h
      setIndicatorH(h)
    }

    function onTouchEnd() {
      if (!touching.current || isRefreshing.current) return
      touching.current = false
      if (currentH.current >= MAX_H * 0.88) {
        triggerRefresh()
      } else {
        currentH.current = 0
        setIndicatorH(0)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [triggerRefresh])

  const progress = currentH.current / MAX_H
  const isAnimated = refreshing || indicatorH === 0

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          height: indicatorH,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'var(--bg)',
          transition: isAnimated ? 'height 0.28s cubic-bezier(0.32, 0, 0.15, 1)' : 'none',
          willChange: 'height',
        }}
      >
        <PullSpinner progress={progress} spinning={refreshing} />
      </div>
      {children}
    </>
  )
}
