import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'
import { useMatches, useCreateMatch } from '../hooks/useMatches'
import { useSession } from '../hooks/useSessions'
import { useLeagueTeams } from '../hooks/useLeagueTeams'
import { useSessionAttendances } from '../hooks/useSessionAttendances'
import { useNewMatchStore } from '../stores/new-match-store'
import { AppBar, SectionLabel } from '../../design-system/components'
import { MatchTypeChips } from '../../design-system/components/match-type-chips'
import { getTeamSize, MATCH_TYPE_SHORT } from '../lib/match-helpers'
import { Loader2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { PlayerSlotsCard } from '../components/match-create/PlayerSlotsCard'
import { WhenPanel } from '../components/match-create/WhenPanel'
import { LeagueTeamSelectors } from '../components/match-create/LeagueTeamSelectors'
import { ShufflePickerSheet, type ShuffleResult } from '../components/match-create/ShufflePickerSheet'
import { PlayerPickerSheet } from '../components/match-create/PlayerPickerSheet'
import { friendlyDate, friendlyTime } from '../components/match-create/helpers'

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

    if (leagueTeamA && teamA.every((id) => id === null)) {
      const lt = leagueTeams.find((team) => team.id === leagueTeamA)
      if (lt && lt.players.length === teamSize) {
        lt.players.forEach((p, i) => setSlot('A', i, p.id))
      }
    }
    if (leagueTeamB && teamB.every((id) => id === null)) {
      const lt = leagueTeams.find((team) => team.id === leagueTeamB)
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
  const filledCount = teamA.slice(0, teamSize).filter(Boolean).length + teamB.slice(0, teamSize).filter(Boolean).length
  const totalSlots = teamSize * 2

  const usedIds = new Set([
    ...teamA.filter(Boolean) as string[],
    ...teamB.filter(Boolean) as string[],
  ])

  function slotRole(index: number): string {
    if (matchType === 'MIXED_DOUBLES') return index === 0 ? t('team.male') : t('team.female')
    if (teamSize === 1) return t('team.player')
    return t('team.playerIndex', { index: index + 1 })
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
      const lt = leagueTeams?.find(team => team.id === selectedTeamId)
      if (!lt?.players.some(lp => lp.id === p.id)) return false
    }

    // Exclude already-used players except the current slot's player
    const currentSlotId = pickerTarget
      ? (pickerTarget.team === 'A' ? teamA[pickerTarget.index] : teamB[pickerTarget.index])
      : null
    if (usedIds.has(p.id) && p.id !== currentSlotId) return false
    return true
  }) ?? []

  // ── League team selection ──────────────────────────────────────────────────

  function selectLeagueTeam(side: 'A' | 'B', id: string) {
    if (side === 'A') setLeagueTeamA(id)
    else setLeagueTeamB(id)
    for (let i = 0; i < teamSize; i++) setSlot(side, i, null)
  }

  // ── Shuffle ────────────────────────────────────────────────────────────────

  function applyShuffleResult(result: ShuffleResult) {
    result.teamA.forEach((id, i) => setSlot('A', i, id))
    result.teamB.forEach((id, i) => setSlot('B', i, id))
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

  // ── Two-line CTA ───────────────────────────────────────────────────────────

  function ctaContent(): { primary: string; secondary?: string } {
    if (!allFilled) {
      const remaining = totalSlots - filledCount
      return {
        primary: remaining > 0
          ? t('createMatch.pickMorePlayers', { count: remaining })
          : t('createMatch.pickPlayers'),
      }
    }
    if (mode === 'now') return { primary: t('createMatch.startNow') }
    if (mode === 'schedule') {
      if (!scheduledAt) return { primary: t('createMatch.pickTime') }
      return {
        primary: t('createMatch.ctaSchedule'),
        secondary: `${friendlyDate(scheduledAt, locale, t)} · ${friendlyTime(scheduledAt, locale)}`,
      }
    }
    return { primary: t('createMatch.ctaQueue'), secondary: `M${matchNumber}` }
  }

  const ctaEnabled = allFilled && (mode === 'now' || mode === 'queue' || (mode === 'schedule' && !!scheduledAt))
  const cta = ctaContent()

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
            <SectionLabel
              className="mb-[var(--space-4)]"
              action={
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {MATCH_TYPE_SHORT[matchType]} · {teamSize === 1 ? '1 v 1' : '2 v 2'}
                </span>
              }
            >
              {t('createMatch.matchType')}
            </SectionLabel>
            <MatchTypeChips value={matchType} onChange={(type) => setMatchType(type)} />
          </section>
        )}

        {/* League match type indicator */}
        {isLeague && session?.league_match_type && (
          <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
            <SectionLabel className="mb-[var(--space-3)]">{t('createMatch.matchType')}</SectionLabel>
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
                {t('createMatch.leagueMatch')}
              </span>
            </div>
          </section>
        )}

        {/* League team selectors */}
        {isLeague && (
          <LeagueTeamSelectors
            leagueTeams={leagueTeams}
            leagueTeamA={leagueTeamA}
            leagueTeamB={leagueTeamB}
            onSelectTeamA={(id) => selectLeagueTeam('A', id)}
            onSelectTeamB={(id) => selectLeagueTeam('B', id)}
          />
        )}

        {/* ── Section 2: Players ───────────────────────────────────────────── */}
        <PlayerSlotsCard
          matchType={matchType}
          teamSize={teamSize}
          teamA={teamA}
          teamB={teamB}
          allPlayers={allPlayers}
          onOpenPicker={openPicker}
          onClearSlot={(team, i) => setSlot(team, i, null)}
          onShuffle={() => setShuffleOpen(true)}
        />

        {/* ── Section 3: When ──────────────────────────────────────────────── */}
        <WhenPanel
          mode={mode}
          onModeChange={setMode}
          scheduledAt={scheduledAt}
          onScheduledAtChange={setScheduledAt}
          liveMatch={liveMatch}
          matches={matches}
          scheduledMatchesCount={scheduledMatches.length}
          matchNumber={matchNumber}
          allFilled={allFilled}
          teamA={teamA}
          teamB={teamB}
          teamSize={teamSize}
          allPlayers={allPlayers}
        />

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
            padding: 'var(--space-3) var(--space-4)',
            background: ctaEnabled ? 'var(--accent)' : 'var(--border)',
            color: ctaEnabled ? 'var(--surface)' : 'var(--muted)',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            cursor: ctaEnabled ? 'pointer' : 'not-allowed',
            minHeight: 56,
            touchAction: 'manipulation',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            boxShadow: ctaEnabled
              ? '0 1px 2px oklch(0% 0 0 / 0.08), 0 6px 18px oklch(55% 0.20 30 / 0.22)'
              : 'none',
            transition: 'opacity 0.12s, transform 0.12s',
          }}
        >
          {createMatch.isPending ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-base)' }}>
              <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
              {t('common.creatingEllipsis')}
            </span>
          ) : (
            <>
              <span style={{ fontSize: 'var(--text-base)', lineHeight: 1.1 }}>{cta.primary}</span>
              {cta.secondary && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  opacity: 0.85,
                  letterSpacing: '0.02em',
                }}>
                  {cta.secondary}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* ── Shuffle picker bottom sheet ──────────────────────────────────── */}
      <ShufflePickerSheet
        open={shuffleOpen}
        onClose={() => setShuffleOpen(false)}
        availablePlayers={availablePlayers}
        matches={matches}
        teamSize={teamSize}
        onResult={applyShuffleResult}
      />

      {/* ── Player picker bottom sheet ────────────────────────────────────── */}
      <PlayerPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={pickerTarget
          ? t('createMatch.pickSlot', { role: slotRole(pickerTarget.index).toLowerCase(), team: pickerTarget.team })
          : t('createMatch.selectPlayer')}
        players={filteredPlayers}
        search={search}
        onSearchChange={setSearch}
        onPick={pickPlayer}
      />
    </div>
  )
}
