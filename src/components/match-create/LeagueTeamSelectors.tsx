import { useState } from 'react'
import { ChevronRight, Check, Users } from 'lucide-react'
import { SectionLabel } from '../../../design-system/components'
import { BottomSheet } from '../../../design-system/components/bottom-sheet'
import { formatShortPlayerName } from '../../lib/player-name'
import { useI18n } from '../../i18n'
import type { LeagueTeamWithPlayers } from '../../types/database'

interface TeamRowProps {
  label: string
  selected?: LeagueTeamWithPlayers
  onTap: () => void
}

function TeamRow({ label, selected, onTap }: TeamRowProps) {
  const { t } = useI18n()
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3) var(--space-4)',
    }}>
      <SectionLabel className="mb-[var(--space-2)]">{label}</SectionLabel>
      <button
        type="button"
        onClick={onTap}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          width: '100%',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          minHeight: 44,
          textAlign: 'left',
          touchAction: 'manipulation',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-base)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: selected ? 'var(--fg)' : 'var(--muted)',
        }}>
          {selected ? selected.name : t('createMatch.selectTeam')}
        </span>
        <ChevronRight style={{ width: 16, height: 16, color: 'var(--muted)', flexShrink: 0 }} />
      </button>
    </div>
  )
}

interface LeagueTeamSelectorsProps {
  leagueTeams?: LeagueTeamWithPlayers[]
  leagueTeamA: string | null
  leagueTeamB: string | null
  onSelectTeamA: (id: string) => void
  onSelectTeamB: (id: string) => void
}

export function LeagueTeamSelectors({
  leagueTeams,
  leagueTeamA,
  leagueTeamB,
  onSelectTeamA,
  onSelectTeamB,
}: LeagueTeamSelectorsProps) {
  const { t } = useI18n()
  const [pickingSide, setPickingSide] = useState<'A' | 'B' | null>(null)

  const teamA = leagueTeams?.find(team => team.id === leagueTeamA)
  const teamB = leagueTeams?.find(team => team.id === leagueTeamB)

  // Exclude the team picked on the opposite side
  const excludeId = pickingSide === 'A' ? leagueTeamB : leagueTeamA
  const currentId = pickingSide === 'A' ? leagueTeamA : leagueTeamB
  const options = leagueTeams?.filter(team => team.id !== excludeId) ?? []

  function handlePick(id: string) {
    if (pickingSide === 'A') onSelectTeamA(id)
    else if (pickingSide === 'B') onSelectTeamB(id)
    setPickingSide(null)
  }

  return (
    <section style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-7)' }}>
      <SectionLabel className="mb-[var(--space-4)]">{t('createMatch.teams')}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <TeamRow label={t('team.teamA')} selected={teamA} onTap={() => setPickingSide('A')} />
        <TeamRow label={t('team.teamB')} selected={teamB} onTap={() => setPickingSide('B')} />
      </div>

      <BottomSheet open={pickingSide !== null} onClose={() => setPickingSide(null)}>
        <div style={{ padding: '0 var(--space-5) var(--space-3)' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
          }}>
            {pickingSide === 'B' ? t('team.teamB') : t('team.teamA')}
          </span>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: '50vh', padding: `0 var(--space-5) max(var(--space-5), calc(env(safe-area-inset-bottom) + var(--space-4)))` }}>
          {options.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-7) var(--space-4)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
              {t('createMatch.noPlayerMatches')}
            </div>
          ) : options.map(team => {
            const isSel = team.id === currentId
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => handlePick(team.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) 0',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--fg)',
                  touchAction: 'manipulation',
                  minHeight: 52,
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: isSel ? 'var(--accent)' : 'var(--bg)',
                  border: isSel ? 'none' : '1px solid var(--border)',
                  color: isSel ? 'var(--surface)' : 'var(--muted)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}>
                  <Users style={{ width: 16, height: 16 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, color: 'var(--fg)' }}>
                    {team.name}
                  </div>
                  {team.players.length > 0 && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 2 }}>
                      {team.players.map(p => formatShortPlayerName(p.name)).join(' · ')}
                    </div>
                  )}
                </div>
                {isSel && <Check style={{ width: 18, height: 18, color: 'var(--accent)', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </section>
  )
}
