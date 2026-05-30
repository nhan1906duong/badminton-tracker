import { useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { MatchType } from '../types/database'
import { getRequiredPlayersPerTeam } from '../types/database'
import { usePlayers } from '../hooks/usePlayers'
import { useI18n } from '../i18n'
import { BottomSheet } from '../../design-system/components'
import { formatShortPlayerName } from '../lib/player-name'
import { generateVietnameseTeamName, type TeamNameOptions } from '../lib/team-name-generator'
import { Plus, X, ChevronRight, Shuffle } from 'lucide-react'

export interface LeagueTeamDraft {
  name: string
  playerIds: string[]
}

interface LeagueTeamBuilderProps {
  teams: LeagueTeamDraft[]
  matchType: MatchType
  onChange: (teams: LeagueTeamDraft[]) => void
  showShuffleButton?: boolean
}

export interface LeagueTeamBuilderHandle {
  openShufflePicker: () => void
}

const MAX_TEAMS = 4

const LeagueTeamBuilder = forwardRef<LeagueTeamBuilderHandle, LeagueTeamBuilderProps>(function LeagueTeamBuilder(
  { teams, matchType, onChange, showShuffleButton = true },
  ref,
) {
  const { t } = useI18n()
  const { data: allPlayers } = usePlayers()
  const requiredPerTeam = getRequiredPlayersPerTeam(matchType)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTeamIndex, setPickerTeamIndex] = useState<number | null>(null)
  const [shuffleOpen, setShuffleOpen] = useState(false)
  const [shuffleSelectedIds, setShuffleSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const addTeam = useCallback(() => {
    if (teams.length >= MAX_TEAMS) return
    onChange([...teams, { name: '', playerIds: [] }])
  }, [teams, onChange])

  const removeTeam = useCallback((index: number) => {
    onChange(teams.filter((_, i) => i !== index))
  }, [teams, onChange])

  const updateTeamName = useCallback((index: number, name: string) => {
    const next = teams.map((t, i) => (i === index ? { ...t, name } : t))
    onChange(next)
  }, [teams, onChange])

  const openPlayerPicker = useCallback((teamIndex: number) => {
    setPickerTeamIndex(teamIndex)
    setSearch('')
    setPickerOpen(true)
  }, [])

  const addPlayerToTeam = useCallback((playerId: string) => {
    if (pickerTeamIndex === null) return
    const next = teams.map((team, i) => {
      if (i !== pickerTeamIndex) return team
      if (team.playerIds.includes(playerId)) return team
      if (team.playerIds.length >= requiredPerTeam) return team
      return { ...team, playerIds: [...team.playerIds, playerId] }
    })
    onChange(next)
    setPickerOpen(false)
    setPickerTeamIndex(null)
  }, [pickerTeamIndex, requiredPerTeam, teams, onChange])

  const removePlayerFromTeam = useCallback((teamIndex: number, playerId: string) => {
    const next = teams.map((team, i) => {
      if (i !== teamIndex) return team
      return { ...team, playerIds: team.playerIds.filter((id) => id !== playerId) }
    })
    onChange(next)
  }, [teams, onChange])

  const buildRandomTeamNames = useCallback(() => {
    const usedNames = new Set<string>()
    const styles: Array<NonNullable<TeamNameOptions['style']>> = ['sport', 'fun', 'power', 'location']
    return teams.map(() => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const style = styles[Math.floor(Math.random() * styles.length)]
        const name = generateVietnameseTeamName({ style })
        if (!usedNames.has(name)) {
          usedNames.add(name)
          return name
        }
      }

      const style = styles[Math.floor(Math.random() * styles.length)]
      const fallback = `${generateVietnameseTeamName({ style })} ${usedNames.size + 1}`
      usedNames.add(fallback)
      return fallback
    })
  }, [teams])

  const shuffleTeams = useCallback((playerIds: string[]) => {
    if (!allPlayers) return
    const needed = teams.length * requiredPerTeam
    if (playerIds.length < needed) return

    const selectedPlayers = allPlayers.filter((player) => playerIds.includes(player.id))
    const shuffled = [...selectedPlayers]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const teamNames = buildRandomTeamNames()
    onChange(teams.map((team, index) => ({
      ...team,
      name: teamNames[index],
      playerIds: shuffled
        .slice(index * requiredPerTeam, (index + 1) * requiredPerTeam)
        .map((player) => player.id),
    })))
  }, [allPlayers, buildRandomTeamNames, onChange, requiredPerTeam, teams])

  const openShufflePicker = useCallback(() => {
    setShuffleOpen(true)
  }, [])

  useImperativeHandle(ref, () => ({ openShufflePicker }), [openShufflePicker])

  const toggleShufflePlayer = useCallback((playerId: string) => {
    setShuffleSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }, [])

  const handleSelectAllShuffle = useCallback(() => {
    if (!allPlayers) return
    setShuffleSelectedIds((prev) => {
      const allSelected = allPlayers.every((player) => prev.has(player.id))
      return allSelected ? new Set() : new Set(allPlayers.map((player) => player.id))
    })
  }, [allPlayers])

  const handleShuffleSelected = useCallback(() => {
    shuffleTeams([...shuffleSelectedIds])
    setShuffleOpen(false)
  }, [shuffleSelectedIds, shuffleTeams])

  const isTeamValid = (team: LeagueTeamDraft) =>
    team.name.trim().length > 0 && team.playerIds.length === requiredPerTeam

  const allTeamsValid = teams.length >= 2 && teams.every(isTeamValid)

  // Players already assigned to any team
  const usedPlayerIds = new Set(teams.flatMap((t) => t.playerIds))

  const filteredPlayers = allPlayers?.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    // Show all players (can be on multiple teams in v1)
    return true
  }) ?? []
  const canShuffle = (allPlayers?.length ?? 0) >= teams.length * requiredPerTeam
  const neededShufflePlayers = teams.length * requiredPerTeam
  const canShuffleSelected = shuffleSelectedIds.size >= neededShufflePlayers

  return (
    <div className="flex flex-col gap-4">
      {showShuffleButton && (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={openShufflePicker}
          disabled={!canShuffle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--accent)',
            background: 'transparent',
            border: 'none',
            cursor: canShuffle ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            padding: '4px 6px',
            minHeight: 32,
            touchAction: 'manipulation',
            opacity: canShuffle ? 1 : 0.5,
          }}
          aria-label={t('shuffle.ariaLabel')}
        >
          <Shuffle style={{ width: 13, height: 13 }} />
          {t('shuffle.button')}
        </button>
      </div>
      )}

      {teams.map((team, index) => (
        <div
          key={index}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden"
        >
          {/* Team header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg)] border-b border-[var(--border)]">
            <span
              className="font-[family:var(--font-mono)] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"
              style={{ fontSize: 11 }}
            >
              {t('team.teamLabel', { team: index + 1 })}
            </span>
            {teams.length > 2 && (
              <button
                type="button"
                onClick={() => removeTeam(index)}
                className="ml-auto text-[var(--muted)] active:text-[var(--danger)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Team name input */}
          <div className="px-4 py-3">
            <input
              type="text"
              value={team.name}
              onChange={(e) => updateTeamName(index, e.target.value)}
              placeholder={t('createSession.teamNamePlaceholder')}
              className="w-full px-3 py-2 font-[family:var(--font-body)] text-[var(--fg)] bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-md)] outline-none transition-colors placeholder:text-[var(--muted)] placeholder:opacity-55"
              style={{ fontSize: 14 }}
            />
          </div>

          {/* Players */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-[family:var(--font-mono)] text-[var(--muted)]" style={{ fontSize: 11 }}>
                {t('createSession.needsPlayers', { count: requiredPerTeam })}
                {' · '}
                {team.playerIds.length}/{requiredPerTeam}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {team.playerIds.map((pid) => {
                const player = allPlayers?.find((p) => p.id === pid)
                if (!player) return null
                return (
                  <div
                    key={pid}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--accent-soft)] rounded-full"
                  >
                    <span className="font-[family:var(--font-display)] font-bold text-[var(--accent)]" style={{ fontSize: 13 }}>
                      {formatShortPlayerName(player.name)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePlayerFromTeam(index, pid)}
                      className="text-[var(--accent)] opacity-60 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => openPlayerPicker(index)}
              disabled={team.playerIds.length >= requiredPerTeam}
              className="flex items-center gap-2 w-full px-3 py-2 bg-[var(--bg)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)] text-[var(--muted)] font-[family:var(--font-body)] font-semibold active:bg-[var(--surface)] transition-colors disabled:opacity-50 disabled:active:bg-[var(--bg)]"
              style={{ fontSize: 13, minHeight: 40 }}
            >
              <Plus className="w-4 h-4" />
              {t('createSession.addPlayer')}
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        </div>
      ))}

      {/* Add team button */}
      {teams.length < MAX_TEAMS && (
        <button
          type="button"
          onClick={addTeam}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[var(--bg)] border border-dashed border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--muted)] font-[family:var(--font-body)] font-semibold active:bg-[var(--surface)] transition-colors"
          style={{ fontSize: 14, minHeight: 48 }}
        >
          <Plus className="w-4 h-4" />
          {t('createSession.addTeam')}
        </button>
      )}

      {/* Validation hint */}
      {!allTeamsValid && teams.length >= 2 && (
        <p className="font-[family:var(--font-mono)] text-[var(--danger)]" style={{ fontSize: 12 }}>
          {t('createSession.invalidTeam')}
        </p>
      )}

      {/* Player picker bottom sheet */}
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
              {t('createMatch.selectPlayer')}
            </span>
          </div>
          <input
            type="text"
            placeholder={t('createMatch.searchPlayers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

        <div style={{ overflowY: 'auto', padding: `0 var(--space-5) max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-4)))` }}>
          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-7) var(--space-4)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
              {t('createMatch.noPlayerMatches')}
            </div>
          ) : filteredPlayers.map((p) => {
            const isUsed = usedPlayerIds.has(p.id)
            const isTeamFull = pickerTeamIndex !== null && (teams[pickerTeamIndex]?.playerIds.length ?? 0) >= requiredPerTeam
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addPlayerToTeam(p.id)}
                disabled={isUsed || isTeamFull}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) 0',
                  borderBottom: '1px solid var(--border)',
                  cursor: isUsed || isTeamFull ? 'not-allowed' : 'pointer',
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
                  color: isUsed || isTeamFull ? 'var(--muted)' : 'var(--fg)',
                  touchAction: 'manipulation',
                  opacity: isUsed || isTeamFull ? 0.5 : 1,
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
                  {isUsed && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 2 }}>
                      Already assigned
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </BottomSheet>

      {/* Shuffle picker bottom sheet */}
      <BottomSheet open={shuffleOpen} onClose={() => setShuffleOpen(false)}>
        <div style={{ padding: '0 var(--space-5) var(--space-3)' }}>
          <div className="flex items-start justify-between gap-4" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--fg)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {t('shuffle.title')}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
                {shuffleSelectedIds.size === 0
                  ? t('shuffle.selectPlayers')
                  : t('shuffle.selectedCount', { count: shuffleSelectedIds.size })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSelectAllShuffle}
              className="font-[family:var(--font-body)] font-bold text-[var(--accent)] active:opacity-70 transition-opacity"
              style={{ fontSize: 14, minHeight: 32 }}
            >
              {allPlayers && allPlayers.length > 0 && allPlayers.every((player) => shuffleSelectedIds.has(player.id))
                ? t('shuffle.clearAll')
                : t('shuffle.selectAll')}
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: `0 var(--space-5) var(--space-4)` }}>
          {allPlayers?.map((player) => {
            const isSelected = shuffleSelectedIds.has(player.id)
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => toggleShufflePlayer(player.id)}
                className="flex w-full items-center gap-4 border-b border-[var(--border)] py-4 text-left active:bg-[var(--bg)] transition-colors"
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] border-2"
                  style={{
                    borderColor: isSelected ? 'var(--accent)' : 'var(--muted)',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: 'var(--surface)',
                  }}
                >
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span
                  className="font-[family:var(--font-display)] font-bold text-[var(--fg)]"
                  style={{ fontSize: 16 }}
                >
                  {formatShortPlayerName(player.name)}
                </span>
              </button>
            )
          })}
        </div>

        <div
          style={{
            padding: `var(--space-4) var(--space-5) max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-4)))`,
          }}
        >
          <button
            type="button"
            onClick={handleShuffleSelected}
            disabled={!canShuffleSelected}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 bg-[var(--accent)] px-4 font-[family:var(--font-body)] font-bold text-[var(--surface)] transition-opacity active:opacity-80 disabled:opacity-35"
            style={{ fontSize: 15, borderRadius: 'var(--radius-sm)' }}
          >
            <Shuffle className="w-4 h-4" />
            {canShuffleSelected
              ? t('shuffle.selectedButton', { count: shuffleSelectedIds.size })
              : t('shuffle.needMore', { count: neededShufflePlayers - shuffleSelectedIds.size })}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
})

export default LeagueTeamBuilder
