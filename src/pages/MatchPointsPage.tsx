import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, TrendingUp } from 'lucide-react'
import { AppBar, Avatar } from '../../design-system/components'
import { useMatch } from '../hooks/useMatches'
import { useMatchPlayerResults } from '../hooks/useMatchPlayerResults'
import { useI18n } from '../i18n'
import { formatShortPlayerName } from '../lib/player-name'
import { teamAvgRating } from '../lib/rating'
import type { Player, PlayerMatchResult } from '../types/database'

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}


interface PlayerPointRowProps {
  player: Player
  result: PlayerMatchResult
  isLast: boolean
}

function PlayerPointRow({ player, result, isLast }: PlayerPointRowProps) {
  const { t } = useI18n()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        minHeight: 72,
      }}
    >
      <Avatar src={player.avatar_url} name={player.name} size={36} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            color: 'var(--fg)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {formatShortPlayerName(player.name)}
        </div>
        {/* Numbers */}
        <div
          style={{
            marginTop: 3,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {t('matchPoints.breakdown', {
            base: result.base_points,
            att: result.attendance_points,
            score: result.score_bonus,
            str: result.strength_bonus,
          })}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 3,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 900,
            lineHeight: 1,
            color: result.is_winner ? 'var(--accent)' : 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {result.total_weekly_points}
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
          {t('matchPoints.pts')}
        </span>
      </div>

      {result.rating_delta != null && result.rating_delta !== 0 && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: result.rating_delta > 0 ? 'var(--accent)' : 'var(--muted)',
            letterSpacing: '0.04em',
            minWidth: 44,
            justifyContent: 'flex-end',
          }}
        >
          <TrendingUp size={11} aria-hidden />
          {formatSigned(result.rating_delta)}
        </div>
      )}
    </div>
  )
}

interface MatchContextCardProps {
  teamAPlayers: Player[]
  teamBPlayers: Player[]
  teamAScore: number
  teamBScore: number
  teamAWins: boolean
  teamBWins: boolean
  results: PlayerMatchResult[]
}

function MatchContextCard({ teamAPlayers, teamBPlayers, teamAScore, teamBScore, teamAWins, teamBWins, results }: MatchContextCardProps) {
  const { t } = useI18n()

  const aRating = Math.round(teamAvgRating(teamAPlayers.map(p => p.rating)))
  const bRating = Math.round(teamAvgRating(teamBPlayers.map(p => p.rating)))

  // Winner/loser team labels for context
  const winnerTeam = teamAWins ? 'A' : teamBWins ? 'B' : null
  const winnerRating = teamAWins ? aRating : bRating
  const loserRating = teamAWins ? bRating : aRating
  const gap = loserRating - winnerRating // positive = winner was weaker (upset)

  const winnerScore = teamAWins ? teamAScore : teamBScore
  const loserScore = teamAWins ? teamBScore : teamAScore
  const margin = winnerScore - loserScore

  // Pull bonuses from any winner/loser result row
  const winnerResult = results.find(r => r.is_winner)
  const loserResult = results.find(r => !r.is_winner)

  const strongerTeam = gap > 100 ? (teamAWins ? t('team.teamB') : t('team.teamA'))
    : gap < -100 ? (teamAWins ? t('team.teamA') : t('team.teamB'))
    : null

  const strGapLabel = strongerTeam
    ? t('matchPoints.teamStronger', { team: strongerTeam, gap: Math.abs(gap) })
    : t('matchPoints.teamsEqual')

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--bg)',
    borderRadius: 'var(--radius-md)',
    marginTop: 'var(--space-2)',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'var(--accent)',
  }

  const infoStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.04em',
  }

  const bonusStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--fg)',
    textAlign: 'right' as const,
    letterSpacing: '0.04em',
    flexShrink: 0,
  }

  return (
    <section style={{ marginBottom: 'var(--space-5)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>

      {/* Team ratings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <div>
          <div style={labelStyle}>{t('team.teamA')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: teamAWins ? 'var(--accent)' : 'var(--fg)', marginTop: 2 }}>{aRating}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--border)', letterSpacing: '0.12em' }}>VS</div>
        <div style={{ textAlign: 'right' }}>
          <div style={labelStyle}>{t('team.teamB')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: teamBWins ? 'var(--accent)' : 'var(--fg)', marginTop: 2 }}>{bRating}</div>
        </div>
      </div>

      {/* Strength row */}
      {winnerTeam && winnerResult && loserResult && (
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>{t('matchPoints.contextStrength')}</div>
            <div style={{ ...infoStyle, marginTop: 2 }}>{strGapLabel}</div>
          </div>
          <div style={bonusStyle}>
            <div style={{ color: 'var(--accent)' }}>{t('matchPoints.winnerBonus', { bonus: winnerResult.strength_bonus })}</div>
            <div style={{ color: loserResult.strength_bonus < 0 ? 'var(--danger, #e44)' : 'var(--muted)' }}>
              {t('matchPoints.loserAdjust', { adjust: loserResult.strength_bonus > 0 ? `+${loserResult.strength_bonus}` : String(loserResult.strength_bonus) })}
            </div>
          </div>
        </div>
      )}

      {/* Score row */}
      {winnerTeam && winnerResult && loserResult && (
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>{t('matchPoints.contextScore')}</div>
            <div style={{ ...infoStyle, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {winnerScore} — {loserScore} · {t('matchPoints.scoreMargin', { margin })}
            </div>
          </div>
          <div style={bonusStyle}>
            <div style={{ color: 'var(--accent)' }}>{t('matchPoints.winnerBonus', { bonus: winnerResult.score_bonus })}</div>
            <div style={{ color: 'var(--muted)' }}>{t('matchPoints.loserAdjust', { adjust: `+${loserResult.score_bonus}` })} ({t('matchPoints.scoreLoss', { score: loserScore })})</div>
          </div>
        </div>
      )}
    </section>
  )
}

interface TeamSectionProps {
  label: string
  score: number
  opponentScore: number
  isWinner: boolean
  players: Player[]
  results: PlayerMatchResult[]
}

function TeamSection({ label, score, opponentScore, isWinner, players, results }: TeamSectionProps) {
  const { t } = useI18n()
  return (
    <section style={{ marginBottom: 'var(--space-5)' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
          padding: '0 var(--space-1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-base)',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: 'var(--fg)',
            }}
          >
            {label}
          </span>
          {isWinner && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--accent)',
                border: '1.5px solid var(--accent)',
                padding: '2px 7px 1px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-soft)',
              }}
            >
              {t('matchPoints.winner')}
            </span>
          )}
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            color: isWinner ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          {score}
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--border)',
              margin: '0 4px',
              fontWeight: 600,
            }}
          >
            :
          </span>
          {opponentScore}
        </span>
      </div>

      {/* Player rows */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {players.map((player, i) => {
          const result = results.find(r => r.player_id === player.id)
          if (!result) return null
          return (
            <PlayerPointRow
              key={player.id}
              player={player}
              result={result}
              isLast={i === players.length - 1}
            />
          )
        })}
      </div>
    </section>
  )
}

