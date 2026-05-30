import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateSession, type CreateSessionInput } from '../hooks/useSessions'
import { useCreateLeagueTeam } from '../hooks/useLeagueTeams'
import { useCreateLeagueSchedule } from '../hooks/useMatches'
import { useNearbyBwfTournaments, type BwfTournament } from '../hooks/useBwfTournaments'
import { AppBar, Dialog, MatchTypeChips } from '../../design-system/components'
import { LOCALE_TAG, useI18n, type Locale, type TFunction } from '../i18n'
import SessionTypePicker from '../components/SessionTypePicker'
import LeagueTeamBuilder, { type LeagueTeamBuilderHandle, type LeagueTeamDraft } from '../components/LeagueTeamBuilder'
import type { SessionType, MatchType } from '../types/database'
import { getRequiredPlayersPerTeam } from '../types/database'
import { DuplicateTournamentError } from '../hooks/useSessions'
import { Shuffle } from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

function friendlyFull(d: Date, locale: Locale, t: TFunction): string {
  return `${friendlyDate(d, locale, t)} · ${friendlyTime(d, locale)}`
}

function roundedSoon(addMin: number): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + addMin)
  const m = d.getMinutes()
  d.setMinutes(Math.ceil(m / 15) * 15, 0, 0)
  return d
}

