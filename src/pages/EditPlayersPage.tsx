import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { AppBar, Avatar, BottomSheet, LoadingState } from '../../design-system/components'
import { useMatch, useUpdateMatchPlayers } from '../hooks/useMatches'
import { usePlayers } from '../hooks/usePlayers'
import { getTeamSize } from '../lib/match-helpers'
import { formatShortPlayerName } from '../lib/player-name'
import type { MatchWithDetails, Player } from '../types/database'
import { matchTypeLabel, useI18n, type TFunction } from '../i18n'

type TeamKey = 'A' | 'B'
type PlayerSlots = (string | null)[]
type PickerTarget = { team: TeamKey; index: number }

function getTeamPlayerIds(match: MatchWithDetails, teamLabel: 'TEAM_A' | 'TEAM_B') {
  const team = match.teams.find(t => t.team_label === teamLabel)
  if (!team) return []
  return match.participants
    .filter(p => p.team_id === team.id)
    .map(p => p.player_id)
}

function normalizeSlots(ids: string[], size: number): PlayerSlots {
  return Array.from({ length: size }, (_, i) => ids[i] ?? null)
}

function slotRole(teamSize: number, index: number, t: TFunction) {
  return teamSize === 1 ? t('team.player') : t('team.playerIndex', { index: index + 1 })
}

function PlayerSlot({
  role,
  player,
  onTap,
  onClear,
}: {
  role: string
  player: Player | undefined
  onTap: () => void
  onClear: () => void
}) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex min-h-[64px] w-full items-center gap-3 border-b border-[var(--border)] px-[var(--space-4)] py-3 text-left last:border-b-0 active:bg-[var(--bg)]"
    >
      {player ? (
        <Avatar src={player.avatar_url} name={player.name} size={40} />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] text-[var(--muted)]">
          <Plus className="h-4 w-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="font-[family:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
          {role}
        </p>
        <p className={`mt-0.5 truncate font-[family:var(--font-display)] text-[16px] font-bold ${player ? 'text-[var(--fg)]' : 'text-[var(--muted)]'}`}>
          {player ? formatShortPlayerName(player.name) : t('team.tapToChoose')}
        </p>
      </div>

      {player ? (
        <span
          role="button"
          aria-label={t('team.removePlayer', { name: player.name })}
          onClick={(event) => {
            event.stopPropagation()
            onClear()
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--bg)] text-[var(--muted)]"
        >
          <X className="h-3.5 w-3.5" />
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
      )}
    </button>
  )
}

function TeamPanel({
  label,
  slots,
  playerMap,
  onPick,
  onClear,
}: {
  label: string
  slots: PlayerSlots
  playerMap: Map<string, Player>
  onPick: (index: number) => void
  onClear: (index: number) => void
}) {
  const { t } = useI18n()

  return (
    <section className="mb-[var(--space-6)]">
      <div className="mb-[var(--space-3)] flex items-baseline justify-between">
        <h2 className="font-[family:var(--font-display)] text-[22px] font-extrabold text-[var(--fg)]">
          {label}
        </h2>
        <span className="font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
          {slots.filter(Boolean).length}/{slots.length}
        </span>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        {slots.map((playerId, index) => (
          <PlayerSlot
            key={index}
            role={slotRole(slots.length, index, t)}
            player={playerId ? playerMap.get(playerId) : undefined}
            onTap={() => onPick(index)}
            onClear={() => onClear(index)}
          />
        ))}
      </div>
    </section>
  )
}

