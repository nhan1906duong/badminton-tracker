import { Check, X } from 'lucide-react'
import { Avatar } from '../../design-system/components/avatar'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { usePlayers } from '../hooks/usePlayers'
import { useSessionAttendances, useUpsertAttendance, useDeleteAttendance } from '../hooks/useSessionAttendances'
import { useI18n } from '../i18n'
import { formatShortPlayerName } from '../lib/player-name'
import type { AttendanceStatus, Player } from '../types/database'

interface Props {
  sessionId: string
}

export function SessionAttendancePanel({ sessionId }: Props) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const isAdmin = useIsAdmin()

  const { data: players = [] } = usePlayers()
  const { data: attendances = [] } = useSessionAttendances(sessionId)
  const upsert = useUpsertAttendance()
  const remove = useDeleteAttendance()

  const attendanceMap = new Map(attendances.map((a) => [a.player_id, a.status]))

  const confirmed = attendances.filter((a) => a.status === 'confirmed').length
  const declined = attendances.filter((a) => a.status === 'declined').length
  const pending = players.length - confirmed - declined
  const isMutating = upsert.isPending || remove.isPending

  function canEdit(player: Player): boolean {
    return isAdmin || profile?.player_id === player.id
  }

  function handleToggle(player: Player, status: AttendanceStatus) {
    const current = attendanceMap.get(player.id)
    if (current === status) {
      remove.mutate({ sessionId, playerId: player.id })
    } else {
      upsert.mutate({ sessionId, playerId: player.id, status })
    }
  }

  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            margin: 0,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {t('attendance.title')}
        </h3>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--muted)',
            fontWeight: 600,
            lineHeight: 1.4,
            textAlign: 'right',
          }}
        >
          {t('attendance.summary', { confirmed, declined, pending })}
        </span>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {players.map((player, idx) => {
          const status = attendanceMap.get(player.id)
          const editable = canEdit(player)

          return (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
                minHeight: 68,
              }}
            >
              <Avatar src={player.avatar_url} name={player.name} size={36} />
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {formatShortPlayerName(player.name)}
              </span>

              {editable ? (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleToggle(player, 'confirmed')}
                    disabled={isMutating}
                    aria-pressed={status === 'confirmed'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: status === 'confirmed' ? 'var(--success)' : 'var(--bg)',
                      color: status === 'confirmed' ? 'var(--surface)' : 'var(--muted)',
                      border: `1.5px solid ${status === 'confirmed' ? 'transparent' : 'var(--border)'}`,
                      cursor: isMutating ? 'not-allowed' : 'pointer',
                      opacity: isMutating ? 0.55 : 1,
                      touchAction: 'manipulation',
                      transition: 'opacity 0.12s',
                    }}
                    aria-label={`${t('attendance.confirmed')} ${player.name}`}
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(player, 'declined')}
                    disabled={isMutating}
                    aria-pressed={status === 'declined'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: status === 'declined' ? 'var(--danger)' : 'var(--bg)',
                      color: status === 'declined' ? 'var(--surface)' : 'var(--muted)',
                      border: `1.5px solid ${status === 'declined' ? 'transparent' : 'var(--border)'}`,
                      cursor: isMutating ? 'not-allowed' : 'pointer',
                      opacity: isMutating ? 0.55 : 1,
                      touchAction: 'manipulation',
                      transition: 'opacity 0.12s',
                    }}
                    aria-label={`${t('attendance.declined')} ${player.name}`}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              ) : status ? (
                <span
                  aria-label={`${status === 'confirmed' ? t('attendance.confirmed') : t('attendance.declined')} ${player.name}`}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    background: status === 'confirmed' ? 'var(--success)' : 'var(--danger)',
                    color: 'var(--surface)',
                  }}
                >
                  {status === 'confirmed' ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    <X size={14} strokeWidth={2.5} />
                  )}
                </span>
              ) : (
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--muted)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {t('attendance.noResponse')}
                </span>
              )}
            </div>
          )
        })}

        {players.length === 0 && (
          <p
            style={{
              padding: 'var(--space-7) var(--space-4)',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            {t('attendance.noPlayers')}
          </p>
        )}
      </div>
    </section>
  )
}
