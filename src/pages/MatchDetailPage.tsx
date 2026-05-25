import { useState, useEffect, useReducer, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useMatch,
  useStartMatch,
  useRecordResult,
  useEndMatchNoWinner,
  useDeleteMatch,
  useReopenMatch,
  useMatches,
} from '../hooks/useMatches'
import { AppBar } from '../../design-system/components'
import { BottomSheet, BottomSheetItem, BottomSheetDivider, BottomSheetCancel } from '../../design-system/components/bottom-sheet'
import { formatShortPlayerName } from '../lib/player-name'
import type { MatchWithDetails, Player } from '../types/database'
import { LOCALE_TAG, matchTypeLabel, useI18n, type Locale } from '../i18n'
import { useIsAdmin } from '../hooks/useIsAdmin'
import {
  ChevronLeft, MoreVertical, Minus, RotateCcw, ArrowLeftRight,
  CheckCircle, RefreshCw, Trash2, Pencil, Loader2,
  Square,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface LogEntry { team: 'A' | 'B'; a: number; b: number }
type SheetKind = 'menu' | 'confirm-end' | 'award' | 'score-edit' | 'confirm-delete' | null

// ── Constants ──────────────────────────────────────────────────────────────

const POINTS_TARGET = 21
const WIN_BY_TWO = true
const HARD_CAP = 30

// ── Helpers ────────────────────────────────────────────────────────────────

function computeWinner(a: number, b: number): 'A' | 'B' | null {
  if (a >= HARD_CAP && a > b) return 'A'
  if (b >= HARD_CAP && b > a) return 'B'
  if (a >= POINTS_TARGET && (!WIN_BY_TWO || a - b >= 2)) return 'A'
  if (b >= POINTS_TARGET && (!WIN_BY_TWO || b - a >= 2)) return 'B'
  return null
}

function buildSeedLog(a: number, b: number): LogEntry[] {
  const log: LogEntry[] = []
  let ca = 0, cb = 0
  while (ca < a || cb < b) {
    if (ca < a && (cb >= b || Math.random() < 0.6)) {
      ca++; log.push({ team: 'A', a: ca, b: cb })
    } else if (cb < b) {
      cb++; log.push({ team: 'B', a: ca, b: cb })
    }
  }
  return log
}

function formatTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(LOCALE_TAG[locale], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getElapsed(startIso: string): string {
  const diffMs = Date.now() - new Date(startIso).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins === 0) return '< 1m'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function getTeamPlayers(match: MatchWithDetails, teamLabel: 'TEAM_A' | 'TEAM_B'): Player[] {
  const team = match.teams.find(t => t.team_label === teamLabel)
  if (!team) return []
  return match.participants.filter(p => p.team_id === team.id).map(p => p.player)
}

// ── Live state reducer ─────────────────────────────────────────────────────

interface LiveState {
  score: { a: number; b: number }
  serving: 'A' | 'B' | null
  log: LogEntry[]
}

type LiveAction =
  | { type: 'init'; a: number; b: number }
  | { type: 'reset'; serving?: 'A' | 'B' | null }
  | { type: 'increment'; team: 'A' | 'B' }
  | { type: 'decrement'; team: 'A' | 'B' }
  | { type: 'undo' }
  | { type: 'swap_serve' }
  | { type: 'set_serving'; serving: 'A' | 'B' | null }
  | { type: 'kp_apply'; team: 'A' | 'B'; target: number }

function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case 'init': {
      const a = action.a, b = action.b
      return { score: { a, b }, serving: null, log: buildSeedLog(a, b) }
    }
    case 'reset':
      return { score: { a: 0, b: 0 }, serving: action.serving ?? null, log: [] }
    case 'increment': {
      const next = { a: state.score.a, b: state.score.b }
      if (action.team === 'A') next.a++; else next.b++
      return { score: next, serving: action.team, log: [...state.log, { team: action.team, a: next.a, b: next.b }] }
    }
    case 'decrement': {
      const score = action.team === 'A' ? state.score.a : state.score.b
      if (score === 0) return state
      const next = { ...state.score, [action.team === 'A' ? 'a' : 'b']: score - 1 }
      const lastIdx = [...state.log].reverse().findIndex(e => e.team === action.team)
      const log = lastIdx < 0 ? state.log : [
        ...state.log.slice(0, state.log.length - 1 - lastIdx),
        ...state.log.slice(state.log.length - lastIdx),
      ]
      return { ...state, score: next, log }
    }
    case 'undo': {
      if (state.log.length === 0) return state
      const last = state.log[state.log.length - 1]
      const newScore = {
        a: last.team === 'A' ? Math.max(0, state.score.a - 1) : state.score.a,
        b: last.team === 'B' ? Math.max(0, state.score.b - 1) : state.score.b,
      }
      const newLog = state.log.slice(0, -1)
      const prev = newLog[newLog.length - 1]
      return { score: newScore, serving: prev?.team ?? state.serving, log: newLog }
    }
    case 'swap_serve':
      return { ...state, serving: state.serving === 'A' ? 'B' : 'A' }
    case 'set_serving':
      return { ...state, serving: action.serving }
    case 'kp_apply': {
      const { team, target } = action
      const current = team === 'A' ? state.score.a : state.score.b
      const delta = target - current
      if (delta === 0) return state
      if (delta > 0) {
        let a = state.score.a, b = state.score.b
        const newEntries: LogEntry[] = []
        for (let i = 0; i < delta; i++) {
          if (team === 'A') a++; else b++
          newEntries.push({ team, a, b })
        }
        return { score: { a, b }, serving: team, log: [...state.log, ...newEntries] }
      } else {
        let remove = -delta
        const newLog = [...state.log]
        for (let i = newLog.length - 1; i >= 0 && remove > 0; i--) {
          if (newLog[i].team === team) { newLog.splice(i, 1); remove-- }
        }
        let a = 0, b = 0
        const rebuilt = newLog.map(p => {
          if (p.team === 'A') a++; else b++
          return { ...p, a, b }
        })
        const prev = rebuilt[rebuilt.length - 1]
        return {
          score: { ...state.score, [team === 'A' ? 'a' : 'b']: target },
          serving: prev?.team ?? state.serving,
          log: rebuilt,
        }
      }
    }
    default:
      return state
  }
}