export default function EditPlayersPage() {
  const { t } = useI18n()
  const { id: sessionId, matchId } = useParams<{ id: string; matchId: string }>()
  const navigate = useNavigate()
  const { data: match, isLoading: matchLoading } = useMatch(matchId ?? '')
  const { data: players = [], isLoading: playersLoading } = usePlayers()
  const updatePlayers = useUpdateMatchPlayers()

  const [initializedMatchId, setInitializedMatchId] = useState<string | null>(null)
  const [teamAIds, setTeamAIds] = useState<PlayerSlots>([])
  const [teamBIds, setTeamBIds] = useState<PlayerSlots>([])
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)
  const [error, setError] = useState('')

  const teamSize = match ? getTeamSize(match.match_type) : 2

  useEffect(() => {
    if (!match || initializedMatchId === match.id) return
    setTeamAIds(normalizeSlots(getTeamPlayerIds(match, 'TEAM_A'), getTeamSize(match.match_type)))
    setTeamBIds(normalizeSlots(getTeamPlayerIds(match, 'TEAM_B'), getTeamSize(match.match_type)))
    setInitializedMatchId(match.id)
  }, [initializedMatchId, match])

  const playerMap = useMemo(() => {
    const map = new Map<string, Player>()
    for (const player of players) map.set(player.id, player)
    for (const participant of match?.participants ?? []) map.set(participant.player.id, participant.player)
    return map
  }, [match?.participants, players])

  const selectedIds = useMemo(
    () => [...teamAIds, ...teamBIds].filter((id): id is string => Boolean(id)),
    [teamAIds, teamBIds]
  )

  const pickerPlayers = useMemo(() => {
    const selected = new Set(selectedIds)
    return players.filter(player => player.is_active || selected.has(player.id))
  }, [players, selectedIds])

  const filledCount = selectedIds.length
  const requiredCount = teamSize * 2
  const isComplete = filledCount === requiredCount
  const hasDuplicate = new Set(selectedIds).size !== selectedIds.length
  const canSave = isComplete && !hasDuplicate && !updatePlayers.isPending
  const targetCurrentId = pickerTarget
    ? pickerTarget.team === 'A'
      ? teamAIds[pickerTarget.index]
      : teamBIds[pickerTarget.index]
    : null

  function updateSlot(team: TeamKey, index: number, playerId: string | null) {
    setError('')
    const setter = team === 'A' ? setTeamAIds : setTeamBIds
    setter(current => current.map((id, i) => (i === index ? playerId : id)))
  }

  function choosePlayer(playerId: string) {
    if (!pickerTarget) return
    updateSlot(pickerTarget.team, pickerTarget.index, playerId)
    setPickerTarget(null)
  }

  async function handleSave() {
    setError('')
    const teamA = teamAIds.filter((id): id is string => Boolean(id))
    const teamB = teamBIds.filter((id): id is string => Boolean(id))

    if (teamA.length !== teamSize || teamB.length !== teamSize) {
      setError(t('editPlayers.fillEverySlot'))
      return
    }
    if (new Set([...teamA, ...teamB]).size !== teamA.length + teamB.length) {
      setError(t('editPlayers.playerOnce'))
      return
    }
    if (!match || !sessionId || !matchId) return

    try {
      await updatePlayers.mutateAsync({
        id: match.id,
        team_a_player_ids: teamA,
        team_b_player_ids: teamB,
      })
      navigate(`/sessions/${sessionId}/matches/${matchId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editPlayers.failedUpdate'))
    }
  }

  if (matchLoading || playersLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)]">
        <AppBar title="" backLabel={t('editPlayers.match')} onBack={() => navigate(-1)} />
        <LoadingState message={t('editPlayers.loading')} />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)]">
        <AppBar title="" backLabel={t('editPlayers.match')} onBack={() => navigate(-1)} />
        <div className="px-[var(--space-5)] py-[var(--space-5)] text-[14px] text-[var(--muted)]">
          {t('editPlayers.matchNotFound')}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft className="h-5 w-5 -ml-1" />,
          onClick: () => navigate(-1),
        }}
        safeArea
      />

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(120px, calc(env(safe-area-inset-bottom) + 104px))' }}
      >
        <header className="px-[var(--space-5)] pb-[var(--space-6)] pt-[var(--space-4)]">
          <p className="mb-[var(--space-3)] font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent)]">
            {matchTypeLabel(match.match_type, t)}
          </p>
          <h1 className="font-[family:var(--font-display)] text-[34px] font-extrabold leading-none text-[var(--fg)]">
            {t('editPlayers.title')}
          </h1>
          <p className="mt-[var(--space-2)] font-[family:var(--font-mono)] text-[13px] text-[var(--muted)]">
            {filledCount}/{requiredCount} selected
          </p>
        </header>

        <main className="px-[var(--space-5)]">
          <TeamPanel
            label={t('team.teamA')}
            slots={teamAIds}
            playerMap={playerMap}
            onPick={(index) => setPickerTarget({ team: 'A', index })}
            onClear={(index) => updateSlot('A', index, null)}
          />

          <TeamPanel
            label={t('team.teamB')}
            slots={teamBIds}
            playerMap={playerMap}
            onPick={(index) => setPickerTarget({ team: 'B', index })}
            onClear={(index) => updateSlot('B', index, null)}
          />

          {error && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--danger)] bg-[var(--surface)] px-[var(--space-4)] py-3 text-[13px] font-semibold text-[var(--danger)]">
              {error}
            </div>
          )}
        </main>
      </div>

      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 mx-auto max-w-lg border-t border-[var(--border)] bg-[color-mix(in_oklch,var(--surface)_92%,transparent)] px-[var(--space-4)] py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] font-[family:var(--font-body)] text-[15px] font-bold transition-opacity active:opacity-80 ${
            canSave
              ? 'bg-[var(--accent)] text-[var(--surface)]'
              : 'bg-[var(--border)] text-[var(--muted)]'
          }`}
        >
          {updatePlayers.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
          {updatePlayers.isPending ? t('common.saving') : t('editPlayers.savePlayers')}
        </button>
      </div>

      <BottomSheet open={!!pickerTarget} onClose={() => setPickerTarget(null)}>
        <div className="px-[var(--space-2)] pb-[var(--space-2)]">
          <p className="font-[family:var(--font-display)] text-[18px] font-extrabold text-[var(--fg)]">
            {t('editPlayers.choosePlayer')}
          </p>
          <p className="mt-1 font-[family:var(--font-mono)] text-[12px] text-[var(--muted)]">
            {pickerTarget?.team === 'A' ? t('team.teamA') : t('team.teamB')} · {pickerTarget ? slotRole(teamSize, pickerTarget.index, t) : ''}
          </p>
        </div>
        <div className="max-h-[56dvh] overflow-y-auto overscroll-contain px-[var(--space-1)]">
          {pickerPlayers.map(player => {
            const isSelectedElsewhere = selectedIds.includes(player.id) && player.id !== targetCurrentId
            const isCurrent = player.id === targetCurrentId

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => !isSelectedElsewhere && choosePlayer(player.id)}
                disabled={isSelectedElsewhere}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors ${
                  isSelectedElsewhere ? 'opacity-40' : 'active:bg-[var(--bg)]'
                }`}
              >
                <Avatar src={player.avatar_url} name={player.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-[family:var(--font-display)] text-[15px] font-bold text-[var(--fg)]">
                    {formatShortPlayerName(player.name)}
                  </p>
                  <p className="font-[family:var(--font-mono)] text-[11px] text-[var(--muted)]">
                    {t('editPlayers.rating', { rating: player.rating })}
                  </p>
                </div>
                {isCurrent && <Check className="h-5 w-5 shrink-0 text-[var(--accent)]" />}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </div>
  )
}
