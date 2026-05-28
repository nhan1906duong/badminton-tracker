import { formatCurrency } from './currency'
import type { Session } from '../types/database'

export interface ShareCardPlayer {
  name: string
  losses: number
}

export interface ShareCardData {
  session: Session
  players: ShareCardPlayer[]   // sorted by losses desc, all who played
  totalDonatedVnd: number
  matchCount: number
}

export interface ShareCardResult {
  blob: Blob
  dataUrl: string
}

const W = 390
const PAD = 28
const SCALE = 2

const C = {
  bg: '#FFFFFF',
  fg: '#111111',
  muted: '#888888',
  border: '#E5E5E5',
  accent: '#F97316',
}

const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

// Date-pill fallback palette (amber, same as S1000)
const DATE_BADGE_COLOR = '#926B10'
const DATE_BADGE_BG    = 'rgba(146, 107, 16, 0.12)'

// BWF category badge colours — mirrors bwf-category-badge.tsx (oklch → hex approx)
const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  'grade-2-level-1': { label: 'Finals', color: '#6A3EC0', bg: 'rgba(106, 62, 192, 0.12)' },
  'grade-2-level-2': { label: 'S1000',  color: '#926B10', bg: 'rgba(146, 107, 16, 0.12)' },
  'grade-2-level-3': { label: 'S750',   color: '#C03820', bg: 'rgba(192, 56, 32, 0.12)'  },
  'grade-2-level-4': { label: 'S500',   color: '#3050B8', bg: 'rgba(48, 80, 184, 0.12)'  },
  'grade-2-level-5': { label: 'S300',   color: '#22763A', bg: 'rgba(34, 118, 58, 0.12)'  },
  'grade-2-level-6': { label: 'S100',   color: '#706858', bg: 'rgba(112, 104, 88, 0.12)' },
}

// Column right-edges
const COL_AMT_R  = W - PAD
const COL_LOSS_R = COL_AMT_R - 115
const COL_NAME_MAX_W = COL_LOSS_R - PAD - 16

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function clamp(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 0 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
  return s + '…'
}

function computeHeight(playerCount: number): number {
  let H = PAD         // top padding
  H += 14 + 16       // eyebrow + gap
  H += 30 + 6        // title + gap
  H += 22 + 24       // date badge + gap-to-divider
  H += 1 + 20        // divider + gap
  H += 12 + 10       // column headers + gap
  H += 1 + 6         // header separator + gap
  H += playerCount * 36  // player rows
  H += 1 + 6         // footer separator + gap
  H += 36            // total row
  H += 20 + 1 + 16   // gap + divider + gap
  H += 14            // footer text
  H += PAD           // bottom padding
  return H
}