function formatDateRange(startDate: string, endDate: string, locale: Locale): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const startDay = start.getDate()
  const endDay = end.getDate()
  const month = start.toLocaleDateString(LOCALE_TAG[locale], { month: 'short' })
  const year = start.getFullYear()
  if (startDate === endDate) return `${month} ${startDay}, ${year}`
  return `${month} ${startDay}–${endDay}, ${year}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SuggestCardProps {
  index: number
  name: string
  tag: string
  isSelected: boolean
  onSelect: () => void
}

function SuggestCard({ index, name, tag, isSelected, onSelect }: SuggestCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      style={isSelected ? { borderWidth: 2, padding: '11px 15px' } : {}}
      className={`flex items-center gap-3 w-full min-h-[56px] px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] text-left transition-colors active:bg-[var(--bg)] ${isSelected ? 'border-[var(--accent)]' : ''}`}
    >
      <div
        className={`w-8 h-8 rounded-[var(--radius-md)] border flex-shrink-0 grid place-items-center font-[family:var(--font-display)] text-[var(--text-sm)] font-black transition-all ${
          isSelected
            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
            : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]'
        }`}
        style={{ fontSize: 13 }}
      >
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-[family:var(--font-display)] font-bold leading-tight tracking-[-0.01em] text-[var(--fg)]" style={{ fontSize: 15 }}>
          {name}
        </div>
        <div className="font-[family:var(--font-mono)] text-[var(--muted)] uppercase tracking-[0.06em] mt-0.5" style={{ fontSize: 11 }}>
          {tag}
        </div>
      </div>

      <div
        className={`w-[22px] h-[22px] rounded-full border flex-shrink-0 grid place-items-center transition-all ${
          isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)]'
        }`}
      >
        {isSelected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </button>
  )
}

function SuggestSkeleton() {
  return (
    <div className="flex items-center gap-3 w-full min-h-[56px] px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] animate-pulse">
      <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--border)] opacity-55 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-[var(--border)] rounded opacity-55" style={{ width: '65%' }} />
        <div className="h-2 bg-[var(--border)] rounded opacity-35" style={{ width: '40%' }} />
      </div>
      <div className="w-[22px] h-[22px] rounded-full bg-[var(--border)] opacity-55 flex-shrink-0" />
    </div>
  )
}

type StartMode = 'now' | 'schedule'

export default function CreateSessionPage() {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const createSession = useCreateSession()
  const createLeagueTeam = useCreateLeagueTeam()
  const createLeagueSchedule = useCreateLeagueSchedule()
  const { tournaments, isLoading: tournamentsLoading, refetch } = useNearbyBwfTournaments(7)

  const [sessionType, setSessionType] = useState<SessionType>('regular')

  // ── Name state
  const [selectedTournament, setSelectedTournament] = useState<BwfTournament | null>(null)
  const [customName, setCustomName] = useState('')
  const customInputRef = useRef<HTMLInputElement>(null)

  // ── League config
  const [leagueMatchType, setLeagueMatchType] = useState<MatchType>('MEN_DOUBLES')
  const leagueRounds: 1 | 2 = 2
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeamDraft[]>([
    { name: '', playerIds: [] },
    { name: '', playerIds: [] },
  ])
  const leagueTeamBuilderRef = useRef<LeagueTeamBuilderHandle>(null)

  // ── Time state
  const [mode, setMode] = useState<StartMode>('now')
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null)
  const [nowTime, setNowTime] = useState(new Date())

  // ── Nav scroll border
  const [navStuck, setNavStuck] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Dialog
  type DialogKind = 'duplicate' | 'error'
  const [dialog, setDialog] = useState<{ kind: DialogKind; message: string } | null>(null)

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNowTime(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  // Scroll listener for nav border
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = () => setNavStuck(el.scrollTop > 4)
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [])

  const goBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  // ── Derived state
  const resolvedName = sessionType === 'tournament'
    ? (selectedTournament?.name ?? '')
    : customName.trim()
  const resolvedTournamentId = sessionType === 'tournament' ? (selectedTournament?.id ?? null) : null
  // League validation
  const requiredPerTeam = getRequiredPlayersPerTeam(leagueMatchType)
  const leagueTeamsValid = leagueTeams.length >= 2 && leagueTeams.every(
    (t) => t.name.trim().length > 0 && t.playerIds.length === requiredPerTeam
  )
  const isConfigReady =
    resolvedName.length > 0 &&
    (mode === 'now' || scheduledAt !== null) &&
    (sessionType !== 'league' || leagueTeamsValid)

  function handleSelectTournament(t: BwfTournament) {
    setSelectedTournament(t)
    setCustomName('')
  }

  function handleCustomFocus() {
    setSelectedTournament(null)
  }

  function handleCustomInput(e: React.ChangeEvent<HTMLInputElement>) {
    setCustomName(e.target.value)
    if (e.target.value) setSelectedTournament(null)
  }

  function handleSetMode(next: StartMode) {
    setMode(next)
    if (next === 'schedule' && !scheduledAt) {
      setScheduledAt(roundedSoon(60))
    }
  }

  const handleSetScheduledAt = useCallback((d: Date) => {
    setScheduledAt(d)
  }, [])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const [y, m, day] = e.target.value.split('-').map(Number)
    const d = scheduledAt ? new Date(scheduledAt) : new Date()
    d.setFullYear(y, m - 1, day)
    handleSetScheduledAt(d)
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const [hh, mm] = e.target.value.split(':').map(Number)
    const d = scheduledAt ? new Date(scheduledAt) : new Date()
    d.setHours(hh, mm, 0, 0)
    handleSetScheduledAt(d)
  }

  function quickPick(addMin: number) {
    handleSetScheduledAt(roundedSoon(addMin))
  }

  function quickPickTomorrow() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(19, 0, 0, 0)
    handleSetScheduledAt(d)
  }

  function isQuickActive(key: '30' | '60' | 'tom'): boolean {
    if (!scheduledAt) return false
    const diffMin = Math.round((scheduledAt.getTime() - nowTime.getTime()) / 60_000)
    if (key === '30') return diffMin >= 25 && diffMin <= 40
    if (key === '60') return diffMin >= 55 && diffMin <= 70
    if (key === 'tom') {
      const t = new Date(nowTime); t.setDate(t.getDate() + 1)
      return (
        scheduledAt.getDate() === t.getDate() &&
        scheduledAt.getHours() === 19 &&
        scheduledAt.getMinutes() === 0
      )
    }
    return false
  }

  async function handleCreate() {
    setDialog(null)
    try {
      const input: CreateSessionInput = {
        type: sessionType,
        label: resolvedName,
        started_at: mode === 'schedule' && scheduledAt ? scheduledAt.toISOString() : undefined,
        bwf_tournament_id: sessionType === 'tournament' ? (resolvedTournamentId ?? undefined) : undefined,
      }

      if (sessionType === 'league') {
        input.league_match_type = leagueMatchType
        input.league_total_rounds = leagueRounds
      }

      const session = await createSession.mutateAsync(input)

      // Create league teams after session creation
      if (sessionType === 'league') {
        const createdTeams = await Promise.all(
          leagueTeams.map((team) =>
            createLeagueTeam.mutateAsync({
              sessionId: session.id,
              name: team.name,
              playerIds: team.playerIds,
            })
          )
        )

        await createLeagueSchedule.mutateAsync({
          session_id: session.id,
          match_type: leagueMatchType,
          total_rounds: leagueRounds,
          played_at: session.started_at,
          teams: createdTeams.map((team, index) => ({
            id: team.id,
            playerIds: leagueTeams[index]?.playerIds ?? [],
          })),
        })
      }

      navigate(`/sessions/${session.id}`, { replace: true })
    } catch (err) {
      if (err instanceof DuplicateTournamentError) {
        setDialog({ kind: 'duplicate', message: err.message })
      } else {
        setDialog({
          kind: 'error',
          message: err instanceof Error ? err.message : t('createSession.failedCreate'),
        })
      }
    }
  }

  // ── CTA state
  const isCtaEnabled = isConfigReady

  const ctaLabel = (() => {
    if (!resolvedName) return t('createSession.pickName')
    if (mode === 'schedule' && !scheduledAt) return t('createSession.pickTime')
    if (sessionType === 'league' && !leagueTeamsValid) return t('createSession.invalidTeam')
    if (sessionType === 'league') return t('createSession.createLeague')
    if (mode === 'now') return t('createSession.startNowCta')
    return t('createSession.scheduleFor', { datetime: scheduledAt ? friendlyFull(scheduledAt, locale, t) : '' })
  })()

  const isPending = createSession.isPending || createLeagueTeam.isPending || createLeagueSchedule.isPending

  // ── Back label
  const backLabel = t('common.cancel')

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      {/* ── Nav ── */}
      <AppBar
        title=""
        backLabel={backLabel}
        onBack={goBack}
        stuck={navStuck}
      />

      {/* ── Scroll area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(120px, calc(env(safe-area-inset-bottom) + 104px))' }}
      >
        {/* Large title */}
        <header className="px-6 pt-3 pb-8">
          <h1
            className="font-[family:var(--font-display)] font-black leading-none tracking-[-0.035em] text-[var(--fg)]"
            style={{ fontSize: 48 }}
          >
            {t('createSession.title')}
          </h1>
          <p className="font-[family:var(--font-mono)] text-[var(--muted)] mt-2" style={{ fontSize: 11 }}>
            {t('createSession.subtitle')}
          </p>
        </header>

        <section className="px-6 mb-8">
          <SessionTypePicker
            value={sessionType}
            onChange={(type) => {
              setSessionType(type)
              setSelectedTournament(null)
              setCustomName('')
            }}
          />
        </section>

        {/* Name / Tournament */}
        <section className="px-6 mb-12">
              {sessionType === 'tournament' ? (
                <>
                  <div className="flex items-baseline justify-between gap-3 mb-4">
                    <span
                      className="font-[family:var(--font-mono)] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"
                      style={{ fontSize: 11 }}
                    >
                      {t('createSession.tournamentSuggestions')}
                    </span>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="flex items-center gap-1 font-[family:var(--font-body)] text-[var(--accent)] font-semibold min-h-[32px] active:opacity-50 transition-opacity"
                      style={{ fontSize: 13 }}
                    >
                      <svg
                        className={tournamentsLoading ? 'animate-spin' : ''}
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <path d="M21 4v5h-5" />
                      </svg>
                      {tournamentsLoading ? t('common.loading') : t('common.refresh')}
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 mb-4" role="radiogroup" aria-label={t('createSession.tournamentSuggestions')}>
                    {tournamentsLoading ? (
                      <>
                        <SuggestSkeleton />
                        <SuggestSkeleton />
                        <SuggestSkeleton />
                      </>
                    ) : tournaments.length === 0 ? (
                      <p className="text-[var(--muted)] font-[family:var(--font-mono)]" style={{ fontSize: 13 }}>
                        {t('createSession.noTournaments')}
                      </p>
                    ) : (
                      tournaments.map((t, i) => (
                        <SuggestCard
                          key={`${t.categorySlug}-${t.startDate}`}
                          index={i}
                          name={t.name}
                          tag={`${t.categoryName} · ${formatDateRange(t.startDate, t.endDate, locale)}`}
                          isSelected={selectedTournament?.name === t.name && selectedTournament?.startDate === t.startDate}
                          onSelect={() => handleSelectTournament(t)}
                        />
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <span
                      className="font-[family:var(--font-mono)] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"
                      style={{ fontSize: 11 }}
                    >
                      {sessionType === 'league' ? t('createSession.leagueName') : t('createSession.sessionName')}
                    </span>
                  </div>
                  <input
                    ref={customInputRef}
                    type="text"
                    value={customName}
                    onFocus={handleCustomFocus}
                    onChange={handleCustomInput}
                    placeholder={t('createSession.customNamePlaceholder')}
                    maxLength={48}
                    autoComplete="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    className="w-full px-4 py-3 font-[family:var(--font-body)] text-[var(--fg)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] outline-none min-h-[48px] transition-colors placeholder:text-[var(--muted)] placeholder:opacity-55"
                    style={{ fontSize: 15, ...(customName ? { borderColor: 'var(--accent)', borderWidth: 2, padding: '11px 15px' } : {}) }}
                  />
                </>
              )}

        </section>

        {/* League-specific config */}
        {sessionType === 'league' && (
          <section className="px-6 mb-12">
                {/* Match type */}
                <div className="mb-4">
                  <span
                    className="font-[family:var(--font-mono)] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"
                    style={{ fontSize: 11 }}
                  >
                    {t('createSession.matchType')}
                  </span>
                </div>
                <div className="mb-8">
                  <MatchTypeChips value={leagueMatchType} onChange={setLeagueMatchType} />
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <span
                    className="font-[family:var(--font-mono)] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"
                    style={{ fontSize: 11 }}
                  >
                    {t('createSession.teams')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => leagueTeamBuilderRef.current?.openShufflePicker()}
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
                  </div>
                </div>
                <LeagueTeamBuilder
                  ref={leagueTeamBuilderRef}
                  teams={leagueTeams}
                  matchType={leagueMatchType}
                  onChange={setLeagueTeams}
                  showShuffleButton={false}
                />
          </section>
        )}

        {/* ── Section: Start Time ── */}
        <section className="px-6 mb-12">
              <div className="mb-4">
                <span
                  className="font-[family:var(--font-mono)] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"
                  style={{ fontSize: 11 }}
                >
                  {t('createSession.startTime')}
                </span>
              </div>

              {/* Segmented control */}
              <div
                className="grid grid-cols-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[3px] relative mb-4"
                role="tablist"
                aria-label={t('createSession.startTimeMode')}
              >
                <div
                  className="absolute top-[3px] bottom-[3px] bg-[var(--fg)] rounded-[6px] transition-transform duration-250"
                  style={{
                    width: 'calc(50% - 3px)',
                    transform: mode === 'schedule' ? 'translateX(100%)' : 'translateX(0)',
                    transitionTimingFunction: 'cubic-bezier(0.32,0,0.15,1)',
                  }}
                  aria-hidden
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'now'}
                  onClick={() => handleSetMode('now')}
                  className={`relative z-10 flex items-center justify-center gap-2 font-[family:var(--font-body)] font-semibold min-h-[40px] transition-colors ${mode === 'now' ? 'text-[var(--surface)]' : 'text-[var(--muted)]'}`}
                  style={{ fontSize: 13 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 3 4 14 12 14 11 21 20 10 12 10 13 3" />
                  </svg>
                  {t('createSession.startNow')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'schedule'}
                  onClick={() => handleSetMode('schedule')}
                  className={`relative z-10 flex items-center justify-center gap-2 font-[family:var(--font-body)] font-semibold min-h-[40px] transition-colors ${mode === 'schedule' ? 'text-[var(--surface)]' : 'text-[var(--muted)]'}`}
                  style={{ fontSize: 13 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {t('createSession.schedule')}
                </button>
              </div>

              {/* Now panel */}
              <div
                className="overflow-hidden transition-all"
                style={{
                  display: 'grid',
                  gridTemplateRows: mode === 'now' ? '1fr' : '0fr',
                  transition: 'grid-template-rows 280ms cubic-bezier(0.32,0,0.15,1)',
                }}
              >
                <div className="overflow-hidden">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
                    <div className="flex items-center gap-3 p-4">
                      <span
                        className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0 animate-pulse"
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-[family:var(--font-mono)] text-[var(--accent)] font-bold uppercase tracking-[0.08em] mb-0.5"
                          style={{ fontSize: 11 }}
                        >
                          {t('createSession.startingMoment')}
                        </div>
                        <div
                          className="font-[family:var(--font-display)] font-black leading-tight tracking-[-0.02em] text-[var(--fg)]"
                          style={{ fontSize: 24, fontFeatureSettings: '"tnum" 1' }}
                        >
                          {friendlyTime(nowTime, locale)}
                        </div>
                        <div className="font-[family:var(--font-mono)] text-[var(--muted)] mt-0.5" style={{ fontSize: 11 }}>
                          {t('common.today')} · {nowTime.toLocaleDateString(LOCALE_TAG[locale], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule panel */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: mode === 'schedule' ? '1fr' : '0fr',
                  transition: 'grid-template-rows 280ms cubic-bezier(0.32,0,0.15,1)',
                }}
              >
                <div className="overflow-hidden">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
                    <label
                      className="flex items-center justify-between gap-3 px-4 min-h-[56px] border-b border-[var(--border)] active:bg-[var(--bg)] transition-colors relative cursor-pointer"
                      htmlFor="schedDate"
                    >
                      <span className="flex items-center gap-3 text-[var(--fg)] font-medium" style={{ fontSize: 15 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {t('createSession.date')}
                      </span>
                      <span className="flex items-center gap-2 font-[family:var(--font-display)] font-bold text-[var(--accent)]" style={{ fontSize: 15, fontFeatureSettings: '"tnum" 1' }}>
                        {scheduledAt ? friendlyDate(scheduledAt, locale, t) : t('common.today')}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                      <input
                        id="schedDate"
                        type="date"
                        value={scheduledAt ? toDateInput(scheduledAt) : toDateInput(new Date())}
                        onChange={handleDateChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        style={{ WebkitAppearance: 'none' }}
                      />
                    </label>

                    <label
                      className="flex items-center justify-between gap-3 px-4 min-h-[56px] active:bg-[var(--bg)] transition-colors relative cursor-pointer"
                      htmlFor="schedTime"
                    >
                      <span className="flex items-center gap-3 text-[var(--fg)] font-medium" style={{ fontSize: 15 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {t('createSession.time')}
                      </span>
                      <span className="flex items-center gap-2 font-[family:var(--font-display)] font-bold text-[var(--accent)]" style={{ fontSize: 15, fontFeatureSettings: '"tnum" 1' }}>
                        {scheduledAt ? friendlyTime(scheduledAt, locale) : '8:00 PM'}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                      <input
                        id="schedTime"
                        type="time"
                        value={scheduledAt ? toTimeInput(scheduledAt) : '20:00'}
                        onChange={handleTimeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        style={{ WebkitAppearance: 'none' }}
                      />
                    </label>
                  </div>

                  <div className="flex gap-2 flex-wrap mt-3">
                    {(
                      [
                        { key: '30' as const, label: t('createSession.in30Min'), action: () => quickPick(30) },
                        { key: '60' as const, label: t('createSession.in1Hr'),   action: () => quickPick(60) },
                        { key: 'tom' as const, label: t('createSession.tomorrow7'), action: quickPickTomorrow },
                      ] as const
                    ).map(({ key, label, action }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={action}
                        className={`font-[family:var(--font-body)] font-semibold border rounded-full min-h-[36px] px-4 transition-all active:bg-[var(--bg)] ${
                          isQuickActive(key)
                            ? 'bg-[var(--fg)] text-[var(--surface)] border-[var(--fg)]'
                            : 'bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]'
                        }`}
                        style={{ fontSize: 13, fontFeatureSettings: '"tnum" 1' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
        </section>
      </div>

      {/* ── Bottom CTA ── */}
      <div
        className="sticky bottom-0 left-0 right-0 border-t border-[var(--border)] z-15"
        style={{
          padding: `12px 24px max(16px, calc(env(safe-area-inset-bottom) + 12px))`,
          background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
          backdropFilter: 'saturate(180%) blur(12px)',
          WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        }}
      >
        <button
          type="button"
          onClick={handleCreate}
          disabled={!isCtaEnabled || isPending}
          className={`w-full font-[family:var(--font-body)] font-bold border-none rounded-[var(--radius-lg)] min-h-[52px] flex items-center justify-center gap-2 transition-all active:scale-[0.985] active:opacity-90 ${
            isCtaEnabled && !isPending
              ? 'bg-[var(--accent)] text-[var(--surface)] cursor-pointer'
              : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'
          }`}
          style={{
            fontSize: 15,
            letterSpacing: '0.005em',
            boxShadow: isCtaEnabled && !isPending
              ? '0 1px 2px oklch(0% 0 0 / 0.08), 0 6px 18px oklch(55% 0.20 30 / 0.22)'
              : 'none',
          }}
        >
          {isPending ? (
            <>
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
              </svg>
              {t('common.creatingEllipsis')}
            </>
          ) : (
            <>
              {ctaLabel}
              {isCtaEnabled && (
                <span className="font-[family:var(--font-mono)] opacity-70 ml-1" style={{ fontSize: 11 }}>→</span>
              )}
            </>
          )}
        </button>
      </div>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        kind={dialog?.kind === 'duplicate' ? 'warning' : 'danger'}
        title={dialog?.kind === 'duplicate' ? t('createSession.duplicateTitle') : t('createSession.failedCreate')}
        description={
          dialog?.kind === 'duplicate'
            ? t('createSession.duplicateDescription')
            : (dialog?.message ?? '')
        }
      />
    </div>
  )
}