export default function MatchPointsPage() {
  const { t } = useI18n()
  const { matchId } = useParams<{ id: string; matchId: string }>()
  const navigate = useNavigate()

  const { data: match, isLoading: matchLoading } = useMatch(matchId ?? '')
  const { data: results, isLoading: resultsLoading } = useMatchPlayerResults(matchId ?? '')

  if (matchLoading || resultsLoading) {
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

  const teamA = match.teams.find(t => t.team_label === 'TEAM_A')
  const teamB = match.teams.find(t => t.team_label === 'TEAM_B')
  const teamAWins = teamA?.is_winner ?? false
  const teamBWins = teamB?.is_winner ?? false

  const teamAPlayers = match.participants.filter(p => p.team_id === teamA?.id).map(p => p.player)
  const teamBPlayers = match.participants.filter(p => p.team_id === teamB?.id).map(p => p.player)

  const score = match.scores[0]
  const teamAScore = score?.team_a_score ?? 0
  const teamBScore = score?.team_b_score ?? 0

  const hasResults = results && results.length > 0

  // Show winner team first
  const sections = (teamAWins ? [
    { label: t('team.teamA'), score: teamAScore, oppScore: teamBScore, isWinner: true, players: teamAPlayers },
    { label: t('team.teamB'), score: teamBScore, oppScore: teamAScore, isWinner: false, players: teamBPlayers },
  ] : teamBWins ? [
    { label: t('team.teamB'), score: teamBScore, oppScore: teamAScore, isWinner: true, players: teamBPlayers },
    { label: t('team.teamA'), score: teamAScore, oppScore: teamBScore, isWinner: false, players: teamAPlayers },
  ] : [
    { label: t('team.teamA'), score: teamAScore, oppScore: teamBScore, isWinner: false, players: teamAPlayers },
    { label: t('team.teamB'), score: teamBScore, oppScore: teamAScore, isWinner: false, players: teamBPlayers },
  ])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft style={{ width: 18, height: 18 }} />,
          onClick: () => navigate(-1),
        }}
      />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))',
        }}
      >
        {/* Header */}
        <header style={{ padding: 'var(--space-3) var(--space-5) var(--space-5)' }}>
          <div
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
            {t('matchPoints.eyebrow')}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.035em',
              color: 'var(--fg)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {t('matchPoints.title')}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--muted)',
            }}
          >
            {t('matchPoints.formulaHint')}
          </p>
        </header>

        <main style={{ padding: '0 var(--space-5)' }}>
          {!hasResults ? (
            <div
              style={{
                padding: 'var(--space-8) var(--space-4)',
                textAlign: 'center',
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              {t('matchPoints.noData')}
            </div>
          ) : (
            <>
              <MatchContextCard
                teamAPlayers={teamAPlayers}
                teamBPlayers={teamBPlayers}
                teamAScore={teamAScore}
                teamBScore={teamBScore}
                teamAWins={teamAWins}
                teamBWins={teamBWins}
                results={results ?? []}
              />
              {sections.map(s => (
                <TeamSection
                  key={s.label}
                  label={s.label}
                  score={s.score}
                  opponentScore={s.oppScore}
                  isWinner={s.isWinner}
                  players={s.players}
                  results={results ?? []}
                />
              ))}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
