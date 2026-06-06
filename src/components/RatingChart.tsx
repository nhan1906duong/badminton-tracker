import { LOCALE_TAG, useI18n } from '../i18n'

export interface RatingChartPoint {
  rating: number
  date: string
  isWin: boolean
}

interface Props {
  data: RatingChartPoint[]
}

export function RatingChart({ data }: Props) {
  const { locale } = useI18n()
  if (data.length === 0) return null

  const W = 360, H = 160
  const padL = 44, padR = 12, padT = 22, padB = 36
  const cW = W - padL - padR
  const cH = H - padT - padB

  const ratings = data.map((d) => d.rating)
  const minR = Math.min(...ratings)
  const maxR = Math.max(...ratings)
  const pad = Math.max((maxR - minR) * 0.25, 50)
  const yMin = Math.floor((minR - pad) / 10) * 10
  const yMax = Math.ceil((maxR + pad) / 10) * 10
  const yRange = yMax - yMin || 1

  const toX = (i: number) =>
    padL + (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW)
  const toY = (r: number) => padT + cH - ((r - yMin) / yRange) * cH

  const tickStep = Math.ceil(yRange / 4 / 10) * 10 || 10
  const ticks: number[] = []
  for (let t = Math.ceil(yMin / tickStep) * tickStep; t <= yMax; t += tickStep) {
    if (ticks.length >= 5) break
    ticks.push(t)
  }

  const linePoints =
    data.length > 1 ? data.map((d, i) => `${toX(i)},${toY(d.rating)}`).join(' ') : ''

  const labelIndices = new Set<number>()
  if (data.length <= 6) {
    data.forEach((_, i) => labelIndices.add(i))
  } else {
    const step = Math.ceil(data.length / 5)
    for (let i = 0; i < data.length; i += step) labelIndices.add(i)
    labelIndices.add(data.length - 1)
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(LOCALE_TAG[locale], {
      month: 'short',
      day: 'numeric',
    })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            y1={toY(t)}
            x2={W - padR}
            y2={toY(t)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={padL - 5}
            y={toY(t)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
          >
            {t}
          </text>
        </g>
      ))}

      {linePoints && (
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.75}
        />
      )}

      {data.map((d, i) => {
        const x = toX(i)
        const y = toY(d.rating)
        return (
          <g key={i}>
            {d.isWin && (
              <text x={x} y={y - 11} textAnchor="middle" fontSize={10} fill="var(--accent)">
                ★
              </text>
            )}
            <circle
              cx={x}
              cy={y}
              r={d.isWin ? 5 : 3.5}
              fill={d.isWin ? 'var(--accent)' : 'var(--bg)'}
              stroke="var(--accent)"
              strokeWidth={2}
            />
          </g>
        )
      })}

      {data.map((d, i) =>
        labelIndices.has(i) ? (
          <text
            key={i}
            x={toX(i)}
            y={H - padB + 14}
            textAnchor="middle"
            fontSize={9}
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
          >
            {fmtDate(d.date)}
          </text>
        ) : null,
      )}
    </svg>
  )
}
