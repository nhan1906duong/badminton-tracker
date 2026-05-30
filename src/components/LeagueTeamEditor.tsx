import { useState, useCallback } from 'react'
import type { LeagueTeamWithPlayers, MatchType } from '../types/database'
import { getRequiredPlayersPerTeam } from '../types/database'
import { usePlayers } from '../hooks/usePlayers'
import { useUpdateLeagueTeam } from '../hooks/useLeagueTeams'
import { useI18n } from '../i18n'
import { BottomSheet } from '../../design-system/components'
import { formatShortPlayerName } from '../lib/player-name'
import { Plus, X } from 'lucide-react'

interface LeagueTeamEditorProps {
  teams: LeagueTeamWithPlayers[]
  matchType: MatchType
  sessionId: string
  open: boolean
  onClose: () => void
}

export default function LeagueTeamEditor({ teams, matchType, sessionId, open, onClose }: LeagueTeamEditorProps) {
  const { t } = useI18n()
  const { data: allPlayers } = usePlayers()
  const updateTeam = useUpdateLeagueTeam()

  const requiredPerTeam = getRequiredPlayersPerTeam(matchType)

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTeamId, setPickerTeamId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const startEditing = useCallback((team: LeagueTeamWithPlayers) => {
    setEditingTeamId(team.id)
    setEditName(team.name)
  }, [])

  const saveName = useCallback(async (teamId: string) => {
    if (!editName.trim()) return
    await updateTeam.mutateAsync({
      teamId,
      sessionId,
      name: editName.trim(),
    })
    setEditingTeamId(null)
  }, [editName, sessionId, updateTeam])

  const openPlayerPicker = useCallback((teamId: string) => {
    setPickerTeamId(teamId)
    setSearch('')
    setPickerOpen(true)
  }, [])

  const addPlayer = useCallback(async (playerId: string) => {
    if (!pickerTeamId) return
    const team = teams.find((t) => t.id === pickerTeamId)
    if (!team) return
    if (team.players.some((p) => p.id === playerId)) {
      setPickerOpen(false)
      setPickerTeamId(null)
      return
    }
    if (team.players.length >= requiredPerTeam) return
    await updateTeam.mutateAsync({
      teamId: pickerTeamId,
      sessionId,
      playerIds: [...team.players.map((p) => p.id), playerId],
    })
    setPickerOpen(false)
    setPickerTeamId(null)
  }, [pickerTeamId, requiredPerTeam, teams, sessionId, updateTeam])

  const removePlayer = useCallback(async (teamId: string, playerId: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (!team) return
    await updateTeam.mutateAsync({
      teamId,
      sessionId,
      playerIds: team.players.filter((p) => p.id !== playerId).map((p) => p.id),
    })
  }, [teams, sessionId, updateTeam])

  const usedPlayerIds = new Set(teams.flatMap((t) => t.players.map((p) => p.id)))

  const filteredPlayers = allPlayers?.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }) ?? []

  return (
    <>
      <BottomSheet open={open && !pickerOpen} onClose={onClose}>
        <div style={{ padding: '0 var(--space-4) var(--space-2)' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 'var(--space-4)',
              color: 'var(--fg)',
            }}
          >
            {t('sessionDetail.manageTeams')}
          </div>

          <div className="flex flex-col gap-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden"
              >
                {/* Team header */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {editingTeamId === team.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => saveName(team.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName(team.id)
                        if (e.key === 'Escape') setEditingTeamId(null)
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 font-[family:var(--font-body)] text-[var(--fg)] bg-[var(--surface)] border border-[var(--border)] rounded outline-none"
                      style={{ fontSize: 14 }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(team)}
                      className="flex-1 text-left font-[family:var(--font-display)] font-bold text-[var(--fg)]"
                      style={{ fontSize: 15 }}
                    >
                      {team.name}
                    </button>
                  )}
                </div>

                {/* Players */}
                <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-soft)] rounded-full"
                    >
                      <span className="font-[family:var(--font-display)] font-bold text-[var(--accent)]" style={{ fontSize: 12 }}>
                        {formatShortPlayerName(player.name)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePlayer(team.id, player.id)}
                        className="text-[var(--accent)] opacity-60 hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => openPlayerPicker(team.id)}
                    disabled={team.players.length >= requiredPerTeam}
                    className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-[var(--border)] rounded-full text-[var(--muted)] active:bg-[var(--surface)] transition-colors disabled:opacity-50 disabled:active:bg-transparent"
                    style={{ fontSize: 12 }}
                  >
                    <Plus className="w-3 h-3" />
                    {t('createSession.addPlayer')}
                  </button>
                </div>

                {/* Validation hint */}
                {team.players.length !== requiredPerTeam && (
                  <div className="px-3 pb-2 font-[family:var(--font-mono)] text-[var(--danger)]" style={{ fontSize: 11 }}>
                    {t('createSession.needsPlayers', { count: requiredPerTeam })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Player picker */}
      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div style={{ padding: '0 var(--space-5) var(--space-3)' }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
              }}
            >
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

        <div
          style={{
            overflowY: 'auto',
            padding: `0 var(--space-5) max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-4)))`,
          }}
        >
          {filteredPlayers.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-7) var(--space-4)',
                color: 'var(--muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {t('createMatch.noPlayerMatches')}
            </div>
          ) : (
            filteredPlayers.map((p) => {
              const isUsed = usedPlayerIds.has(p.id)
              const selectedTeam = teams.find((team) => team.id === pickerTeamId)
              const isTeamFull = (selectedTeam?.players.length ?? 0) >= requiredPerTeam
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPlayer(p.id)}
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
                  <div
                    style={{
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
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                      }}
                    >
                      {formatShortPlayerName(p.name)}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </BottomSheet>
    </>
  )
}
