import { useEffect, useRef, useState, useCallback } from 'react'

const THRESHOLD = 80
const MAX_H = 56
const SPRING_H = MAX_H + 12   // overshoot height — bounces back to MAX_H
const DAMPING = MAX_H / THRESHOLD

const NUM_TICKS = 12
// Opacity for each tick by distance-behind-head (0 = head, 11 = tail)
const TICK_OPACITIES = [1, 0.92, 0.83, 0.74, 0.65, 0.56, 0.47, 0.38, 0.28, 0.20, 0.13, 0.07]

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

// iOS Cupertino-style radial tick spinner.
// Tick 0 sits at 12 o'clock and is the "head" (full opacity); the trail
// fades CCW behind it. During pull, the group rotates with the finger
// (wind-up). During refresh, CSS animation spins it at 60 fps.
function CupertinoSpinner({ progress, spinning }: { progress: number; spinning: boolean }) {
  const size = 28
  const innerR = 5
  const outerR = 11
  const center = size / 2

  const ticks = Array.from({ length: NUM_TICKS }, (_, i) => {
    const rad = ((i / NUM_TICKS) * 360 - 90) * (Math.PI / 180)
    return {
      x1: center + Math.cos(rad) * innerR,
      y1: center + Math.sin(rad) * innerR,
      x2: center + Math.cos(rad) * outerR,
      y2: center + Math.sin(rad) * outerR,
      // distance behind head going CCW: 0 = head (full), 11 = tail (dim)
      opacity: TICK_OPACITIES[(NUM_TICKS - i) % NUM_TICKS],
    }
  })

  return (
    <>
      {/* Single keyframe — hoisted by React 19, deduped across renders */}
      <style>{`@keyframes cupertino-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ opacity: spinning ? 1 : Math.min(progress * 2, 1), color: 'var(--muted)', flexShrink: 0 }}
        aria-hidden="true"
      >
        <g
          style={{
            transformBox: 'fill-box',
            transformOrigin: 'center',
            ...(spinning
              ? { animation: 'cupertino-spin 1s linear infinite' }
              : { transform: `rotate(${progress * 360}deg)` }),
          }}
        >
          {ticks.map(({ x1, y1, x2, y2, opacity }, i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity={opacity}
            />
          ))}
        </g>
      </svg>
    </>
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

  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing.current) return
    isRefreshing.current = true
    setRefreshing(true)
    // Overshoot then settle — creates the iOS spring snap feeling
    setIndicatorH(SPRING_H)
    currentH.current = SPRING_H
    settleTimer.current = setTimeout(() => {
      setIndicatorH(MAX_H)
      currentH.current = MAX_H
    }, 220)
    try {
      await onRefresh()
    } finally {
      if (settleTimer.current) clearTimeout(settleTimer.current)
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
        <CupertinoSpinner progress={progress} spinning={refreshing} />
      </div>
      {children}
    </>
  )
}
