import { formatCurrency } from './currency'
import type { SessionWeeklyStats } from '../hooks/useRankings'
import type { Session } from '../types/database'

export interface ShareCardData {
  session: Session
  leader: SessionWeeklyStats | undefined
  mostActive: { name: string; matchesPlayed: number } | undefined
  totalDonatedVnd: number
  matchCount: number
  playerCount: number
}

const W = 390
const PAD = 28
const SCALE = 2

const C = {
  bg: '#111111',
  surface: '#1E1E1E',
  accent: '#F97316',
  fg: '#F0F0F0',
  muted: '#6B6B6B',
  border: '#2D2D2D',
}

const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function clampText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 0 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
  return s + '…'
}

function computeHeight(data: ShareCardData): number {
  const hasMvp = !!data.leader
  const hasMostActive = !!data.mostActive && data.mostActive.matchesPlayed > 0
  const hasDonation = data.totalDonatedVnd > 0

  let H = PAD         // top padding
  H += 14 + 20       // eyebrow line + gap
  H += 30 + 6        // title + gap
  H += 16 + 24       // date line + gap before divider
  H += 1 + 24        // divider + gap

  let first = true
  if (hasMvp) {
    H += 12 + 10 + 40  // label + gap + row
    first = false
  }
  if (hasMostActive) {
    H += (first ? 0 : 20) + 12 + 10 + 40
    first = false
  }
  if (hasDonation) {
    H += (first ? 0 : 20) + 12 + 10 + 30
  }

  H += 24             // gap before footer divider
  H += 1 + 20        // divider + gap
  H += 16             // footer text
  H += PAD            // bottom padding
  return H
}

export function generateSessionShareCard(data: ShareCardData): Blob {
  const { session, leader, mostActive, totalDonatedVnd, matchCount, playerCount } = data
  const H = computeHeight(data)

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // ── Background ────────────────────────────────────────────────
  ctx.fillStyle = C.bg
  ctx.beginPath()
  const r = 20
  ctx.moveTo(r, 0)
  ctx.lineTo(W - r, 0)
  ctx.arcTo(W, 0, W, r, r)
  ctx.lineTo(W, H - r)
  ctx.arcTo(W, H, W - r, H, r)
  ctx.lineTo(r, H)
  ctx.arcTo(0, H, 0, H - r, r)
  ctx.lineTo(0, r)
  ctx.arcTo(0, 0, r, 0, r)
  ctx.closePath()
  ctx.fill()

  let y = PAD

  // ── Eyebrow ───────────────────────────────────────────────────
  ctx.textBaseline = 'top'
  ctx.font = `700 10px ${FONT}`

  ctx.fillStyle = C.accent
  ctx.textAlign = 'left'
  ctx.fillText('SESSION SUMMARY', PAD, y)

  ctx.fillStyle = C.muted
  ctx.textAlign = 'right'
  ctx.fillText('COMPLETED', W - PAD, y)

  y += 14 + 20

  // ── Session title ─────────────────────────────────────────────
  ctx.fillStyle = C.fg
  ctx.font = `800 24px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText(clampText(ctx, session.label ?? 'Badminton Session', W - PAD * 2), PAD, y)

  y += 30 + 6

  // ── Date + duration ───────────────────────────────────────────
  const sessionDate = new Date(session.started_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  let dateStr = sessionDate
  if (session.ended_at) {
    const totalMin = Math.floor(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000,
    )
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    const dur = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
    dateStr += ` · ${dur} total`
  }
  ctx.fillStyle = C.muted
  ctx.font = `400 13px ${FONT}`
  ctx.fillText(dateStr, PAD, y)

  y += 16 + 24

  // ── Divider ───────────────────────────────────────────────────
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y + 0.5)
  ctx.lineTo(W - PAD, y + 0.5)
  ctx.stroke()

  y += 1 + 24

  // ── Stat sections ─────────────────────────────────────────────
  const hasMvp = !!leader
  const hasMostActive = !!mostActive && mostActive.matchesPlayed > 0
  const hasDonation = totalDonatedVnd > 0

  function drawSectionLabel(text: string, accentColor: boolean) {
    ctx.fillStyle = accentColor ? C.accent : C.muted
    ctx.font = `700 10px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(text, PAD, y)
    y += 12 + 10
  }

  function drawAvatar(cx: number, cy: number, name: string) {
    ctx.fillStyle = C.surface
    ctx.strokeStyle = C.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = C.accent
    ctx.font = `700 11px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(getInitials(name), cx, cy)
  }

  function drawPlayerRow(label: string, name: string, detail: string, accentLabel: boolean) {
    drawSectionLabel(label, accentLabel)
    const rowCy = y + 20
    drawAvatar(PAD + 18, rowCy, name)

    const nameX = PAD + 36 + 12
    const nameMaxW = W - nameX - PAD - 100
    ctx.fillStyle = C.fg
    ctx.font = `600 15px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(clampText(ctx, name, nameMaxW), nameX, rowCy)

    ctx.fillStyle = C.muted
    ctx.font = `400 13px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText(detail, W - PAD, rowCy)

    y += 40
  }

  let firstSection = true

  if (hasMvp) {
    drawPlayerRow(
      'MVP',
      leader!.name,
      `${leader!.wins}W · ${Math.round((leader!.wins / leader!.matchesPlayed) * 100)}%`,
      true,
    )
    firstSection = false
  }

  if (hasMostActive) {
    if (!firstSection) y += 20
    drawPlayerRow('Most Active', mostActive!.name, `${mostActive!.matchesPlayed} matches`, false)
    firstSection = false
  }

  if (hasDonation) {
    if (!firstSection) y += 20
    drawSectionLabel('Donations', false)
    ctx.fillStyle = C.fg
    ctx.font = `700 20px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(formatCurrency(totalDonatedVnd), PAD, y)
    y += 30
  }

  y += 24

  // ── Footer divider ────────────────────────────────────────────
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y + 0.5)
  ctx.lineTo(W - PAD, y + 0.5)
  ctx.stroke()

  y += 1 + 20

  // ── Footer ────────────────────────────────────────────────────
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  ctx.font = `600 12px ${FONT}`
  ctx.fillStyle = C.fg
  ctx.fillText(`${matchCount}`, PAD, y)
  const w1 = ctx.measureText(`${matchCount}`).width

  ctx.font = `400 12px ${FONT}`
  ctx.fillStyle = C.muted
  ctx.fillText(' matches · ', PAD + w1, y)
  const w2 = ctx.measureText(' matches · ').width

  ctx.font = `600 12px ${FONT}`
  ctx.fillStyle = C.fg
  ctx.fillText(`${playerCount}`, PAD + w1 + w2, y)
  const w3 = ctx.measureText(`${playerCount}`).width

  ctx.font = `400 12px ${FONT}`
  ctx.fillStyle = C.muted
  ctx.fillText(' players', PAD + w1 + w2 + w3, y)

  ctx.font = `400 11px ${FONT}`
  ctx.fillStyle = C.muted
  ctx.textAlign = 'right'
  ctx.fillText('badminton tracker', W - PAD, y)

  // ── Encode ────────────────────────────────────────────────────
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: 'image/png' })
}