// ── ScoreNumStyle ──────────────────────────────────────────────────────────

const scoreNumStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 88,
  fontWeight: 800,
  lineHeight: 0.9,
  letterSpacing: '-0.05em',
  fontVariantNumeric: 'tabular-nums',
  display: 'inline-flex',
  alignItems: 'baseline',
  userSelect: 'none',
  transition: 'color 0.2s',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 'var(--radius-md)',
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function MatchDetailPage() {
  const { locale, t } = useI18n()
  const isAdmin = useIsAdmin()
  const { id: sessionId, matchId } = useParams<{ id: string; matchId: string }>()
  const navigate = useNavigate()

  const { data: match, isLoading } = useMatch(matchId ?? '')
  const { data: allMatches } = useMatches(sessionId)
  const startMatch = useStartMatch()
  const recordResult = useRecordResult()
  const endMatchNoWinner = useEndMatchNoWinner()
  const deleteMatch = useDeleteMatch()
  const reopenMatch = useReopenMatch()

  // Live scoring state (ephemeral — not synced to DB during play)
  const [live, dispatch] = useReducer(liveReducer, { score: { a: 0, b: 0 }, serving: null, log: [] })
  const liveScore = live.score
  const serving = live.serving
  const pointLog = live.log

  // Sheet state
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [kpValue, setKpValue] = useState('')
  const [kpTeam, setKpTeam] = useState<'A' | 'B'>('A')

  // Bump animation
  const [bumpedTeam, setBumpedTeam] = useState<'A' | 'B' | null>(null)

  // Sticky nav
  const [isNavStuck, setIsNavStuck] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  // Initialize live score from DB on first load (for re-opened matches that have stored scores)
  useEffect(() => {
    if (!match || hasInitialized.current) return
    hasInitialized.current = true
    if (match.status === 'LIVE') {
      const s = match.scores[0]
      if (s && (s.team_a_score > 0 || s.team_b_score > 0)) {
        dispatch({ type: 'init', a: s.team_a_score, b: s.team_b_score })
      }
    }
  }, [match])

  // Sticky nav scroll listener
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setIsNavStuck(el.scrollTop > 24)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!match) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: 'var(--space-5)' }}>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>{t('matchDetail.notFound')}</p>
      </div>
    )
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const teamAPlayers = getTeamPlayers(match, 'TEAM_A')
  const teamBPlayers = getTeamPlayers(match, 'TEAM_B')
  const teamAName = teamAPlayers.map(p => formatShortPlayerName(p.name)).join(' + ')
  const teamBName = teamBPlayers.map(p => formatShortPlayerName(p.name)).join(' + ')

  const status = match.status
  const isLive = status === 'LIVE'
  const isScheduled = status === 'SCHEDULED'
  const isCompleted = status === 'COMPLETED'

  const displayScoreA = isCompleted ? (match.scores[0]?.team_a_score ?? 0) : liveScore.a
  const displayScoreB = isCompleted ? (match.scores[0]?.team_b_score ?? 0) : liveScore.b

  const completedWinnerLabel = isCompleted ? match.teams.find(t => t.is_winner)?.team_label ?? null : null
  const liveWinner = isLive ? computeWinner(liveScore.a, liveScore.b) : null

  const aIsWinner = isCompleted ? completedWinnerLabel === 'TEAM_A' : liveWinner === 'A'
  const bIsWinner = isCompleted ? completedWinnerLabel === 'TEAM_B' : liveWinner === 'B'

  const matchIndex = allMatches?.findIndex(m => m.id === matchId) ?? -1
  const matchNumber = matchIndex >= 0 ? (allMatches!.length - matchIndex) : 1

  const lead = Math.max(displayScoreA, displayScoreB)
  const pct = Math.min(100, Math.round((lead / POINTS_TARGET) * 100))

  // ── Score actions ────────────────────────────────────────────────────────

  function increment(team: 'A' | 'B') {
    if (!isLive) return
    dispatch({ type: 'increment', team })
    bump(team)
  }

  function decrement(team: 'A' | 'B') {
    if (!isLive) return
    dispatch({ type: 'decrement', team })
  }

  function undoLast() {
    dispatch({ type: 'undo' })
  }

  function swapServe() {
    dispatch({ type: 'swap_serve' })
  }

  function bump(team: 'A' | 'B') {
    setBumpedTeam(team)
    setTimeout(() => setBumpedTeam(null), 350)
  }

  // ── Keypad ────────────────────────────────────────────────────────────────

  function openScoreEdit(team: 'A' | 'B') {
    if (!isLive) return
    setKpTeam(team)
    setKpValue('')
    setSheet('score-edit')
  }

  function kpInput(k: string | 'back' | 'clear') {
    if (k === 'back') {
      setKpValue(v => v.slice(0, -1))
      return
    }
    if (k === 'clear') { setKpValue(''); return }
    const next = (kpValue + k).replace(/^0+(?=\d)/, '')
    if (next.length > 2) return
    const n = parseInt(next, 10)
    if (!isNaN(n) && n <= HARD_CAP) setKpValue(next)
  }

  function kpSave() {
    if (!kpValue) return
    const target = parseInt(kpValue, 10)
    const current = kpTeam === 'A' ? liveScore.a : liveScore.b
    if (isNaN(target) || target < 0 || target > HARD_CAP || target === current) return
    dispatch({ type: 'kp_apply', team: kpTeam, target })
    bump(kpTeam)
    setSheet(null)
  }

  // ── Match flow ────────────────────────────────────────────────────────────

  async function handleStartMatch() {
    if (!serving) return
    await startMatch.mutateAsync(matchId!)
    dispatch({ type: 'reset', serving })
    hasInitialized.current = true
  }

  async function handleFinalizeWin(team: 'A' | 'B') {
    setSheet(null)
    await recordResult.mutateAsync({
      id: matchId!,
      winner_team: team === 'A' ? 'TEAM_A' : 'TEAM_B',
      scores: [{ set_number: 1, team_a_score: liveScore.a, team_b_score: liveScore.b }],
    })
  }

  async function handleEndNoWinner() {
    setSheet(null)
    await endMatchNoWinner.mutateAsync({
      id: matchId!,
      scores: [{ set_number: 1, team_a_score: liveScore.a, team_b_score: liveScore.b }],
    })
  }

  async function handleReopenMatch() {
    if (!match) return
    await reopenMatch.mutateAsync(matchId!)
    const s = match.scores[0]
    const initA = s?.team_a_score ?? 0
    const initB = s?.team_b_score ?? 0
    if (initA > 0 || initB > 0) {
      dispatch({ type: 'init', a: initA, b: initB })
    } else {
      dispatch({ type: 'reset' })
    }
    hasInitialized.current = true
  }

  async function handleDeleteMatch() {
    setSheet(null)
    await deleteMatch.mutateAsync(matchId!)
    navigate(-1)
  }

  // ── Keypad display helpers ────────────────────────────────────────────────

  const kpCurrentScore = kpTeam === 'A' ? liveScore.a : liveScore.b
  const kpEntered = kpValue === '' ? null : parseInt(kpValue, 10)
  const kpDelta = kpEntered !== null ? kpEntered - kpCurrentScore : null
  const kpCanSave = kpEntered !== null && kpEntered >= 0 && kpEntered <= HARD_CAP && kpEntered !== kpCurrentScore

  // ── Sub-renders ───────────────────────────────────────────────────────────

  const KP_KEYS: Array<string | 'back' | 'clear'> = ['1','2','3','4','5','6','7','8','9','back','0','clear']

  function renderScoreKeypad() {
    const teamData = kpTeam === 'A' ? teamAName : teamBName
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 var(--space-4)', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ width: 18, height: 18, borderRadius: 3, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, color: 'var(--surface)', background: kpTeam === 'A' ? 'var(--fg)' : 'var(--accent)' }}>
              {kpTeam}
            </span>
            {t('matchDetail.setTeam', { team: kpTeam })}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginLeft: 4 }}>
              {teamData}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }} />
        </div>

        {/* Display */}
        <div style={{ margin: '0 var(--space-2) var(--space-3)', padding: 'var(--space-4)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.9, color: kpEntered !== null ? 'var(--fg)' : 'var(--muted)', opacity: kpEntered !== null ? 1 : 0.4, fontVariantNumeric: 'tabular-nums', minWidth: '2ch' }}>
            {kpEntered !== null ? kpEntered : kpCurrentScore}
          </span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', textAlign: 'right', lineHeight: 1.4, minWidth: 110 }}>
            {kpDelta !== null ? (
              <>
                {t('matchDetail.fromScore', { score: kpCurrentScore })}
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2, color: kpDelta > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                  {kpDelta > 0 ? '+' : ''}{kpDelta}
                </span>
              </>
            ) : (
              <>
                {t('matchDetail.current')}
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2, color: 'var(--fg)' }}>
                  {kpCurrentScore}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', padding: '0 var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
          {[kpCurrentScore + 1, Math.max(0, kpCurrentScore - 1), kpCurrentScore + 5, POINTS_TARGET].map((v, i) => (
            <button key={i} type="button" onClick={() => setKpValue(String(v))}
              style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--fg)', cursor: 'pointer', minHeight: 36, fontVariantNumeric: 'tabular-nums', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 60, touchAction: 'manipulation' }}>
              {i === 0 ? '+1' : i === 1 ? '−1' : i === 2 ? '+5' : `${POINTS_TARGET}`}
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)', padding: '0 var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {KP_KEYS.map((k, i) => (
            <button key={i} type="button" onClick={() => kpInput(k as string)}
              style={{ background: k === 'back' || k === 'clear' ? 'var(--bg)' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', fontFamily: k === 'back' || k === 'clear' ? 'var(--font-body)' : 'var(--font-display)', fontSize: k === 'back' || k === 'clear' ? 'var(--text-sm)' : 'var(--text-xl)', fontWeight: 700, color: k === 'back' || k === 'clear' ? 'var(--muted)' : 'var(--fg)', cursor: 'pointer', minHeight: 56, display: 'grid', placeItems: 'center', letterSpacing: '-0.02em', textTransform: k === 'clear' ? 'uppercase' : undefined, touchAction: 'manipulation' }}>
              {k === 'back' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 5H8l-7 7 7 7h13a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              ) : k === 'clear' ? 'C' : k}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', padding: '0 var(--space-2)' }}>
          <button type="button" onClick={() => setSheet(null)} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', minHeight: 48, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', touchAction: 'manipulation' }}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={kpSave} disabled={!kpCanSave}
            style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: kpCanSave ? 'pointer' : 'not-allowed', minHeight: 48, border: 'none', background: kpCanSave ? 'var(--accent)' : 'var(--border)', color: kpCanSave ? 'var(--surface)' : 'var(--muted)', opacity: kpCanSave ? 1 : 0.6, touchAction: 'manipulation' }}>
            {t('matchDetail.setScore')}
          </button>
        </div>
      </div>
    )
  }

  function renderAwardSheet() {
    return (
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em', padding: '0 var(--space-4)', marginBottom: 'var(--space-2)' }}>
          {t('matchDetail.awardTitle')}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', padding: '0 var(--space-4)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
          {t('matchDetail.awardDescription')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', padding: '0 var(--space-2) var(--space-2)' }}>
          {(['A', 'B'] as const).map(team => (
            <button key={team} type="button" onClick={() => handleFinalizeWin(team)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-4) var(--space-3)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', minHeight: 96, fontFamily: 'inherit', touchAction: 'manipulation' }}>
              <span style={{ width: 18, height: 18, borderRadius: 3, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, color: 'var(--surface)', background: team === 'A' ? 'var(--fg)' : 'var(--accent)', marginBottom: 2 }}>
                {team}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                {t('team.teamLabel', { team })}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--fg)', textAlign: 'center', lineHeight: 1.2 }}>
                {team === 'A' ? teamAName : teamBName}
              </span>
            </button>
          ))}
        </div>
        <BottomSheetCancel onClick={() => setSheet(null)} />
      </div>
    )
  }

  function renderConfirmEndSheet() {
    return (
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em', padding: '0 var(--space-4)', marginBottom: 'var(--space-2)' }}>
          {t('matchDetail.endNoWinnerTitle')}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', padding: '0 var(--space-4)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
          {t('matchDetail.endNoWinnerDescription', { score: `${liveScore.a}–${liveScore.b}` })}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', padding: '0 var(--space-2)' }}>
          <button type="button" onClick={() => setSheet(null)} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', minHeight: 48, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', touchAction: 'manipulation' }}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleEndNoWinner} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', minHeight: 48, border: 'none', background: 'var(--fg)', color: 'var(--surface)', touchAction: 'manipulation' }}>
            {t('matchDetail.endMatch')}
          </button>
        </div>
      </div>
    )
  }

  function renderConfirmDeleteSheet() {
    return (
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em', padding: '0 var(--space-4)', marginBottom: 'var(--space-2)' }}>
          {t('matchDetail.deleteTitle')}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', padding: '0 var(--space-4)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
          {t('matchDetail.deleteDescription', { number: matchNumber, teamA: teamAName, teamB: teamBName })}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', padding: '0 var(--space-2)' }}>
          <button type="button" onClick={() => setSheet('menu')} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', minHeight: 48, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', touchAction: 'manipulation' }}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleDeleteMatch} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', minHeight: 48, border: 'none', background: 'var(--danger)', color: 'var(--surface)', touchAction: 'manipulation' }}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    )
  }

  function renderMenuSheet() {
    return (
      <>
        {isLive && (
          <>
            <BottomSheetItem icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="10" x2="7" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="17" y1="10" x2="17" y2="10"/><line x1="7" y1="14" x2="17" y2="14"/></svg>} label={t('matchDetail.enterScoreDirectly')} onClick={() => { setSheet(null); setTimeout(() => openScoreEdit('A'), 300) }} />
            <BottomSheetItem icon={<CheckCircle size={20} />} label={t('matchDetail.recordTeamWin')} onClick={() => setSheet('award')} />
            <BottomSheetItem icon={<ArrowLeftRight size={20} />} label={t('matchDetail.swapServe')} onClick={() => { setSheet(null); swapServe() }} />
            <BottomSheetItem icon={<RotateCcw size={20} />} label={t('matchDetail.undoLastPoint')} onClick={() => { setSheet(null); undoLast() }} />
          </>
        )}
        {isScheduled && (
          <BottomSheetItem icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>} label={t('matchDetail.startMatchMenu')} onClick={() => { setSheet(null); handleStartMatch() }} />
        )}
        {isCompleted && (
          <BottomSheetItem icon={<RefreshCw size={20} />} label={t('matchDetail.reopenMatch')} onClick={() => { setSheet(null); handleReopenMatch() }} />
        )}
        <BottomSheetItem icon={<Pencil size={20} />} label={t('matchDetail.editPlayers')} onClick={() => navigate(`/sessions/${sessionId}/matches/${matchId}/players/edit`)} />
        <BottomSheetDivider />
        {isLive && (
          <BottomSheetItem icon={<Square size={20} />} label={t('matchDetail.endMatch')} onClick={() => setSheet('confirm-end')} danger />
        )}
        {isAdmin && (
          <BottomSheetItem icon={<Trash2 size={20} />} label={t('matchDetail.deleteMatch')} onClick={() => setSheet('confirm-delete')} danger />
        )}
        <BottomSheetCancel onClick={() => setSheet(null)} />
      </>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── Sticky nav ───────────────────────────────────────────────────── */}
      <AppBar
        title=''
        titleVisible={isNavStuck}
        leftAction={{
          icon: <ChevronLeft style={{ width: 18, height: 18 }} />,
          onClick: () => navigate(-1),
        }}
        rightAction={{
          ariaLabel: t('common.moreOptions'),
          icon: <MoreVertical style={{ width: 18, height: 18 }} />,
          onClick: () => setSheet('menu'),
        }}
        stuck={isNavStuck}
      />

      {/* ── Scroll area ──────────────────────────────────────────────────── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', paddingBottom: 'max(140px, calc(env(safe-area-inset-bottom) + 120px))' }}>

        {/* Hero */}
        <header style={{ padding: 'var(--space-3) var(--space-5) var(--space-5)' }}>
          {/* Eyebrow */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-3)', minHeight: 18, color: isLive ? 'var(--accent)' : isScheduled ? 'var(--muted)' : 'var(--fg)' }}>
            {isLive && <span className="animate-pulse" style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 }} />}
            {isLive ? t('common.liveInProgress') : isScheduled ? t('matchDetail.readyToStart') : t('matchDetail.final')}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.035em', marginBottom: 'var(--space-3)', color: 'var(--fg)' }}>
            {t('matchDetail.matchTitle', { number: matchNumber })}
          </h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{matchTypeLabel(match.match_type, t)}</span>
            <span style={{ width: 3, height: 3, background: 'var(--border)', borderRadius: '50%', flexShrink: 0 }} />
            {isScheduled ? (
              <span>{t('common.notStarted')}</span>
            ) : (
              <>
                <span>{t('matchDetail.startedAt', { time: formatTime(match.played_at, locale) })}</span>
                <span style={{ width: 3, height: 3, background: 'var(--border)', borderRadius: '50%', flexShrink: 0 }} />
                <span>{isLive ? t('units.elapsed', { duration: getElapsed(match.played_at) }) : t('matchDetail.completed')}</span>
              </>
            )}
          </div>
        </header>

        {/* ── SCHEDULED: Huddle ──────────────────────────────────────────── */}
        {isScheduled && (
          <section style={{ margin: '0 var(--space-5) var(--space-5)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5) var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
              {t('matchDetail.readyWhenYouAre')}
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {t('matchDetail.confirmPlayersServe')}
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', maxWidth: 280, lineHeight: 1.5 }}>
              {t('matchDetail.rulesSummary', { target: POINTS_TARGET, cap: HARD_CAP })}
            </p>

            {/* VS layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'var(--space-3)', width: '100%', marginTop: 'var(--space-3)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em', textAlign: 'right', lineHeight: 1.2 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 2 }}>{t('team.teamA')}</span>
                {teamAName}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--muted)' }}>{t('team.VS')}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em', textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 2 }}>{t('team.teamB')}</span>
                {teamBName}
              </div>
            </div>

            {/* Serve pick */}
            <div role="radiogroup" aria-label={t('team.firstServe')} style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              {(['A', 'B'] as const).map(team => (
                <button key={team} type="button" role="radio" aria-checked={serving === team}
                  onClick={() => dispatch({ type: 'set_serving', serving: team })}
                  style={{ background: serving === team ? 'var(--accent-soft)' : 'var(--bg)', border: serving === team ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: serving === team ? 'calc(var(--space-3) - 1px)' : 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: serving === team ? 'var(--accent)' : 'var(--fg)', cursor: 'pointer', minHeight: 44, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, touchAction: 'manipulation', transition: 'border-color 0.12s, background 0.12s' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: serving === team ? 'var(--accent)' : 'var(--muted)' }}>{t('team.servesFirst')}</span>
                  {t('team.teamLabel', { team })}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── LIVE / COMPLETED: Scoreboard ───────────────────────────────── */}
        {(isLive || isCompleted) && (
          <>
            {/* Scoreboard */}
            <section style={{ margin: '0 var(--space-5) var(--space-5)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }} aria-label="Score">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}>
                {/* Center divider */}
                <div aria-hidden style={{ position: 'absolute', top: 'var(--space-5)', bottom: 'var(--space-5)', left: '50%', width: 1, background: 'var(--border)' }} />

                {/* Team A side */}
                {(['A', 'B'] as const).map(team => {
                  const isWinner = team === 'A' ? aIsWinner : bIsWinner
                  const isLoser = team === 'A' ? bIsWinner : aIsWinner
                  const isServingNow = isLive && serving === team
                  const score = team === 'A' ? displayScoreA : displayScoreB
                  const name = team === 'A' ? teamAName : teamBName
                  const isBumped = bumpedTeam === team

                  return (
                    <div
                      key={team}
                      role={isLive ? 'button' : undefined}
                      tabIndex={isLive ? 0 : -1}
                      aria-label={isLive ? t('matchDetail.scorePoint', { team }) : undefined}
                      onClick={() => isLive && increment(team)}
                      onKeyDown={e => { if (isLive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); increment(team) } }}
                      style={{
                        padding: 'var(--space-5) var(--space-4) var(--space-4)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)',
                        textAlign: 'center', position: 'relative', minHeight: 240,
                        cursor: isLive ? 'pointer' : 'default',
                        WebkitTapHighlightColor: 'transparent', userSelect: 'none',
                      }}>

                      {/* Serve indicator */}
                      <div style={{ alignSelf: team === 'A' ? 'flex-start' : 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', visibility: isServingNow ? 'visible' : 'hidden', transition: 'opacity 0.18s', minHeight: 14 }}>
                        {team === 'A' && <span className="animate-pulse" style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%' }} />}
                        {t('matchDetail.serving')}
                        {team === 'B' && <span className="animate-pulse" style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%' }} />}
                      </div>

                      {/* Team label */}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', lineHeight: 1 }}>
                        <span style={{ width: 16, height: 16, borderRadius: 3, display: 'inline-grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 800, color: 'var(--surface)', background: team === 'A' ? 'var(--fg)' : 'var(--accent)' }}>
                          {team}
                        </span>
                        {t('team.teamLabel', { team })}
                      </span>

                      {/* Roster */}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', letterSpacing: '-0.01em', color: isLoser ? 'var(--muted)' : 'var(--fg)', lineHeight: 1.2, minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: isLoser ? 500 : 700 }}>
                        {name}
                      </span>

                      {/* Score number */}
                      <span
                        onClick={e => { e.stopPropagation(); openScoreEdit(team) }}
                        style={{
                          ...scoreNumStyle,
                          color: isWinner ? 'var(--accent)' : isLoser ? 'var(--muted)' : 'var(--fg)',
                          animation: isBumped ? 'score-bump 0.32s cubic-bezier(0.32, 0, 0.15, 1)' : undefined,
                          position: 'relative',
                        }}>
                        {score}
                        {/* Dotted underline for editable scores */}
                        {isLive && <span aria-hidden style={{ position: 'absolute', left: 8, right: 8, bottom: 0, borderBottom: '1.5px dotted var(--border)', pointerEvents: 'none' }} />}
                      </span>

                      {/* Score tools (minus + edit) */}
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 2, alignItems: 'center', minHeight: 28 }}>
                        <button type="button" onClick={() => decrement(team)} disabled={score === 0 || !isLive} aria-label={t('matchDetail.subtractOne', { team })}
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 28, height: 28, display: 'grid', placeItems: 'center', color: 'var(--muted)', borderRadius: 'var(--radius-md)', cursor: score === 0 || !isLive ? 'not-allowed' : 'pointer', opacity: score === 0 || !isLive ? 0.35 : 1, touchAction: 'manipulation' }}>
                          <Minus style={{ width: 14, height: 14 }} />
                        </button>
                        <button type="button" onClick={() => openScoreEdit(team)} disabled={!isLive} aria-label={t('matchDetail.enterScoreDirectly')}
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 28, height: 28, display: 'grid', placeItems: 'center', color: 'var(--muted)', borderRadius: 'var(--radius-md)', cursor: !isLive ? 'not-allowed' : 'pointer', opacity: !isLive ? 0.35 : 1, touchAction: 'manipulation' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="10" x2="7" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="17" y1="10" x2="17" y2="10"/><line x1="7" y1="14" x2="17" y2="14"/></svg>
                        </button>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>{t('matchDetail.pt')}</span>
                      </div>

                      {/* Footer: win stamp or tap hint */}
                      {isCompleted && isWinner ? (
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', border: '1.5px solid var(--accent)', padding: '4px 10px 3px', borderRadius: 'var(--radius-sm)', marginTop: 'auto', background: 'var(--accent-soft)' }}>
                          {t('matchDetail.winner')}
                        </span>
                      ) : isLive ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.65, marginTop: 'auto' }}>
                          {t('matchDetail.tapToScore')}
                        </span>
                      ) : (
                        <span style={{ visibility: 'hidden', marginTop: 'auto', fontSize: 10 }}>.</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Set meter */}
            <div style={{ margin: '0 var(--space-5) var(--space-5)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                {t('matchDetail.toTarget', { target: POINTS_TARGET })}
              </span>
              <div style={{ flex: 1, height: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 999, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, background: 'var(--accent)', borderRadius: 999, width: `${pct}%`, transition: 'width 0.3s cubic-bezier(0.32, 0, 0.15, 1)' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                {lead} / {POINTS_TARGET}
              </span>
            </div>

            {/* Action row */}
            <div style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-6)', display: 'grid', gridTemplateColumns: isCompleted ? '1fr' : '1fr 1fr', gap: 'var(--space-2)' }}>
              {isCompleted ? (
                <button type="button" onClick={handleReopenMatch} disabled={reopenMatch.isPending}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--fg)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', minHeight: 48, touchAction: 'manipulation' }}>
                  {reopenMatch.isPending ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <RefreshCw style={{ width: 16, height: 16, color: 'var(--muted)' }} />}
                  {t('matchDetail.reopenEditing')}
                </button>
              ) : (
                <>
                  <button type="button" onClick={swapServe} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--fg)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', minHeight: 48, touchAction: 'manipulation' }}>
                    <ArrowLeftRight style={{ width: 16, height: 16, color: 'var(--muted)' }} />
                    {t('matchDetail.swapServe')}
                  </button>
                  <button type="button" onClick={undoLast} disabled={pointLog.length === 0} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--fg)', cursor: pointLog.length === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', minHeight: 48, opacity: pointLog.length === 0 ? 0.4 : 1, touchAction: 'manipulation' }}>
                    <RotateCcw style={{ width: 16, height: 16, color: 'var(--muted)' }} />
                    {t('matchDetail.undoLastPoint')}
                  </button>
                </>
              )}
            </div>

            {/* Point log */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 var(--space-5)', marginBottom: 'var(--space-3)', gap: 'var(--space-3)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--fg)' }}>{t('matchDetail.pointLog')}</h2>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                {t('units.point', { count: pointLog.length })}
              </span>
            </div>

            <div style={{ margin: '0 var(--space-5)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {pointLog.length === 0 ? (
                <div style={{ padding: 'var(--space-5) var(--space-4)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  {t('matchDetail.noPointsYet')}
                </div>
              ) : (
                pointLog.slice(-8).reverse().map((entry, i) => {
                  const num = pointLog.length - i
                  const isLatest = i === 0 && isLive
                  return (
                    <div key={num} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto 1fr', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-4)', borderBottom: i < Math.min(pointLog.length, 8) - 1 ? '1px solid var(--border)' : 'none', minHeight: 38, background: isLatest ? 'color-mix(in oklch, var(--accent) 5%, var(--surface))' : 'transparent' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em' }}>#{num}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', textAlign: 'left', color: entry.team === 'A' ? 'var(--fg)' : 'var(--muted)', fontWeight: entry.team === 'A' ? 700 : 500 }}>{entry.a}</span>
                      <span style={{ color: 'var(--border)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>:</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: entry.team === 'B' ? 'var(--fg)' : 'var(--muted)', fontWeight: entry.team === 'B' ? 700 : 500 }}>{entry.b}</span>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', bottom: 0, padding: `var(--space-3) var(--space-5) max(var(--space-4), calc(env(safe-area-inset-bottom) + var(--space-3)))`, background: 'color-mix(in oklch, var(--bg) 92%, transparent)', backdropFilter: 'saturate(180%) blur(12px)', WebkitBackdropFilter: 'saturate(180%) blur(12px)', borderTop: '1px solid var(--border)', zIndex: 18, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

        {isScheduled && (
          <button type="button" onClick={handleStartMatch} disabled={!serving || startMatch.isPending}
            style={{ width: '100%', padding: 'var(--space-4)', background: serving ? 'var(--accent)' : 'var(--border)', color: serving ? 'var(--surface)' : 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 700, border: 'none', borderRadius: 'var(--radius-lg)', cursor: serving ? 'pointer' : 'not-allowed', minHeight: 52, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', boxShadow: serving ? '0 1px 2px oklch(0% 0 0 / 0.08), 0 6px 18px oklch(55% 0.20 30 / 0.22)' : 'none', transition: 'opacity 0.12s, transform 0.12s', touchAction: 'manipulation' }}>
            {startMatch.isPending ? (
              <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4" /></svg>
            )}
            {startMatch.isPending ? t('matchDetail.starting') : serving ? t('matchDetail.startMatch') : t('matchDetail.pickServeFirst')}
            {serving && !startMatch.isPending && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', opacity: 0.7, marginLeft: 'var(--space-1)' }}>→</span>}
          </button>
        )}

        {isLive && (() => {
          const autoWinner = computeWinner(liveScore.a, liveScore.b)
          if (autoWinner) {
            return (
              <button type="button" onClick={() => handleFinalizeWin(autoWinner)} disabled={recordResult.isPending}
                style={{ width: '100%', padding: 'var(--space-4)', background: 'var(--accent)', color: 'var(--surface)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 700, border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer', minHeight: 52, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', boxShadow: '0 1px 2px oklch(0% 0 0 / 0.08), 0 6px 18px oklch(55% 0.20 30 / 0.22)', touchAction: 'manipulation' }}>
                {recordResult.isPending ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : <CheckCircle style={{ width: 18, height: 18 }} />}
                {t('matchDetail.awardMatchTo', { team: autoWinner })}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', opacity: 0.7, marginLeft: 'var(--space-1)' }}>{liveScore.a}–{liveScore.b}</span>
              </button>
            )
          }
          return (
            <>
              <button type="button" onClick={() => setSheet('award')}
                style={{ width: '100%', padding: 'var(--space-4)', background: 'var(--surface)', color: 'var(--fg)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 700, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', minHeight: 52, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', touchAction: 'manipulation' }}>
                <CheckCircle style={{ width: 18, height: 18 }} />
                {t('matchDetail.recordTeamWin')}
              </button>
              <button type="button" onClick={() => setSheet('confirm-end')}
                style={{ width: '100%', padding: 'var(--space-4)', background: 'var(--surface)', color: 'var(--danger)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 700, border: '1px solid var(--danger)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', minHeight: 52, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', touchAction: 'manipulation' }}>
                <Square style={{ width: 18, height: 18 }} />
                {t('matchDetail.endMatch')}
              </button>
            </>
          )
        })()}

        {isCompleted && (
          <button type="button" onClick={() => navigate(-1)}
            style={{ width: '100%', padding: 'var(--space-4)', background: 'var(--surface)', color: 'var(--fg)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 700, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', minHeight: 52, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}>
            {t('matchDetail.backToSession')}
          </button>
        )}
      </div>

      {/* ── Bottom Sheet ─────────────────────────────────────────────────── */}
      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)}>
        {sheet === 'menu' && renderMenuSheet()}
        {sheet === 'award' && renderAwardSheet()}
        {sheet === 'confirm-end' && renderConfirmEndSheet()}
        {sheet === 'confirm-delete' && renderConfirmDeleteSheet()}
        {sheet === 'score-edit' && renderScoreKeypad()}
      </BottomSheet>

    </div>
  )
}
