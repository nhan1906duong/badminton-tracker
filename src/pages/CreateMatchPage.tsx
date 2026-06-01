import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useMatches, useCreateMatch } from '../hooks/useMatches'
import { useSession } from '../hooks/useSessions'
import { useLeagueTeams } from '../hooks/useLeagueTeams'
import { useSessionAttendances } from '../hooks/useSessionAttendances'
import { useNewMatchStore } from '../stores/new-match-store'
import { AppBar, SegmentedControl } from '../../design-system/components'
import { MatchTypeChips } from '../../design-system/components/match-type-chips'
import { BottomSheet } from '../../design-system/components/bottom-sheet'
import { getTeamSize, MATCH_TYPE_SHORT } from '../lib/match-helpers'
import { formatShortPlayerName } from '../lib/player-name'
import type { Player, MatchWithDetails } from '../types/database'
import { generateNextMatch, enumerateSplits, makeSplitKey } from '../lib/fair-shuffle'
import type { ShufflePlayer } from '../lib/fair-shuffle'
import { Plus, X, Zap, Calendar, List, ChevronRight, Loader2, Shuffle } from 'lucide-react'
import { LOCALE_TAG, useI18n, type Locale, type TFunction } from '../i18n'

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSessionHistory(
  sessionMatches: MatchWithDetails[],
  pool: ShufflePlayer[]
): {
  splitRecord: Map<string, { team1Wins: number; team2Wins: number }>
  cycleUsedSplits: Set<string>
  playerWins: Map<string, number>
  playerPlayed: Map<string, number>
} {
  const splitRecord = new Map<string, { team1Wins: number; team2Wins: number }>()
  const playerWins = new Map<string, number>()
  const playerPlayed = new Map<string, number>()

  const poolIds = new Set(pool.map(p => p.id))
  const allSplitKeys = new Set(enumerateSplits(pool).map(s => s.key))
  const totalPossible = allSplitKeys.size

  let cycleUsedSplits = new Set<string>()

  const sorted = [...sessionMatches]
    .filter(m => m.status === 'COMPLETED')
    .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())

  for (const match of sorted) {
    const teamADef = match.teams.find(t => t.team_label === 'TEAM_A')
    const teamBDef = match.teams.find(t => t.team_label === 'TEAM_B')
    if (!teamADef || !teamBDef) continue

    const teamAIds = match.participants.filter(p => p.team_id === teamADef.id).map(p => p.player_id)
    const teamBIds = match.participants.filter(p => p.team_id === teamBDef.id).map(p => p.player_id)

    // Only track doubles matches where every participant is in the pool
    if (teamAIds.length !== 2 || teamBIds.length !== 2) continue
    if ([...teamAIds, ...teamBIds].some(id => !poolIds.has(id))) continue

    const key = makeSplitKey(teamAIds, teamBIds)

    // Track plays
    for (const id of [...teamAIds, ...teamBIds]) {
      playerPlayed.set(id, (playerPlayed.get(id) ?? 0) + 1)
    }

    // Track wins and per-split win record
    const aWon = teamADef.is_winner
    const bWon = teamBDef.is_winner
    if (aWon || bWon) {
      const winnerIds = aWon ? teamAIds : teamBIds
      for (const id of winnerIds) {
        playerWins.set(id, (playerWins.get(id) ?? 0) + 1)
      }

      const pairA = [...teamAIds].sort().join('+')
      const pairB = [...teamBIds].sort().join('+')
      const [pair1] = [pairA, pairB].sort()
      const winnerPair = aWon ? pairA : pairB

      const rec = splitRecord.get(key) ?? { team1Wins: 0, team2Wins: 0 }
      if (winnerPair === pair1) rec.team1Wins++
      else rec.team2Wins++
      splitRecord.set(key, rec)
    }

    // Advance cycle (only count splits that belong to the current pool)
    if (allSplitKeys.has(key)) {
      cycleUsedSplits.add(key)
      if (cycleUsedSplits.size >= totalPossible) cycleUsedSplits = new Set()
    }
  }

  return { splitRecord, cycleUsedSplits, playerWins, playerPlayed }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function friendlyDate(d: Date, locale: Locale, t: TFunction): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tom = new Date(today); tom.setDate(tom.getDate() + 1)
  const day0 = new Date(d); day0.setHours(0, 0, 0, 0)
  if (day0.getTime() === today.getTime()) return t('common.today')
  if (day0.getTime() === tom.getTime()) return t('common.tomorrow')
  return d.toLocaleDateString(LOCALE_TAG[locale], { weekday: 'short', month: 'short', day: 'numeric' })
}
function friendlyTime(d: Date, locale: Locale): string {
  return d.toLocaleTimeString(LOCALE_TAG[locale], { hour: 'numeric', minute: '2-digit' })
}
function roundedSoon(addMin: number): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + addMin)
  const m = d.getMinutes()
  d.setMinutes(Math.ceil(m / 15) * 15, 0, 0)
  return d
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface PlayerSlotProps {
  role: string
  player: Player | null | undefined
  isFirst: boolean
  onTap: () => void
  onClear: () => void
}

