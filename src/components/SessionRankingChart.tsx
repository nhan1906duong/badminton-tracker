import { useState, useMemo } from 'react'
import type { PlayerRankingHistory } from '../hooks/useRankings'

// Pantone formula guide colors
const COLORS = [
  '#DA291C', // Pantone 485 C — Red
  '#003DA5', // Pantone 286 C — Royal Blue
  '#009F6B', // Pantone 347 C — Green
  '#FFB81C', // Pantone 123 C — Yellow
  '#7B2D8B', // Pantone 259 C — Purple
  '#FF671F', // Pantone 1655 C — Orange
  '#00B5E2', // Pantone 637 C — Sky Blue
  '#CC0066', // Pantone 219 C — Magenta
]

function catmullRomPath(pts: { x: number; y: number }[], tension = 0.25): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

type Filter = 'last5' | 'last10' | 'all'

interface Props {
  histories: PlayerRankingHistory[]
  totalMatches: number
}

export function SessionRankingChart(props: Props) {
  if (props.histories.length === 0 || props.totalMatches === 0) return null
  return <ChartInner {...props} />
}

function ChartInner({ histories, totalMatches }: Props) {
  const W = 360, H = 280
  const padL = 32, padR = 8, padT = 16, padB = 28
  const cW = W - padL - padR
  const cH = H - padT - padB

  const [activeIds, setActiveIds] = useState<string[]>(() =>
    histories.map(p => p.playerId)
  )
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const filterN = filter === 'last5' ? 5 : filter === 'last10' ? 10 : Infinity
  const xStart = isFinite(filterN) && totalMatches > filterN ? totalMatches - filterN : 0
  const xRange = totalMatches - xStart || 1

  const activePlayers = useMemo(
    () => histories.filter(p => activeIds.includes(p.playerId)),
    [histories, activeIds]
  )

  const yMax = useMemo(() => {
    let max = 0
    for (const p of activePlayers) {
      for (const pt of p.history) {
        if (pt.matchIndex > xStart && pt.weeklyPoints > max) max = pt.weeklyPoints
      }
    }
    return max || 1
  }, [activePlayers, xStart])

  const toX = (idx: number) => padL + ((idx - xStart) / xRange) * cW
  const toY = (pts: number) => padT + cH - (pts / yMax) * cH

  const tickStep = Math.ceil(yMax / 6 / 25) * 25 || Math.ceil(yMax / 6)
  const yTicks: number[] = [0]
  for (let t = tickStep; t <= yMax; t += tickStep) yTicks.push(t)

  const xLabels = useMemo(() => {
    const set = new Set<number>()
    set.add(xStart)
    if (xRange <= 10) {
      for (let i = xStart + 1; i <= totalMatches; i++) set.add(i)
    } else {
      const step = Math.ceil(xRange / 6)
      for (let i = xStart + step; i < totalMatches; i += step) set.add(i)
      set.add(totalMatches)
    }
    return Array.from(set)
  }, [xStart, xRange, totalMatches])

  const handleChipClick = (playerId: string) => {
    if (activeIds.includes(playerId)) {
      if (focusedId === playerId) {
        // Unfocus but keep visible
        setFocusedId(null)
      } else if (focusedId !== null) {
        // Switch focus to this player
        setFocusedId(playerId)
      } else {
        // Nothing focused: toggle this player off
        setActiveIds(prev => prev.filter(id => id !== playerId))
      }
    } else {
      setActiveIds(prev => [...prev, playerId])
      setFocusedId(playerId)
    }
  }

  const isAnyFocused = focusedId !== null

  return (
    <div>
      {/* Filter buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 8 }}>
        {(['last5', 'last10', 'all'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: filter === f ? 'var(--accent)' : 'transparent',
              color: filter === f ? 'white' : 'var(--muted)',
              border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            {f === 'last5' ? 'L5' : f === 'last10' ? 'L10' : 'All'}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 20, paddingRight: 20, paddingLeft: 4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
        <defs>
          {activePlayers.map((player, _) => {
            const globalPi = histories.indexOf(player)
            const color = COLORS[globalPi % COLORS.length]
            const filteredPts = player.history.filter(pt => pt.matchIndex > xStart)
            const latestTop1 = filteredPts.filter(pt => pt.rank === 1).at(-1)
            if (!latestTop1) return null
            const ax = toX(latestTop1.matchIndex)
            const ay = toY(latestTop1.weeklyPoints)
            return (
              <g key={player.playerId}>
                <radialGradient
                  id={`glow-${globalPi}`}
                  cx={ax} cy={ay} r={16}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0} />
                  <stop offset="55%" stopColor={color} stopOpacity={0} />
                  <stop offset="78%" stopColor={color} stopOpacity={0.65} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </radialGradient>
                <clipPath id={`avatar-clip-${globalPi}`}>
                  <circle cx={ax} cy={ay} r={9} />
                </clipPath>
              </g>
            )
          })}
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map(val => (
          <g key={val}>
            <line x1={padL} y1={toY(val)} x2={W - padR} y2={toY(val)} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 4} y={toY(val)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--muted)" fontFamily="var(--font-mono)">{val}</text>
          </g>
        ))}

        {/* Vertical grid lines */}
        {xLabels.map(idx => (
          <line key={idx} x1={toX(idx)} y1={padT} x2={toX(idx)} y2={H - padB} stroke="var(--border)" strokeWidth={1} />
        ))}

        {/* X-axis labels */}
        {xLabels.map(idx => (
          <text key={idx} x={toX(idx)} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="var(--muted)" fontFamily="var(--font-mono)">{idx}</text>
        ))}

        {/* Player lines — draw unfocused first so focused renders on top */}
        {[...activePlayers].reverse().map(player => {
          const globalPi = histories.indexOf(player)
          const color = COLORS[globalPi % COLORS.length]
          const isFocused = focusedId === player.playerId
          const stroke = isFocused ? color : isAnyFocused ? '#9ca3af' : color
          const strokeWidth = isFocused ? 2.5 : 1.5
          const opacity = isFocused ? 1 : isAnyFocused ? 0.25 : 0.85

          const filteredPts = player.history.filter(pt => pt.matchIndex > xStart)
          const prevPt = xStart > 0
            ? player.history.filter(pt => pt.matchIndex <= xStart).at(-1)
            : null
          const startPt = { matchIndex: xStart, weeklyPoints: prevPt?.weeklyPoints ?? 0 }
          const allPts = [startPt, ...filteredPts]

          const svgPts = allPts.map(pt => ({ x: toX(pt.matchIndex), y: toY(pt.weeklyPoints) }))
          const last = allPts[allPts.length - 1]

          return (
            <g key={player.playerId}>
              <path
                d={catmullRomPath(svgPts)}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={opacity}
              />
              {last && (
                <circle
                  cx={toX(last.matchIndex)}
                  cy={toY(last.weeklyPoints)}
                  r={isFocused ? 4 : 3}
                  fill={stroke}
                  opacity={opacity}
                />
              )}
            </g>
          )
        })}

        {/* Avatars at latest rank-1 point — rendered last so they sit on top */}
        {activePlayers.map(player => {
          const globalPi = histories.indexOf(player)
          const color = COLORS[globalPi % COLORS.length]
          const isFocused = focusedId === player.playerId
          const filteredPts = player.history.filter(pt => pt.matchIndex > xStart)
          const latestTop1 = filteredPts.filter(pt => pt.rank === 1).at(-1)
          if (!latestTop1) return null

          const ax = toX(latestTop1.matchIndex)
          const ay = toY(latestTop1.weeklyPoints)
          const avatarOpacity = isAnyFocused && !isFocused ? 0.3 : 1

          return (
            <g key={`avatar-${player.playerId}`} opacity={avatarOpacity}>
              {/* Gradient glow ring */}
              <circle cx={ax} cy={ay} r={16} fill={`url(#glow-${globalPi})`} />
              {/* Solid border ring */}
              <circle cx={ax} cy={ay} r={10} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
              {/* Avatar */}
              {player.avatarUrl ? (
                <image
                  href={player.avatarUrl}
                  x={ax - 9} y={ay - 9}
                  width={18} height={18}
                  clipPath={`url(#avatar-clip-${globalPi})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <>
                  <circle cx={ax} cy={ay} r={9} fill={color} />
                  <text x={ax} y={ay} textAnchor="middle" dominantBaseline="central" fontSize={7} fontWeight="bold" fill="white">
                    {player.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {histories.map((player, pi) => {
          const color = COLORS[pi % COLORS.length]
          const isActive = activeIds.includes(player.playerId)
          const isFocused = focusedId === player.playerId
          return (
            <button
              key={player.playerId}
              onClick={() => handleChipClick(player.playerId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 100,
                fontSize: 11,
                fontWeight: isFocused ? 700 : 500,
                fontFamily: 'var(--font-display)',
                background: isActive
                  ? `color-mix(in oklch, ${color} 15%, transparent)`
                  : 'transparent',
                color: isActive ? color : 'var(--muted)',
                border: `1.5px solid ${isActive ? color : 'var(--border)'}`,
                cursor: 'pointer',
                opacity: isActive ? 1 : 0.45,
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: isActive ? color : 'var(--muted)',
                  flexShrink: 0,
                }}
              />
              {player.name.split(' ')[0]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
