import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useSessions } from '../hooks/useSessions'
import { useSessionLeaderboards } from '../hooks/useRankings'
import { useMatches } from '../hooks/useMatches'
import { BwfCategoryBadge } from '../../design-system/components/bwf-category-badge'
import { Avatar } from '../../design-system/components/avatar'
import { getSessionStatus, formatSessionDuration } from '../lib/session-format'
import { useI18n, LOCALE_TAG } from '../i18n'
import type { Session } from '../types/database'

// Must match --tl-col / --tl-avatar in the design
const TL_COL = 60
const TL_AVATAR = 36
const SIDE_PAD = 24 // var(--space-5)
const SPINE_LEFT = SIDE_PAD + TL_COL / 2 - 1 // centred under avatar

function getDisplayName(session: Session, localeTag: string): string {
  if (session.label) return session.label
  if (session.type === 'tournament' && session.bwf_tournaments) {
    return session.bwf_tournaments.category_name
  }
  return new Date(session.started_at).toLocaleDateString(localeTag, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

interface DayGroup { dayKey: string; sessions: Session[] }
interface MonthGroup { monthKey: string; days: DayGroup[]; sessionCount: number }

const DOT = (
  <span
    aria-hidden="true"
    style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }}
  />
)

export function CalendarTab() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const { data: sessions } = useSessions()
  const { data: leaderboards } = useSessionLeaderboards()
  const { data: allMatches } = useMatches()
  const localeTag = LOCALE_TAG[locale]

  const completed = useMemo(
    () => (sessions ?? []).filter(s => getSessionStatus(s) === 'completed'),
    [sessions]
  )

  const matchCountBySession = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of allMatches ?? []) {
      if (m.status === 'COMPLETED') map.set(m.session_id, (map.get(m.session_id) ?? 0) + 1)
    }
    return map
  }, [allMatches])

  const groups = useMemo<MonthGroup[]>(() => {
    const monthMap = new Map<string, Map<string, Session[]>>()
    for (const session of completed) {
      const date = new Date(session.started_at)
      const monthKey = date.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' }).toUpperCase()
      const dow = date.toLocaleDateString(localeTag, { weekday: 'short' }).toUpperCase()
      const dm = date.toLocaleDateString(localeTag, { day: 'numeric', month: 'short' }).toUpperCase()
      const dayKey = `${dow} · ${dm}`
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map())
      const dayMap = monthMap.get(monthKey)!
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, [])
      dayMap.get(dayKey)!.push(session)
    }
    return Array.from(monthMap.entries()).map(([monthKey, dayMap]) => ({
      monthKey,
      days: Array.from(dayMap.entries()).map(([dayKey, sessions]) => ({ dayKey, sessions })),
      sessionCount: Array.from(dayMap.values()).reduce((sum, s) => sum + s.length, 0),
    }))
  }, [completed, localeTag])

  if (!completed.length) {
    return (
      <div
        className="py-[var(--space-8)] text-center text-[14px]"
        style={{ color: 'var(--muted)', padding: `var(--space-8) ${SIDE_PAD}px` }}
      >
        {t('calendar.noSessions')}
      </div>
    )
  }

  return (
    <div className="relative" style={{ padding: `0 ${SIDE_PAD}px var(--space-8)` }}>
      {/* Continuous spine */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 18,
          bottom: 28,
          left: SPINE_LEFT,
          width: 2,
          background: 'var(--border)',
          pointerEvents: 'none',
        }}
      />

      {groups.map((group, gi) => (
        <div key={group.monthKey}>

          {/* ── Month header ── */}
          <div
            className="relative flex items-center gap-3"
            style={{
              padding: `${gi === 0 ? 'var(--space-2)' : 'var(--space-5)'} 0 var(--space-3)`,
              zIndex: 2,
            }}
          >
            <span
              className="text-[13px] font-extrabold uppercase tracking-[0.02em] flex-shrink-0"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)', background: 'var(--bg)', paddingRight: 'var(--space-3)' }}
            >
              {group.monthKey}
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span
              className="text-[11px] font-bold flex-shrink-0"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', background: 'var(--bg)', paddingLeft: 'var(--space-3)' }}
            >
              {group.sessionCount} sessions
            </span>
          </div>

          {group.days.map(({ dayKey, sessions: daySessions }) => (
            <div key={dayKey}>

              {/* ── Day header ── */}
              <div
                className="relative grid items-center"
                style={{
                  gridTemplateColumns: `${TL_COL}px 1fr`,
                  columnGap: 'var(--space-4)',
                  padding: 'var(--space-4) 0 var(--space-2)',
                  zIndex: 2,
                }}
              >
                {/* Diamond node */}
                <div style={{ justifySelf: 'center' }}>
                  <div
                    style={{
                      width: 11,
                      height: 11,
                      background: 'var(--bg)',
                      border: '2px solid var(--muted)',
                      transform: 'rotate(45deg)',
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-bold uppercase"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: '0.12em' }}
                >
                  {dayKey}
                </span>
              </div>

              {/* ── Session entries ── */}
              {daySessions.map((session) => {
                const leaderboard = leaderboards?.get(session.id)
                const champion = leaderboard?.leader
                const playerCount = leaderboard?.rankings.length ?? 0
                const matchCount = matchCountBySession.get(session.id) ?? 0
                const duration = formatSessionDuration(session.started_at, session.ended_at, locale)
                const name = getDisplayName(session, localeTag)
                const winRate = champion && champion.matchesPlayed > 0
                  ? Math.round((champion.wins / champion.matchesPlayed) * 100)
                  : null

                return (
                  <div
                    key={session.id}
                    className="relative grid items-start cursor-pointer"
                    style={{
                      gridTemplateColumns: `${TL_COL}px 1fr`,
                      columnGap: 'var(--space-4)',
                      padding: 'var(--space-2) 0',
                      zIndex: 2,
                    }}
                    onClick={() => navigate(`/sessions/${session.id}`, { state: { from: '/sessions' } })}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/sessions/${session.id}`, { state: { from: '/sessions' } })
                      }
                    }}
                  >
                    {/* Champion avatar = timeline node */}
                    <div style={{ justifySelf: 'center', position: 'relative' }}>
                      {champion ? (
                        <div style={{ borderRadius: '50%', boxShadow: '0 0 0 5px var(--bg)', overflow: 'hidden', flexShrink: 0, display: 'inline-flex' }}>
                          <Avatar
                            src={champion.avatarUrl}
                            name={champion.name}
                            size={TL_AVATAR}
                            className="!rounded-full"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: TL_AVATAR,
                            height: TL_AVATAR,
                            background: 'var(--border)',
                            borderRadius: '50%',
                            boxShadow: '0 0 0 5px var(--bg)',
                          }}
                        />
                      )}
                    </div>

                    {/* Session card */}
                    <article
                      className="min-w-0"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-4)',
                      }}
                    >
                      {/* Name + BWF tier badge */}
                      <div className="flex items-start gap-3">
                        <h3
                          className="flex-1 font-extrabold leading-snug"
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 18,
                            letterSpacing: '-0.02em',
                            color: 'var(--fg)',
                            textWrap: 'balance',
                          } as React.CSSProperties}
                        >
                          {name}
                        </h3>
                        {session.bwf_tournaments && (
                          <div className="flex-shrink-0 mt-0.5">
                            <BwfCategoryBadge
                              categoryName={session.bwf_tournaments.category_name}
                              categorySlug={session.bwf_tournaments.category_slug}
                            />
                          </div>
                        )}
                      </div>

                      {/* Meta row */}
                      {(matchCount > 0 || playerCount > 0) && (
                        <div
                          className="flex items-center flex-wrap gap-2 mt-3"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}
                        >
                          {matchCount > 0 && (
                            <span><b style={{ color: 'var(--fg)', fontWeight: 600 }}>{matchCount}</b> matches</span>
                          )}
                          {matchCount > 0 && duration && <>{DOT}<span>{duration}</span></>}
                          {playerCount > 0 && (
                            <>{DOT}<span><b style={{ color: 'var(--fg)', fontWeight: 600 }}>{playerCount}</b> players</span></>
                          )}
                        </div>
                      )}

                      {/* Champion footer */}
                      {champion && (
                        <div
                          className="flex items-center gap-3 mt-3 pt-3"
                          style={{ borderTop: '1px solid var(--border)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <div
                              className="flex items-center gap-1 font-bold uppercase"
                              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.1em' }}
                            >
                              <Trophy style={{ width: 11, height: 11 }} />
                              Champion
                            </div>
                            <div
                              className="font-bold truncate"
                              style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--fg)', lineHeight: 1.2, marginTop: 3 }}
                            >
                              {champion.name}
                            </div>
                          </div>
                          {winRate !== null && (
                            <div className="flex-shrink-0 text-right">
                              <div
                                className="font-extrabold leading-none"
                                style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}
                              >
                                {winRate}%
                              </div>
                              <div
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em', marginTop: 3 }}
                              >
                                {champion.wins}W · {champion.losses}L
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ))}

      {/* Timeline end cap */}
      <div
        className="relative grid items-center"
        style={{ gridTemplateColumns: `${TL_COL}px 1fr`, columnGap: 'var(--space-4)', padding: 'var(--space-4) 0 var(--space-2)', zIndex: 2 }}
      >
        <div style={{ justifySelf: 'center', width: 7, height: 7, background: 'var(--border)', borderRadius: '50%' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
          Start of recorded history
        </span>
      </div>
    </div>
  )
}
