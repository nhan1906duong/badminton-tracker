import { Zap, Calendar, List, ChevronRight } from 'lucide-react'
import { SegmentedControl, SectionLabel } from '../../../design-system/components'
import { formatShortPlayerName } from '../../lib/player-name'
import { useI18n } from '../../i18n'
import type { CreateMatchMode } from '../../stores/new-match-store'
import type { MatchWithDetails, Player } from '../../types/database'
import { toDateInput, toTimeInput, friendlyDate, friendlyTime, roundedSoon } from './helpers'

interface WhenPanelProps {
  mode: CreateMatchMode
  onModeChange: (mode: CreateMatchMode) => void
  scheduledAt: Date | null
  onScheduledAtChange: (date: Date) => void
  liveMatch?: MatchWithDetails
  matches?: MatchWithDetails[]
  scheduledMatchesCount: number
  matchNumber: number
  allFilled: boolean
  teamA: (string | null)[]
  teamB: (string | null)[]
  teamSize: number
  allPlayers?: Player[]
}

export function WhenPanel({
  mode,
  onModeChange,
  scheduledAt,
  onScheduledAtChange,
  liveMatch,
  matches,
  scheduledMatchesCount,
  matchNumber,
  allFilled,
  teamA,
  teamB,
  teamSize,
  allPlayers,
}: WhenPanelProps) {
  const { locale, t } = useI18n()

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const [y, mo, d] = e.target.value.split('-').map(Number)
    const next = new Date(scheduledAt ?? new Date())
    next.setFullYear(y, mo - 1, d)
    onScheduledAtChange(next)
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const [hh, mm] = e.target.value.split(':').map(Number)
    const next = new Date(scheduledAt ?? new Date())
    next.setHours(hh, mm, 0, 0)
    onScheduledAtChange(next)
  }

  function handleSetMode(next: CreateMatchMode) {
    if (next === 'schedule' && !scheduledAt) onScheduledAtChange(roundedSoon(30))
    onModeChange(next)
  }

  function teamLine(arr: (string | null)[]): string {
    return arr.slice(0, teamSize)
      .map(id => formatShortPlayerName(allPlayers?.find(p => p.id === id)?.name ?? ''))
      .join(' + ')
  }

  return (
    <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
      <SectionLabel className="mb-[var(--space-4)]">{t('createMatch.when')}</SectionLabel>

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
                onClick={() => onScheduledAtChange(roundedSoon(min))}
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
                {scheduledMatchesCount > 0 ? t('createMatch.afterQueued', { count: scheduledMatchesCount }) : t('createMatch.nextToPlay')}
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
                    ? `${teamLine(teamA)} ${t('team.vs')} ${teamLine(teamB)}`
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
  )
}
