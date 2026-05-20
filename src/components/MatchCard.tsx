import { useNavigate } from 'react-router-dom'
import type { MatchWithDetails } from '../types/database'
import { Trash2 } from 'lucide-react'
import Avatar from './Avatar'
import { MATCH_TYPE_SHORT } from '../lib/match-helpers'
import { SwipeableItem } from './SwipeableItem'

interface MatchCardProps {
  match: MatchWithDetails
  matchNumber: number
  isSwiped: boolean
  onSwipeOpen: () => void
  onSwipeClose: () => void
  onDelete: () => void
  dateLabel?: string
  readonly?: boolean
  hideAvatars?: boolean
}

export default function MatchCard({
  match,
  matchNumber,
  isSwiped,
  onSwipeOpen,
  onSwipeClose,
  onDelete,
  dateLabel,
  readonly,
  hideAvatars,
}: MatchCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (readonly) return
    navigate(`/sessions/${match.session_id}/matches/${match.id}/edit`)
  }

  const teamA = match.participants.filter(
    (p) => match.teams.find((t) => t.id === p.team_id)?.team_label === 'TEAM_A'
  )
  const teamB = match.participants.filter(
    (p) => match.teams.find((t) => t.id === p.team_id)?.team_label === 'TEAM_B'
  )
  const winnerTeam = match.teams.find((t) => t.is_winner)
  const winnerLabel = winnerTeam?.team_label

  const teamAWon = winnerLabel === 'TEAM_A'
  const teamBWon = winnerLabel === 'TEAM_B'

  const hasScores = match.scores.length > 0

  const cardContent = (
    <div className="relative w-full text-left bg-white border border-gray-100 rounded-2xl p-4 select-none">
      {/* Badge: top-right shortcut */}
      <div className="absolute top-1.5 right-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
          {MATCH_TYPE_SHORT[match.match_type]}
        </span>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-3 pt-1">
        {/* Match Number / Date */}
        <div className="shrink-0 flex flex-col justify-center self-stretch">
          <span className="text-xs font-bold text-red-500">
            {dateLabel ?? `M${matchNumber}`}
          </span>
        </div>

        {/* Team A */}
        <div className="flex-1 min-w-0 self-stretch">
          <div className={`flex flex-col justify-center gap-2 h-full ${hideAvatars ? 'items-end gap-1' : 'items-end'}`}>
            {teamA.map((p) => (
              <div key={p.player.id} className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 truncate">
                  {p.player.name}
                </span>
                {!hideAvatars && (
                  <Avatar
                    src={p.player.avatar_url}
                    name={p.player.name}
                    size={22}
                    bgColor="#f3f4f6"
                    textColor="#6b7280"
                  />
                )}
              </div>
            ))}
            {hideAvatars && winnerLabel && (
              <span className={`text-xs font-bold ${teamAWon ? 'text-green-600' : 'text-gray-400'}`}>
                {teamAWon ? 'Win' : 'Loss'}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        {!hideAvatars && (
          <div className="text-center shrink-0 px-2">
            {winnerLabel || hasScores ? (
              <div className="space-y-0.5">
                {/* W / L line */}
                {winnerLabel && (
                  <p className="text-base font-bold tabular-nums leading-tight whitespace-nowrap">
                    <span className={teamAWon ? 'text-green-600' : 'text-gray-700'}>{teamAWon ? 'W' : 'L'}</span>
                    <span className="text-gray-700 mx-1">-</span>
                    <span className={teamBWon ? 'text-green-600' : 'text-gray-700'}>{teamBWon ? 'W' : 'L'}</span>
                  </p>
                )}
                {/* Scores line */}
                {match.scores.map((s, i) => (
                  <p key={i} className="text-xs font-medium text-gray-500 tabular-nums leading-tight whitespace-nowrap">
                    ({s.team_a_score})<span className="mx-1">-</span>({s.team_b_score})
                  </p>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-300 font-bold">vs</span>
            )}
          </div>
        )}

        {/* Team B */}
        <div className="flex-1 min-w-0 self-stretch">
          <div className={`flex flex-col justify-center gap-2 h-full ${hideAvatars ? 'items-start gap-1' : 'items-start'}`}>
            {teamB.map((p) => (
              <div key={p.player.id} className="flex items-center gap-2">
                {!hideAvatars && (
                  <Avatar
                    src={p.player.avatar_url}
                    name={p.player.name}
                    size={22}
                    bgColor="#f3f4f6"
                    textColor="#6b7280"
                  />
                )}
                <span className="text-sm font-medium text-gray-700 truncate">
                  {p.player.name}
                </span>
              </div>
            ))}
            {hideAvatars && winnerLabel && (
              <span className={`text-xs font-bold ${teamBWon ? 'text-green-600' : 'text-gray-400'}`}>
                {teamBWon ? 'Win' : 'Loss'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (readonly) {
    return <div className="relative rounded-2xl">{cardContent}</div>
  }

  return (
    <SwipeableItem
      isOpen={isSwiped}
      onOpen={onSwipeOpen}
      onClose={onSwipeClose}
      onClick={handleClick}
      renderAction={() => (
        <button
          onClick={onDelete}
          className="flex flex-col items-center gap-0.5 text-white"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Delete</span>
        </button>
      )}
    >
      {cardContent}
    </SwipeableItem>
  )
}
