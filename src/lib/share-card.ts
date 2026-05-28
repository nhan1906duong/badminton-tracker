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

// Column right-edges
const COL_AMT_R  = W - PAD
const COL_LOSS_R = COL_AMT_R - 115
const COL_NAME_MAX_W = COL_LOSS_R - PAD - 16

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
  H += 16 + 24       // date line + gap-to-divider
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
  ctx.fillText('DONATION SUMMARY', PAD, y)

  const dateLabel = new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  ctx.fillStyle = C.muted
  ctx.textAlign = 'right'
  ctx.fillText(dateLabel, W - PAD, y)

  y += 14 + 16

  // ── Session title ─────────────────────────────────────────────
  ctx.fillStyle = C.fg
  ctx.font = `800 24px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(clamp(ctx, session.label ?? 'Badminton Session', W - PAD * 2), PAD, y)

  y += 30 + 6

  // ── Session date + duration ───────────────────────────────────
  let dateStr = new Date(session.started_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  if (session.ended_at) {
    const totalMin = Math.floor(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000,
    )
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    dateStr += ` · ${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''} total`
  }
  ctx.fillStyle = C.muted
  ctx.font = `400 13px ${FONT}`
  ctx.fillText(dateStr, PAD, y)

  y += 16 + 24

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
  ctx.fillText('PLAYER', PAD, y)

  ctx.textAlign = 'right'
  ctx.fillText('LOST', COL_LOSS_R, y)
  ctx.fillText('AMOUNT', COL_AMT_R, y)

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
  ctx.fillText('TOTAL', PAD, totalCy)

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
  ctx.font = `600 12px ${FONT}`
  ctx.fillStyle = C.fg
  ctx.fillText(`${matchCount}`, PAD, y)
  const w1 = ctx.measureText(`${matchCount}`).width

  ctx.font = `400 12px ${FONT}`
  ctx.fillStyle = C.muted
  ctx.fillText(' matches', PAD + w1, y)

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