export function generateSessionShareCard(data: ShareCardData): ShareCardResult {
  const { session, players, totalDonatedVnd, matchCount } = data
  const H = computeHeight(players.length)

  const canvas = document.createElement('canvas')
  canvas.width  = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // ── Background ────────────────────────────────────────────────
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  let y = PAD

  // ── Eyebrow ───────────────────────────────────────────────────
  ctx.textBaseline = 'top'
  ctx.font = `700 10px ${FONT}`

  ctx.fillStyle = C.accent
  ctx.textAlign = 'left'
  ctx.fillText('TỔNG KẾT ĐÓNG GÓP', PAD, y)

  const dateLabel = new Date(session.started_at).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' })
  ctx.fillStyle = C.muted
  ctx.textAlign = 'right'
  ctx.fillText(dateLabel, W - PAD, y)

  y += 14 + 16

  // ── Session title ─────────────────────────────────────────────
  ctx.fillStyle = C.fg
  ctx.font = `800 24px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(clamp(ctx, session.label ?? 'Buổi Tập Cầu Lông', W - PAD * 2), PAD, y)

  y += 30 + 6

  // ── Session date + duration ───────────────────────────────────
  let dateStr = new Date(session.started_at).toLocaleDateString('vi-VN', { month: 'long', day: 'numeric', year: 'numeric' })
  if (session.ended_at) {
    const totalMin = Math.floor(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000,
    )
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    dateStr += ` · ${h > 0 ? `${h} giờ ` : ''}${m > 0 ? `${m} phút` : ''}`
  }
  // BWF category badge if available, otherwise date pill
  const bwfMeta = session.bwf_tournaments
    ? (CATEGORY_META[session.bwf_tournaments.category_slug] ?? null)
    : null
  const badgeLabel = bwfMeta ? bwfMeta.label : dateStr
  const badgeColor = bwfMeta ? bwfMeta.color : DATE_BADGE_COLOR
  const badgeBg    = bwfMeta ? bwfMeta.bg    : DATE_BADGE_BG

  ctx.font = `700 10px ${FONT}`
  ctx.textBaseline = 'middle'
  const pillTextW = ctx.measureText(badgeLabel).width
  const pillH = 22, pillPadX = 8, pillR = 5
  const pillW = pillTextW + pillPadX * 2

  ctx.fillStyle = badgeBg
  pill(ctx, PAD, y, pillW, pillH, pillR)
  ctx.fill()

  ctx.strokeStyle = badgeColor
  ctx.lineWidth = 1
  pill(ctx, PAD, y, pillW, pillH, pillR)
  ctx.stroke()

  ctx.fillStyle = badgeColor
  ctx.textAlign = 'left'
  ctx.fillText(badgeLabel, PAD + pillPadX, y + pillH / 2)

  y += 22 + 24

  // ── Top divider ───────────────────────────────────────────────
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y + 0.5)
  ctx.lineTo(W - PAD, y + 0.5)
  ctx.stroke()

  y += 1 + 20

  // ── Column headers ────────────────────────────────────────────
  ctx.font = `700 10px ${FONT}`
  ctx.textBaseline = 'top'

  ctx.fillStyle = C.muted
  ctx.textAlign = 'left'
  ctx.fillText('TÊN', PAD, y)

  ctx.textAlign = 'right'
  ctx.fillText('THUA', COL_LOSS_R, y)
  ctx.fillText('ĐÓNG GÓP', COL_AMT_R, y)

  y += 12 + 10

  // ── Header separator ──────────────────────────────────────────
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y + 0.5)
  ctx.lineTo(W - PAD, y + 0.5)
  ctx.stroke()

  y += 1 + 6

  // ── Player rows ───────────────────────────────────────────────
  for (const player of players) {
    const rowCy = y + 18  // vertical center of 36px row

    ctx.font = `500 14px ${FONT}`
    ctx.fillStyle = C.fg
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(clamp(ctx, player.name, COL_NAME_MAX_W), PAD, rowCy)

    const lossesStr = String(player.losses)
    ctx.font = `600 14px ${FONT}`
    ctx.fillStyle = player.losses > 0 ? C.fg : C.muted
    ctx.textAlign = 'right'
    ctx.fillText(lossesStr, COL_LOSS_R, rowCy)

    const amtStr = player.losses > 0 ? formatCurrency(player.losses * 5000) : '—'
    ctx.font = `500 13px ${FONT}`
    ctx.fillStyle = player.losses > 0 ? C.fg : C.muted
    ctx.fillText(amtStr, COL_AMT_R, rowCy)

    y += 36
  }

  // ── Total separator ───────────────────────────────────────────
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y + 0.5)
  ctx.lineTo(W - PAD, y + 0.5)
  ctx.stroke()

  y += 1 + 6

  // ── Total row ─────────────────────────────────────────────────
  const totalCy = y + 18
  const totalLosses = players.reduce((s, p) => s + p.losses, 0)

  ctx.font = `700 14px ${FONT}`
  ctx.fillStyle = C.fg
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('TỔNG CỘNG', PAD, totalCy)

  ctx.textAlign = 'right'
  ctx.fillText(String(totalLosses), COL_LOSS_R, totalCy)

  ctx.fillStyle = C.accent
  ctx.font = `700 14px ${FONT}`
  ctx.fillText(formatCurrency(totalDonatedVnd), COL_AMT_R, totalCy)

  y += 36

  y += 20

  // ── Footer divider ────────────────────────────────────────────
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y + 0.5)
  ctx.lineTo(W - PAD, y + 0.5)
  ctx.stroke()

  y += 1 + 16

  // ── Footer ────────────────────────────────────────────────────
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.font = `700 12px ${FONT}`
  ctx.fillStyle = '#000000'
  ctx.fillText(`${matchCount} trận`, PAD, y)

  ctx.font = `400 11px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText('Liên Quân Cầu Lông (BDF)', W - PAD, y)

  // ── Encode ────────────────────────────────────────────────────
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const blob = new Blob([arr], { type: 'image/png' })

  return { blob, dataUrl }
}