function PlayerSlot({ role, player, isFirst, onTap, onClear }: PlayerSlotProps) {
  const { t } = useI18n()
  const initials = player ? getInitials(player.name) : null

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--surface)',
        border: 'none',
        borderTop: isFirst ? 'none' : '1px solid var(--border)',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: 'var(--fg)',
        minHeight: 60,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: player ? 'var(--accent)' : 'var(--bg)',
          border: player ? 'none' : '1.5px dashed var(--border)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: player ? 'var(--surface)' : 'var(--muted)',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          fontWeight: 800,
        }}
      >
        {player ? initials : (
          <Plus style={{ width: 16, height: 16 }} />
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          marginBottom: 2,
        }}>
          {role}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-base)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: player ? 'var(--fg)' : 'var(--muted)',
        }}>
          {player ? formatShortPlayerName(player.name) : t('team.tapToAdd')}
        </div>
      </div>

      {/* Right action */}
      {player ? (
        <span
          role="button"
          aria-label={t('team.removePlayer', { name: player.name })}
          onClick={(e) => { e.stopPropagation(); onClear() }}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--bg)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X style={{ width: 12, height: 12 }} />
        </span>
      ) : (
        <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted)', flexShrink: 0 }} />
      )}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreateMatchPage() {
  const { locale, t } = useI18n()
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { data: allPlayers } = usePlayers()
  const { data: matches } = useMatches(sessionId)
  const { data: session } = useSession(sessionId)
  const { data: leagueTeams } = useLeagueTeams(sessionId)
  const { data: attendances } = useSessionAttendances(sessionId)
  const createMatch = useCreateMatch()

  const matchType   = useNewMatchStore(s => s.matchType)
  const teamA       = useNewMatchStore(s => s.teamA)
  const teamB       = useNewMatchStore(s => s.teamB)
  const mode        = useNewMatchStore(s => s.mode)
  const scheduledAt = useNewMatchStore(s => s.scheduledAt)
  const setMatchType   = useNewMatchStore(s => s.setMatchType)
  const setSlot        = useNewMatchStore(s => s.setSlot)
  const setMode        = useNewMatchStore(s => s.setMode)
  const setScheduledAt = useNewMatchStore(s => s.setScheduledAt)
  const reset          = useNewMatchStore(s => s.reset)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<{ team: 'A' | 'B'; index: number } | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [navStuck, setNavStuck] = useState(false)
  const [shuffleOpen, setShuffleOpen] = useState(false)
  const [shuffleSelectedIds, setShuffleSelectedIds] = useState<Set<string>>(new Set())
  // In-memory cycle state so consecutive shuffles step through all splits before repeating
  const [shuffleCycle, setShuffleCycle] = useState<Set<string> | null>(null)
  const [lastShufflePoolKey, setLastShufflePoolKey] = useState<string>('')

  // League team selection
  const isLeague = session?.type === 'league'
  const [leagueTeamA, setLeagueTeamA] = useState<string | null>(searchParams.get('teamA'))
  const [leagueTeamB, setLeagueTeamB] = useState<string | null>(searchParams.get('teamB'))

  const declinedPlayerIds = useMemo(() => {
    if (isLeague || !attendances?.length) return null
    const ids = attendances.filter(a => a.status === 'declined').map(a => a.player_id)
    return ids.length > 0 ? new Set<string>(ids) : null
  }, [isLeague, attendances])

  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset store on unmount so stale data doesn't bleed into the next open
  useEffect(() => () => reset(), [reset])

  // Sticky nav border
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setNavStuck(el.scrollTop > 4)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // League: auto-set match type from session config
  useEffect(() => {
    if (isLeague && session?.league_match_type && matchType !== session.league_match_type) {
      setMatchType(session.league_match_type)
    }
  }, [isLeague, session?.league_match_type, matchType, setMatchType])

  // League: auto-fill players when teams are selected and roster size matches requirement
  useEffect(() => {
    if (!isLeague || !leagueTeams) return
    const teamSize = getTeamSize(matchType)

    // Team A
    if (leagueTeamA && teamA.every((id) => id === null)) {
      const lt = leagueTeams.find((t) => t.id === leagueTeamA)
      if (lt && lt.players.length === teamSize) {
        lt.players.forEach((p, i) => setSlot('A', i, p.id))
      }
    }
    // Team B
    if (leagueTeamB && teamB.every((id) => id === null)) {
      const lt = leagueTeams.find((t) => t.id === leagueTeamB)
      if (lt && lt.players.length === teamSize) {
        lt.players.forEach((p, i) => setSlot('B', i, p.id))
      }
    }
  }, [isLeague, leagueTeams, leagueTeamA, leagueTeamB, matchType, teamA, teamB, setSlot])

  if (!sessionId) return null
  const sid = sessionId

  // ── Derived ─────────────────────────────────────────────────────────────────

  const availablePlayers = declinedPlayerIds
    ? allPlayers?.filter(p => !declinedPlayerIds.has(p.id))
    : allPlayers

  const teamSize = getTeamSize(matchType)
  const liveMatch = matches?.find(m => m.status === 'LIVE')
  const scheduledMatches = matches?.filter(m => m.status === 'SCHEDULED') ?? []
  const nextQueuePos = scheduledMatches.length + 1
  const matchNumber = (matches?.length ?? 0) + 1

  const allFilled = teamA.slice(0, teamSize).every(Boolean) && teamB.slice(0, teamSize).every(Boolean)

  const usedIds = new Set([
    ...teamA.filter(Boolean) as string[],
    ...teamB.filter(Boolean) as string[],
  ])

  // Slot role labels
  function slotRole(_team: 'A' | 'B', index: number): string {
    if (matchType === 'MIXED_DOUBLES') return index === 0 ? t('team.male') : t('team.female')
    if (teamSize === 1) return t('team.player')
    return t('team.playerIndex', { index: index + 1 })
  }

  // ── Shuffle picker ───────────────────────────────────────────────────────────

  function openShufflePicker() {
    setShuffleOpen(true)
  }

  function toggleShufflePlayer(id: string) {
    setShuffleSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function performShuffle(rawPool: Player[]) {
    const pool: ShufflePlayer[] = rawPool.map(p => ({ id: p.id, name: p.name }))
    if (pool.length < teamSize * 2) return
    if (teamSize === 2) {
      const { splitRecord, cycleUsedSplits: historyCycle, playerWins, playerPlayed } = buildSessionHistory(matches ?? [], pool)

      const poolKey = pool.map(p => p.id).sort().join(',')
      // On first shuffle or pool change: sync from history. Otherwise continue the in-memory cycle.
      const currentCycle = (shuffleCycle === null || poolKey !== lastShufflePoolKey)
        ? new Set(historyCycle)
        : shuffleCycle

      const result = generateNextMatch({ selectedPlayers: pool, splitRecord, cycleUsedSplits: currentCycle, playerWins, playerPlayed })

      // Advance the in-memory cycle
      const usedKey = makeSplitKey([result.team1[0].id, result.team1[1].id], [result.team2[0].id, result.team2[1].id])
      const nextCycle = new Set(currentCycle)
      nextCycle.add(usedKey)
      setShuffleCycle(nextCycle.size >= enumerateSplits(pool).length ? new Set() : nextCycle)
      setLastShufflePoolKey(poolKey)
      setSlot('A', 0, result.team1[0].id)
      setSlot('A', 1, result.team1[1].id)
      setSlot('B', 0, result.team2[0].id)
      setSlot('B', 1, result.team2[1].id)
    } else {
      const shuffled = [...pool]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      setSlot('A', 0, shuffled[0].id)
      setSlot('B', 0, shuffled[1].id)
    }
    setShuffleOpen(false)
  }

  function handleShuffleSelected() {
    if (!allPlayers) return
    performShuffle(allPlayers.filter(p => shuffleSelectedIds.has(p.id)))
  }

  function handleSelectAllShuffle() {
    if (!availablePlayers) return
    const allSelected = availablePlayers.every(p => shuffleSelectedIds.has(p.id))
    if (allSelected) {
      setShuffleSelectedIds(new Set())
    } else {
      setShuffleSelectedIds(new Set(availablePlayers.map(p => p.id)))
    }
  }

  // ── Player picker ────────────────────────────────────────────────────────────

  function openPicker(team: 'A' | 'B', index: number) {
    setPickerTarget({ team, index })
    setSearch('')
    setPickerOpen(true)
  }

  function pickPlayer(playerId: string) {
    if (!pickerTarget) return
    setSlot(pickerTarget.team, pickerTarget.index, playerId)
    setPickerOpen(false)
    setPickerTarget(null)
  }

  const filteredPlayers = availablePlayers?.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false

    // League: filter to team roster
    if (isLeague && pickerTarget) {
      const selectedTeamId = pickerTarget.team === 'A' ? leagueTeamA : leagueTeamB
      if (!selectedTeamId) return false
      const lt = leagueTeams?.find(t => t.id === selectedTeamId)
      if (!lt?.players.some(lp => lp.id === p.id)) return false
    }

    // Exclude already-used players except the current slot's player
    const currentSlotId = pickerTarget
      ? (pickerTarget.team === 'A' ? teamA[pickerTarget.index] : teamB[pickerTarget.index])
      : null
    if (usedIds.has(p.id) && p.id !== currentSlotId) return false
    return true
  }) ?? []

  // ── Scheduled-at helpers ─────────────────────────────────────────────────────

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const [y, mo, d] = e.target.value.split('-').map(Number)
    const base = scheduledAt ?? new Date()
    const next = new Date(base)
    next.setFullYear(y, mo - 1, d)
    setScheduledAt(next)
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const [hh, mm] = e.target.value.split(':').map(Number)
    const base = scheduledAt ?? new Date()
    const next = new Date(base)
    next.setHours(hh, mm, 0, 0)
    setScheduledAt(next)
  }

  function quickPick(addMin: number) {
    setScheduledAt(roundedSoon(addMin))
  }

  function handleSetMode(next: typeof mode) {
    if (next === 'schedule' && !scheduledAt) setScheduledAt(roundedSoon(30))
    setMode(next)
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleCreate() {
    setError('')
    if (!allFilled) return

    if (mode === 'now' && liveMatch) {
      setError(t('createMatch.finishLiveFirst'))
      return
    }

    const teamAIds = teamA.slice(0, teamSize) as string[]
    const teamBIds = teamB.slice(0, teamSize) as string[]

    try {
      await createMatch.mutateAsync({
        session_id: sid,
        match_type: matchType,
        played_at: mode === 'schedule' && scheduledAt ? scheduledAt.toISOString() : new Date().toISOString(),
        status: mode === 'now' ? 'LIVE' : 'SCHEDULED',
        queue_position: mode === 'queue' ? nextQueuePos : undefined,
        team_a_player_ids: teamAIds,
        team_b_player_ids: teamBIds,
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createMatch.failedCreate'))
    }
  }

  // ── CTA label ────────────────────────────────────────────────────────────────

  function ctaLabel(): string {
    if (!allFilled) return t('createMatch.pickPlayers')
    if (mode === 'now') return t('createMatch.startNow')
    if (mode === 'schedule' && scheduledAt) {
      return t('createMatch.scheduleCta', { date: friendlyDate(scheduledAt, locale, t), time: friendlyTime(scheduledAt, locale) })
    }
    if (mode === 'queue') return t('createMatch.addToQueue', { number: matchNumber })
    return t('createMatch.pickTime')
  }

  const ctaEnabled = allFilled && (mode === 'now' || mode === 'queue' || (mode === 'schedule' && !!scheduledAt))

  // ── Section label helper ─────────────────────────────────────────────────────

  function teamName(arr: (string | null)[], size: number): string {
    const names = arr.slice(0, size).filter(Boolean).map(id => formatShortPlayerName(allPlayers?.find(p => p.id === id)?.name ?? ''))
    if (!names.length) return t('team.pickPlayerCount', { count: size })
    return names.join(' + ')
  }

  const filledCount = teamA.slice(0, teamSize).filter(Boolean).length + teamB.slice(0, teamSize).filter(Boolean).length
  const totalSlots = teamSize * 2

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <AppBar
        title=""
        backLabel={t('common.cancel')}
        onBack={() => navigate(-1)}
        stuck={navStuck}
      />

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          paddingBottom: 'max(120px, calc(env(safe-area-inset-bottom) + 104px))',
        }}
      >
        {/* Large title */}
        <header style={{ padding: 'var(--space-3) var(--space-5) var(--space-6)' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: '-0.035em',
            marginBottom: 'var(--space-2)',
            color: 'var(--fg)',
          }}>
            {t('createMatch.title')}
          </h1>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            color: 'var(--muted)',
          }}>
            {t('common.session')} · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
              {session?.label ?? t('common.loadingEllipsis')}
            </span>
          </p>
        </header>

        {/* ── Section 1: Match type ─────────────────────────────────────── */}
        {!isLeague && (
          <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
              }}>
                {t('createMatch.matchType')}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {MATCH_TYPE_SHORT[matchType]} · {teamSize === 1 ? '1 v 1' : '2 v 2'}
              </span>
            </div>
            <MatchTypeChips value={matchType} onChange={(t) => setMatchType(t)} />
          </section>
        )}

        {/* League match type indicator */}
        {isLeague && session?.league_match_type && (
          <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
              }}>
                {t('createMatch.matchType')}
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: 'var(--fg)',
              }}>
                {MATCH_TYPE_SHORT[session.league_match_type]} · {teamSize === 1 ? '1 v 1' : '2 v 2'}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--muted)',
                marginLeft: 'auto',
              }}>
                League match
              </span>
            </div>
          </section>
        )}

        {/* League team selectors */}
        {isLeague && (
          <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
              }}>
                Teams
              </span>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}>
              {/* Team A selector */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3) var(--space-4)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--muted)',
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                }}>
                  {t('team.teamA')}
                </span>
                <select
                  value={leagueTeamA ?? ''}
                  onChange={(e) => {
                    setLeagueTeamA(e.target.value || null)
                    // Clear team A slots
                    for (let i = 0; i < teamSize; i++) setSlot('A', i, null)
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-base)',
                    color: 'var(--fg)',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                  }}
                >
                  <option value="">Select a team</option>
                  {leagueTeams?.filter(t => t.id !== leagueTeamB).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Team B selector */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3) var(--space-4)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--muted)',
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                }}>
                  {t('team.teamB')}
                </span>
                <select
                  value={leagueTeamB ?? ''}
                  onChange={(e) => {
                    setLeagueTeamB(e.target.value || null)
                    // Clear team B slots
                    for (let i = 0; i < teamSize; i++) setSlot('B', i, null)
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-base)',
                    color: 'var(--fg)',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                  }}
                >
                  <option value="">Select a team</option>
                  {leagueTeams?.filter(t => t.id !== leagueTeamA).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 2: Players ───────────────────────────────────────────── */}
        <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--muted)',
            }}>
              {t('createMatch.players')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: filledCount === totalSlots ? 'var(--accent)' : 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: filledCount === totalSlots ? 700 : 400,
              }}>
                {t('createMatch.selectedCount', { filled: filledCount, total: totalSlots })}
              </span>
              {teamSize === 2 && (
                <button
                  type="button"
                  onClick={openShufflePicker}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--accent)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    padding: '4px 6px',
                    minHeight: 32,
                    touchAction: 'manipulation',
                  }}
                  aria-label={t('shuffle.ariaLabel')}
                >
                  <Shuffle style={{ width: 13, height: 13 }} />
                  {t('shuffle.button')}
                </button>
              )}
            </div>
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {/* Team A header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--bg)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                {t('team.teamA')}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
                {teamName(teamA, teamSize)}
              </span>
            </div>

            {/* Team A slots */}
            {Array.from({ length: teamSize }).map((_, i) => (
              <PlayerSlot
                key={`A-${i}`}
                role={slotRole('A', i)}
                player={allPlayers?.find(p => p.id === teamA[i])}
                isFirst={i === 0}
                onTap={() => openPicker('A', i)}
                onClear={() => setSlot('A', i, null)}
              />
            ))}

            {/* VS divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--bg)',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--muted)' }}>
                {t('team.VS')}
              </span>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Team B header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--bg)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                {t('team.teamB')}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
                {teamName(teamB, teamSize)}
              </span>
            </div>

            {/* Team B slots */}
            {Array.from({ length: teamSize }).map((_, i) => (
              <PlayerSlot
                key={`B-${i}`}
                role={slotRole('B', i)}
                player={allPlayers?.find(p => p.id === teamB[i])}
                isFirst={i === 0}
                onTap={() => openPicker('B', i)}
                onClear={() => setSlot('B', i, null)}
              />
            ))}
          </div>
        </section>

        {/* ── Section 3: When ──────────────────────────────────────────────── */}
        <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--muted)',
            }}>
              {t('createMatch.when')}
            </span>
          </div>

          {/* Segmented control */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <SegmentedControl
              ariaLabel={t('createMatch.matchStartMode')}
              value={mode}
              onChange={handleSetMode}
              tabs={[
                { id: 'now' as const, label: t('createMatch.now'), icon: <Zap style={{ width: 13, height: 13 }} /> },
                { id: 'schedule' as const, label: t('createMatch.schedule'), icon: <Calendar style={{ width: 13, height: 13 }} /> },
                { id: 'queue' as const, label: t('createMatch.queue'), icon: <List style={{ width: 13, height: 13 }} /> },
              ]}
            />
          </div>

          {/* Now panel */}
          {mode === 'now' && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                <span
                  className="animate-pulse"
                  style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', fontWeight: 700, marginBottom: 2 }}>
                    {t('createMatch.startsImmediately')}
                  </div>
                  {liveMatch && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--danger)', marginTop: 4 }}>
                      {t('createMatch.liveAlreadyProgress')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schedule panel */}
          {mode === 'schedule' && scheduledAt && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              {/* Date row */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                borderBottom: '1px solid var(--border)',
                minHeight: 56,
                cursor: 'pointer',
                position: 'relative',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--fg)', fontSize: 'var(--text-base)', fontWeight: 500 }}>
                  <Calendar style={{ width: 18, height: 18, color: 'var(--muted)', flexShrink: 0 }} />
                  {t('createSession.date')}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {friendlyDate(scheduledAt, locale, t)}
                  <ChevronRight style={{ width: 14, height: 14, color: 'var(--muted)' }} />
                </span>
                <input
                  type="date"
                  value={toDateInput(scheduledAt)}
                  onChange={handleDateChange}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </label>

              {/* Time row */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                minHeight: 56,
                cursor: 'pointer',
                position: 'relative',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--fg)', fontSize: 'var(--text-base)', fontWeight: 500 }}>
                  <Zap style={{ width: 18, height: 18, color: 'var(--muted)', flexShrink: 0 }} />
                  {t('createSession.time')}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {friendlyTime(scheduledAt, locale)}
                  <ChevronRight style={{ width: 14, height: 14, color: 'var(--muted)' }} />
                </span>
                <input
                  type="time"
                  value={toTimeInput(scheduledAt)}
                  onChange={handleTimeChange}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </label>

              {/* Quick picks */}
              <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)', borderTop: '1px solid var(--border)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {[15, 30, 60].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => quickPick(min)}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: 'var(--fg)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                      padding: 'var(--space-2) var(--space-4)',
                      cursor: 'pointer',
                      minHeight: 36,
                      touchAction: 'manipulation',
                    }}
                  >
                    {min < 60 ? t('createMatch.inMinutes', { minutes: min }) : t('createMatch.in1Hr')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Queue panel */}
          {mode === 'queue' && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                {/* Stamp */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  flexShrink: 0,
                }}>
                  M{matchNumber}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: 2 }}>
                    {t('createMatch.positionInQueue')}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
                    {scheduledMatches.length > 0 ? t('createMatch.afterQueued', { count: scheduledMatches.length }) : t('createMatch.nextToPlay')}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--muted)', marginTop: 3 }}>
                    {t('createMatch.startsWhenCurrentEnds')}
                  </div>
                </div>
              </div>

              {/* Queue chain preview */}
              {liveMatch && (
                <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-3) var(--space-4) var(--space-4)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 'var(--space-2)' }}>
                    {t('createMatch.upNext')}
                  </div>
                  {/* Live match row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', fontSize: 'var(--text-sm)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent)', width: 24, letterSpacing: '0.06em' }}>
                      M{(matches?.indexOf(liveMatch) ?? 0) + 1}
                    </span>
                    <span style={{ flex: 1, color: 'var(--accent)', fontWeight: 700 }}>
                      {liveMatch.participants
                        .filter(p => p.team_id === liveMatch.teams.find(t => t.team_label === 'TEAM_A')?.id)
                        .map(p => formatShortPlayerName(p.player.name)).join(' + ')}
                      {' '}{t('team.vs')}{' '}
                      {liveMatch.participants
                        .filter(p => p.team_id === liveMatch.teams.find(t => t.team_label === 'TEAM_B')?.id)
                        .map(p => formatShortPlayerName(p.player.name)).join(' + ')}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
                      <span className="animate-pulse" style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} />
                      {t('common.live')}
                    </span>
                  </div>
                  {/* This match row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', fontSize: 'var(--text-sm)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent)', width: 24, letterSpacing: '0.06em' }}>
                      M{matchNumber}
                    </span>
                    <span style={{ flex: 1, color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                      {allFilled
                        ? `${teamA.slice(0, teamSize).map(id => formatShortPlayerName(allPlayers?.find(p => p.id === id)?.name ?? '')).join(' + ')} ${t('team.vs')} ${teamB.slice(0, teamSize).map(id => formatShortPlayerName(allPlayers?.find(p => p.id === id)?.name ?? '')).join(' + ')}`
                        : t('createMatch.thisMatch')}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
                      {t('common.next')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-5)' }}>
            <div style={{
              background: 'color-mix(in oklch, var(--danger) 10%, var(--surface))',
              border: '1px solid color-mix(in oklch, var(--danger) 30%, var(--border))',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3) var(--space-4)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--danger)',
              fontWeight: 600,
            }}>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        padding: `var(--space-3) var(--space-5) max(var(--space-4), calc(env(safe-area-inset-bottom) + var(--space-3)))`,
        background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
        backdropFilter: 'saturate(180%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        borderTop: '1px solid var(--border)',
        zIndex: 15,
      }}>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!ctaEnabled || createMatch.isPending}
          style={{
            width: '100%',
            padding: 'var(--space-4)',
            background: ctaEnabled ? 'var(--accent)' : 'var(--border)',
            color: ctaEnabled ? 'var(--surface)' : 'var(--muted)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            cursor: ctaEnabled ? 'pointer' : 'not-allowed',
            minHeight: 52,
            touchAction: 'manipulation',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            boxShadow: ctaEnabled
              ? '0 1px 2px oklch(0% 0 0 / 0.08), 0 6px 18px oklch(55% 0.20 30 / 0.22)'
              : 'none',
            transition: 'opacity 0.12s, transform 0.12s',
          }}
        >
          {createMatch.isPending && <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />}
          {createMatch.isPending ? t('common.creatingEllipsis') : ctaLabel()}
        </button>
      </div>

      {/* ── Shuffle picker bottom sheet ──────────────────────────────────── */}
      <BottomSheet open={shuffleOpen} onClose={() => setShuffleOpen(false)}>
        {/* Header */}
        <div style={{ padding: '0 var(--space-5) var(--space-3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ marginBottom: 'var(--space-1)' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
              }}>
                {t('shuffle.title')}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
              {shuffleSelectedIds.size === 0
                ? t('shuffle.selectPlayers')
                : t('shuffle.selectedCount', { count: shuffleSelectedIds.size })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSelectAllShuffle}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: 'var(--accent)',
              padding: 'var(--space-1) 0',
              touchAction: 'manipulation',
              flexShrink: 0,
            }}
          >
            {availablePlayers && availablePlayers.every(p => shuffleSelectedIds.has(p.id))
              ? t('shuffle.clearAll')
              : t('shuffle.selectAll')}
          </button>
        </div>

        {/* Player list */}
        <div style={{ overflowY: 'auto', maxHeight: '45vh', padding: '0 var(--space-5)' }}>
          {availablePlayers?.map(p => {
            const isSel = shuffleSelectedIds.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleShufflePlayer(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) 0',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  touchAction: 'manipulation',
                  minHeight: 44,
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `2px solid ${isSel ? 'var(--accent)' : 'var(--muted)'}`,
                  background: isSel ? 'var(--accent)' : 'transparent',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  transition: 'background 0.12s, border-color 0.12s',
                }}>
                  {isSel && (
                    <svg width="12" height="12" fill="none" viewBox="0 0 12 12" stroke="white" strokeWidth={2.5}>
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--fg)',
                }}>
                  {formatShortPlayerName(p.name)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Shuffle CTA */}
        <div style={{ padding: 'var(--space-4) var(--space-5) 0' }}>
          {(() => {
            const selCount = shuffleSelectedIds.size
            const needed = teamSize * 2
            const disabled = selCount < needed
            return (
              <button
                type="button"
                onClick={handleShuffleSelected}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-2)',
                  background: 'var(--accent)',
                  color: 'var(--surface)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 700,
                  border: '2px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  minHeight: 52,
                  touchAction: 'manipulation',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  opacity: disabled ? 0.35 : 1,
                }}
              >
                <Shuffle style={{ width: 15, height: 15 }} />
                {selCount >= needed
                  ? t('shuffle.selectedButton', { count: selCount })
                  : t('shuffle.needMore', { count: needed - selCount })}
              </button>
            )
          })()}
        </div>
      </BottomSheet>

      {/* ── Player picker bottom sheet ────────────────────────────────────── */}
      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div style={{ padding: '0 var(--space-5) var(--space-3)' }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}>
              {pickerTarget
                ? t('createMatch.pickSlot', { role: slotRole(pickerTarget.team, pickerTarget.index).toLowerCase(), team: pickerTarget.team })
                : t('createMatch.selectPlayer')}
            </span>
          </div>
          {/* Search */}
          <input
            type="text"
            placeholder={t('createMatch.searchPlayers')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
            style={{
              width: '100%',
              padding: 'var(--space-3) var(--space-4)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-base)',
              color: 'var(--fg)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              minHeight: 44,
            }}
          />
        </div>

        {/* Player list */}
        <div style={{ overflowY: 'auto', padding: `0 var(--space-5) max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-4)))` }}>
          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-7) var(--space-4)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
              {t('createMatch.noPlayerMatches')}
            </div>
          ) : filteredPlayers.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPlayer(p.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) 0',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottomColor: 'var(--border)',
                borderBottomWidth: 1,
                borderBottomStyle: 'solid',
                textAlign: 'left',
                fontFamily: 'inherit',
                color: 'var(--fg)',
                touchAction: 'manipulation',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'var(--fg)',
                color: 'var(--surface)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-sm)',
                fontWeight: 800,
                flexShrink: 0,
              }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  {formatShortPlayerName(p.name)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
