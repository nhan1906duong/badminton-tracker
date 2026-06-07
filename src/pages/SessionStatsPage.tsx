import { useMemo, useCallback, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Activity, ChevronLeft, Medal, Crown, LineChart } from 'lucide-react'
import { AppBar, Avatar, Badge, BottomSheet, BottomSheetCancel, EmptyState, StatRow, PullToRefresh, SegmentedControl } from '../../design-system/components'
import { ShuttleLoading } from '../components/ShuttleLoading'
import { useMatches } from '../hooks/useMatches'
import { useSession } from '../hooks/useSessions'
import { useSessionLeaderboard, useSessionMatchResults, computeSessionRankingHistory, type SessionWeeklyStats } from '../hooks/useRankings'
import { SessionRankingChart } from '../components/SessionRankingChart'
import { useI18n } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { FireworkEffect } from '../components/firework-effect'
import PlayerRecordLine from '../components/PlayerRecordLine'

const MATCH_TYPE_SHORT: Record<string, string> = {
  MEN_SINGLES: 'MS', WOMEN_SINGLES: 'WS',
  MEN_DOUBLES: 'MD', WOMEN_DOUBLES: 'WD', MIXED_DOUBLES: 'XD',
}

function formatShortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return name
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

function SessionRank({ rank }: { rank: number }) {
  const { t } = useI18n()
  const isFirst = rank === 1
  const color =
    isFirst ? 'var(--accent)'
    : rank === 2 ? 'color-mix(in oklch, var(--accent) 70%, var(--muted))'
    : rank === 3 ? 'color-mix(in oklch, var(--accent) 45%, var(--muted))'
    : 'var(--muted)'

  return (
    <div
      aria-label={t('common.rank', { rank })}
      style={{
        width: 36,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 900,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color,
      }}
    >
      {isFirst && (
        <Crown size={14} fill="var(--accent)" stroke="var(--accent)" />
      )}
      <span>{rank}</span>
    </div>
  )
}

interface PlayerStatsRowProps {
  stat: SessionWeeklyStats
  rank: number
  isLast: boolean
  onClick: () => void
}

function PlayerStatsRow({ stat, rank, isLast, onClick }: PlayerStatsRowProps) {
  const { t } = useI18n()
  const winRate = stat.matchesPlayed > 0 ? Math.round((stat.wins / stat.matchesPlayed) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="active:opacity-60"
      style={{
        width: '100%',
        minHeight: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <SessionRank rank={rank} />
      <Avatar src={stat.avatarUrl} name={stat.name} size={36} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
          }}
        >
          <span
            style={{
              minWidth: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 800,
              lineHeight: 1.4,
              letterSpacing: 0,
              color: 'var(--fg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {stat.name}
          </span>
          {rank === 1 && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent)',
              }}
            >
              {t('sessionStats.championBadge')}
            </span>
          )}
        </div>
        <PlayerRecordLine
          matchesPlayed={stat.matchesPlayed}
          wins={stat.wins}
          losses={stat.losses}
          winRate={winRate}
          fontSize="var(--text-xs)"
          marginTop={3}
          extra={`${formatSigned(stat.pointDifference)} ${t('sessionStats.diff')}`}
        />
      </div>

      <div
        style={{
          minWidth: 64,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0,
          }}
        >
          {stat.weeklyPoints}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
          }}
        >
          {t('sessionStats.points')}
        </span>
      </div>
    </button>
  )
}

type StatsTab = 'rankings' | 'chart'

