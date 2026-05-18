import Avatar from './Avatar'

/**
 * PodiumChart — modern sports podium for top-5 rankings.
 *
 * Layout: [4] [2] [1] [3] [5] left-to-right.
 * Each block has a coloured body with avatar, name, and value.
 */

export interface PodiumPlayer {
  rank: number
  name: string
  wins: number
  matchesPlayed: number
  avatarUrl?: string
  value?: number
  valueLabel?: string
}

interface PodiumChartProps {
  players: PodiumPlayer[]
  onPlayerClick?: (player: PodiumPlayer) => void
}

/* ---------- Crown icon (gold) ---------- */

function CrownIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M2 18L4 8l4 4 4-8 4 8 4-4 2 10H2z"
        fill="#fbbf24"
        stroke="#d97706"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <rect x="2" y="18" width="20" height="3" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
    </svg>
  )
}

/* ---------- Medal icon (ribbon + medallion) ---------- */

function MedalIcon({
  color,
  ribbonColor,
  size = 24,
}: {
  color: string
  ribbonColor: string
  size?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {/* Ribbon — V shape */}
      <path d="M8 2 L12 7 L16 2 L14 2 L12 5 L10 2 Z" fill={ribbonColor} />
      {/* Medallion circle */}
      <circle cx="12" cy="14" r="7" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      {/* Inner highlight ring */}
      <circle cx="12" cy="14" r="5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      {/* Star in center */}
      <path
        d="M12 10.5 L13 13 L15.5 13 L13.5 14.5 L14.2 17 L12 15.5 L9.8 17 L10.5 14.5 L8.5 13 L11 13 Z"
        fill="rgba(255,255,255,0.85)"
      />
    </svg>
  )
}

/* ---------- Block colour theme ---------- */

interface BlockTheme {
  body: string
}

const THEMES: Record<number, BlockTheme> = {
  1: { body: '#f5a623' },
  2: { body: '#b8b8b8' },
  3: { body: '#cd7f32' },
  4: { body: '#4a7fb5' },
  5: { body: '#2c4a6e' },
}

/* ---------- Layout config ---------- */

const GAP = 8
const COL_WIDTH = 66
const BASELINE_Y = 180
const ICON_GAP = 6

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface BlockConfig {
  rank: number
  x: number
  bodyHeight: number
}

function buildBlocks(): BlockConfig[] {
  const heights: Record<number, number> = {
    1: 140,
    2: 110,
    3: 80,
    4: 70,
    5: 70,
  }
  // Order left-to-right: 4, 2, 1, 3, 5
  const order = [4, 2, 1, 3, 5]
  let x = 0
  return order.map((rank) => {
    const cfg = { rank, x, bodyHeight: heights[rank] }
    x += COL_WIDTH + GAP
    return cfg
  })
}

const BLOCKS = buildBlocks()
const TOTAL_WIDTH = BLOCKS[BLOCKS.length - 1].x + COL_WIDTH

/* ---------- Single podium block ---------- */

function PodiumBlock({
  config,
  player,
  onClick,
}: {
  config: BlockConfig
  player?: PodiumPlayer
  onClick?: () => void
}) {
  const { rank, x, bodyHeight } = config
  const theme = THEMES[rank]
  const bodyY = BASELINE_Y - bodyHeight
  const centerX = x + COL_WIDTH / 2

  /* Top element Y position (above column body) */
  const iconY = bodyY - ICON_GAP - 24

  return (
    <g
      className={onClick ? 'cursor-pointer' : undefined}
      onClick={onClick}
      style={{ transition: 'opacity 0.15s' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as SVGGElement
        el.style.opacity = '0.9'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as SVGGElement
        el.style.opacity = '1'
      }}
    >
      {/* Crown for rank 1 */}
      {rank === 1 && (
        <g transform={`translate(${centerX - 14}, ${iconY - 2})`}>
          <CrownIcon size={28} />
        </g>
      )}

      {/* Medal for rank 2 */}
      {rank === 2 && (
        <g transform={`translate(${centerX - 12}, ${iconY + 2})`}>
          <MedalIcon color="#c0c0c0" ribbonColor="#a0a0a0" size={24} />
        </g>
      )}

      {/* Medal for rank 3 */}
      {rank === 3 && (
        <g transform={`translate(${centerX - 12}, ${iconY + 2})`}>
          <MedalIcon color="#cd7f32" ribbonColor="#b8730e" size={24} />
        </g>
      )}

      {/* Text label for rank 4 */}
      {rank === 4 && (
        <text
          x={centerX}
          y={bodyY - ICON_GAP}
          textAnchor="middle"
          dominantBaseline="auto"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            fontWeight: '800',
            fill: '#4a7fb5',
          }}
        >
          #4
        </text>
      )}

      {/* Text label for rank 5 */}
      {rank === 5 && (
        <text
          x={centerX}
          y={bodyY - ICON_GAP}
          textAnchor="middle"
          dominantBaseline="auto"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            fontWeight: '800',
            fill: '#2c4a6e',
          }}
        >
          #5
        </text>
      )}

      {/* Main body */}
      <rect
        x={x}
        y={bodyY}
        width={COL_WIDTH}
        height={bodyHeight}
        rx={3}
        fill={theme.body}
      />

      {/* Content: Avatar + Name + Value */}
      {player && (
        <foreignObject
          x={x + 2}
          y={bodyY + 4}
          width={COL_WIDTH - 4}
          height={bodyHeight - 8}
        >
          <div
            className="flex flex-col items-center justify-center h-full text-center"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {/* Avatar */}
            <Avatar
              src={player.avatarUrl}
              name={player.name}
              size={24}
              bgColor="rgba(255,255,255,0.9)"
              textColor={theme.body}
            />

            {/* Name */}
            <span
              className="text-[9px] font-semibold text-white truncate w-full mt-1 px-1"
              style={{ lineHeight: 1.2 }}
            >
              {player.name}
            </span>

            {/* Value — prominent pill badge */}
            <span
              className="mt-1 px-1.5 py-0.5 rounded-full font-bold text-white"
              style={{
                fontSize: rank <= 3 ? '11px' : '10px',
                backgroundColor: 'rgba(0,0,0,0.35)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                lineHeight: 1,
              }}
            >
              {player.value !== undefined
                ? `${player.value}${player.valueLabel ?? ''}`
                : `${player.wins}W`}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  )
}

/* ---------- Main component ---------- */

export default function PodiumChart({ players, onPlayerClick }: PodiumChartProps) {
  const playerByRank = new Map<number, PodiumPlayer>()
  for (const p of players) {
    playerByRank.set(p.rank, p)
  }

  return (
    <div className="w-full flex justify-center">
      <svg
        viewBox={`0 0 ${TOTAL_WIDTH} ${BASELINE_Y + 10}`}
        className="w-full max-w-[380px]"
        style={{ maxHeight: 220 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {BLOCKS.map((block) => (
          <PodiumBlock
            key={block.rank}
            config={block}
            player={playerByRank.get(block.rank)}
            onClick={
              onPlayerClick && playerByRank.get(block.rank)
                ? () => onPlayerClick!(playerByRank.get(block.rank)!)
                : undefined
            }
          />
        ))}
      </svg>
    </div>
  )
}