export default function SessionStatsPage() {
  const { t } = useI18n()
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: session } = useSession(sessionId)
  const { data: matches, isLoading: matchesLoading, refetch: refetchMatches } = useMatches(sessionId)
  const { data: leaderboard, isLoading: rankingsLoading, refetch: refetchRankings } = useSessionLeaderboard(sessionId)
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const rankings = useMemo(() => leaderboard?.rankings ?? [], [leaderboard])

  const completedMatches = useMemo(
    () => matches?.filter((m) => m.status === 'COMPLETED' && m.teams.some((t) => t.is_winner)) ?? [],
    [matches]
  )

  const { data: matchResults } = useSessionMatchResults(sessionId)

  const rankingHistories = useMemo(() => {
    if (!matches || !matchResults || rankings.length === 0) return []
    const players = rankings.map(r => ({ id: r.playerId, name: r.name, avatar_url: r.avatarUrl }))
    return computeSessionRankingHistory(matches, matchResults, players)
  }, [matches, matchResults, rankings])

  const [activeTab, setActiveTab] = useState<StatsTab>('rankings')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const selectedStat = useMemo(
    () => rankings.find(r => r.playerId === selectedPlayerId) ?? null,
    [rankings, selectedPlayerId]
  )

  const playerMatchEntries = useMemo(() => {
    if (!selectedPlayerId || !matches || !matchResults) return []
    const resultMap = new Map(
      matchResults
        .filter(r => r.player_id === selectedPlayerId)
        .map(r => [r.match_id, r])
    )
    return matches
      .filter(m =>
        m.status === 'COMPLETED' &&
        m.teams.some(t => t.is_winner) &&
        m.participants.some(p => p.player_id === selectedPlayerId) &&
        resultMap.has(m.id)
      )
      .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())
      .map(match => {
        const result = resultMap.get(match.id)!
        const pp = match.participants.find(p => p.player_id === selectedPlayerId)!
        const playerTeam = match.teams.find(t => t.id === pp.team_id)!
        const isTeamA = playerTeam.team_label === 'TEAM_A'
        const teammates = match.participants
          .filter(p => p.team_id === pp.team_id && p.player_id !== selectedPlayerId)
          .map(p => formatShortName(p.player.name))
        const opponents = match.participants
          .filter(p => p.team_id !== pp.team_id)
          .map(p => formatShortName(p.player.name))
        const scoreStr = match.scores
          .map(s => {
            const my = isTeamA ? s.team_a_score : s.team_b_score
            const opp = isTeamA ? s.team_b_score : s.team_a_score
            return `${my}–${opp}`
          })
          .join(', ')
        return {
          matchId: match.id,
          type: MATCH_TYPE_SHORT[match.match_type] ?? '—',
          teammates: teammates.join(' & '),
          opponents: opponents.join(' & '),
          scoreStr: scoreStr || '—',
          isWin: playerTeam.is_winner,
          points: result.total_weekly_points,
        }
      })
  }, [selectedPlayerId, matches, matchResults])
  const statsTabs = [
    { id: 'rankings' as StatsTab, label: t('sessionStats.tabRankings') },
    { id: 'chart' as StatsTab, label: t('sessionStats.tabChart'), icon: <LineChart size={13} /> },
  ]

  const totalPoints = rankings.reduce((sum, s) => sum + s.weeklyPoints, 0)
  const averagePoints = rankings.length > 0 ? Math.round(totalPoints / rankings.length) : 0
  const isLoading = matchesLoading || rankingsLoading

  // Champion detection: rank #1 in an ended session, matching current user's linked player
  const isChampion = useMemo(() => {
    if (!session?.ended_at || rankings.length === 0) return false
    if (!profile?.player_id) return false
    return rankings[0]?.playerId === profile.player_id
  }, [session?.ended_at, rankings, profile?.player_id])

  // Show firework once per session+player via localStorage
  const storageKey = sessionId && profile?.player_id
    ? `champion-firework:${sessionId}:${profile.player_id}`
    : ''

  const [dismissedFireworkKey, setDismissedFireworkKey] = useState<string | null>(null)

  const hasShownFirework = useMemo(() => {
    if (!storageKey || dismissedFireworkKey === storageKey) return true
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return true
    }
  }, [dismissedFireworkKey, storageKey])

  const shouldShowFirework = isChampion && !hasShownFirework

  useEffect(() => {
    if (!shouldShowFirework) return
    const timer = setTimeout(() => {
      try {
        if (storageKey) localStorage.setItem(storageKey, '1')
      } catch {
        // ignore
      }
      setDismissedFireworkKey(storageKey)
    }, 4000)
    return () => clearTimeout(timer)
  }, [shouldShowFirework, storageKey])

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchMatches(), refetchRankings()])
  }, [refetchMatches, refetchRankings])

  if (!sessionId) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] px-[var(--space-5)] py-[var(--space-5)]">
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>{t('sessionDetail.notFound')}</p>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      {shouldShowFirework && <FireworkEffect />}

      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft className="w-5 h-5 -ml-1" />,
          onClick: () => navigate(`/sessions/${sessionId}`),
        }}
      />

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))' }}
      >
        <header style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)' }}>
          <div
            className="inline-flex items-center gap-[var(--space-2)]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
              marginBottom: 'var(--space-3)',
            }}
          >
            <Activity size={14} aria-hidden="true" />
            {t('sessionStats.eyebrow')}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: 0,
              color: 'var(--fg)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {t('sessionStats.title')}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--muted)',
            }}
          >
            {session?.label ?? t('common.session')} · {t('units.completedMatches', { count: completedMatches.length })}
          </p>
          {isChampion && (
            <div
              className="inline-flex items-center gap-[var(--space-2)] mt-[var(--space-3)]"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                border: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Crown size={16} fill="var(--accent)" stroke="var(--accent)" />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 800,
                  color: 'var(--accent)',
                }}
              >
                {t('sessionStats.champion')}
              </span>
            </div>
          )}
          {session && !session.ended_at && (
            <div
              className="inline-flex items-center gap-[var(--space-2)] mt-[var(--space-2)]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--accent)',
              }}
            >
              <span
                className="rounded-full animate-pulse flex-shrink-0"
                style={{ width: 7, height: 7, background: 'var(--accent)' }}
              />
              {t('common.liveInProgress')}
            </div>
          )}
        </header>

        <main className="px-[var(--space-5)]">
          {isLoading ? (
            <ShuttleLoading compact />
          ) : rankings.length === 0 ? (
            <EmptyState
              icon={<Medal className="w-10 h-10 mx-auto" />}
              title={t('sessionStats.emptyTitle')}
              description={t('sessionStats.emptyDescription')}
            />
          ) : (
            <>
              <section
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0 var(--space-4)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <StatRow label={t('sessionStats.completedMatches')} value={completedMatches.length} />
                <StatRow label={t('sessionStats.rankedPlayers')} value={rankings.length} />
                <StatRow label={t('sessionStats.averagePoints')} value={averagePoints} />
              </section>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <SegmentedControl
                  tabs={statsTabs}
                  value={activeTab}
                  onChange={setActiveTab}
                />
              </div>

              {activeTab === 'rankings' && (
                <section>
                  <div className="flex items-baseline justify-between gap-[var(--space-3)] mb-[var(--space-3)]">
                    <h2
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--text-xl)',
                        fontWeight: 900,
                        lineHeight: 1.1,
                        letterSpacing: 0,
                        color: 'var(--fg)',
                      }}
                    >
                      {t('sessionStats.ranking')}
                    </h2>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--muted)',
                      }}
                    >
                      {t('sessionStats.weeklyPoints')}
                    </span>
                  </div>
                  <div>
                    {rankings.map((stat, index) => (
                      <PlayerStatsRow
                        key={stat.playerId}
                        stat={stat}
                        rank={index + 1}
                        isLast={index === rankings.length - 1}
                        onClick={() => setSelectedPlayerId(stat.playerId)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'chart' && (
                <section
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                  }}
                >
                  {rankingHistories.length > 0 && completedMatches.length > 0 ? (
                    <SessionRankingChart
                      histories={rankingHistories}
                      totalMatches={completedMatches.length}
                    />
                  ) : (
                    <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-6) 0' }}>
                      {t('sessionStats.emptyDescription')}
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
      <BottomSheet open={!!selectedPlayerId} onClose={() => setSelectedPlayerId(null)}>
        {selectedStat && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '0 var(--space-3) var(--space-4)' }}>
              <Avatar src={selectedStat.avatarUrl} name={selectedStat.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedStat.name}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {selectedStat.weeklyPoints} {t('sessionStats.points')} · {t('units.match', { count: selectedStat.matchesPlayed })}
                </div>
              </div>
            </div>

            <div style={{ margin: '0 calc(-1 * var(--space-3))', maxHeight: '52vh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {playerMatchEntries.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-5)' }}>
                  {t('sessionStats.emptyDescription')}
                </p>
              ) : playerMatchEntries.map((entry, idx) => (
                <div
                  key={entry.matchId}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: idx === playerMatchEntries.length - 1 ? 'none' : '1px solid var(--border)' }}
                >
                  <Badge variant={entry.isWin ? 'win' : 'loss'}>
                    {entry.isWin ? 'W' : 'L'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] truncate" style={{ color: 'var(--fg)' }}>
                      {entry.teammates
                        ? t('players.withOpponent', { teammates: entry.teammates, opponents: entry.opponents || '—' })
                        : t('players.vsOpponent', { opponents: entry.opponents || '—' })}
                    </p>
                    <p className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                      {entry.scoreStr}
                    </p>
                  </div>
                  <span
                    className="shrink-0"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    +{entry.points}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        <BottomSheetCancel onClick={() => setSelectedPlayerId(null)} />
      </BottomSheet>
    </div>
    </PullToRefresh>
  )
}
