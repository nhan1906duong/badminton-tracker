import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MatchWithDetails } from '../types/database'
import { Trash2 } from 'lucide-react'
import Avatar from './Avatar'
import { MATCH_TYPE_SHORT } from '../lib/match-helpers'

const SWIPE_THRESHOLD = 60
const DELETE_WIDTH = 80

interface MatchCardProps {
  match: MatchWithDetails
  matchNumber: number
  isSwiped: boolean
  onSwipeOpen: () => void
  onSwipeClose: () => void
  onDelete: () => void
}

export default function MatchCard({
  match,
  matchNumber,
  isSwiped,
  onSwipeOpen,
  onSwipeClose,
  onDelete,
}: MatchCardProps) {
  const navigate = useNavigate()
  const startX = useRef(0)
  const currentX = useRef(0)
  const [translateX, setTranslateX] = useState(0)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX
      currentX.current = isSwiped ? -DELETE_WIDTH : 0
    },
    [isSwiped]
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - startX.current
    let newX = currentX.current + delta
    if (newX > 0) newX = 0
    if (newX < -DELETE_WIDTH) newX = -DELETE_WIDTH
    setTranslateX(newX)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (translateX < -SWIPE_THRESHOLD) {
      setTranslateX(-DELETE_WIDTH)
      onSwipeOpen()
    } else {
      setTranslateX(0)
      onSwipeClose()
    }
  }, [translateX, onSwipeOpen, onSwipeClose])

  const handleClick = useCallback(() => {
    if (isSwiped) {
      setTranslateX(0)
      onSwipeClose()
      return
    }
    navigate(`/sessions/${match.session_id}/matches/${match.id}/edit`)
  }, [isSwiped, match.session_id, match.id, navigate, onSwipeClose])

  const teamA = match.participants.filter(
    p => match.teams.find(t => t.id === p.team_id)?.team_label === 'TEAM_A'
  )
  const teamB = match.participants.filter(
    p => match.teams.find(t => t.id === p.team_id)?.team_label === 'TEAM_B'
  )
  const winnerTeam = match.teams.find(t => t.is_winner)
  const winnerLabel = winnerTeam?.team_label

  const teamAWon = winnerLabel === 'TEAM_A'
  const teamBWon = winnerLabel === 'TEAM_B'

  const hasScores = match.scores.length > 0

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete background layer */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5">
        <button
          onClick={onDelete}
          className="flex flex-col items-center gap-0.5 text-white"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Delete</span>
        </button>
      </div>

      {/* Foreground card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: translateX === 0 || translateX === -DELETE_WIDTH ? 'transform 0.2s ease-out' : 'none',
        }}
        className="relative w-full text-left bg-white border border-gray-100 p-4 select-none active:scale-[0.98] transition-transform"
      >
        {/* Badge: top-right shortcut */}
        <div className="absolute top-1.5 right-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
            {MATCH_TYPE_SHORT[match.match_type]}
          </span>
        </div>

        {/* Teams + Score */}
        <div className="flex items-center gap-3 pt-1">
          {/* Match Number */}
          <div className="shrink-0 flex flex-col justify-center self-stretch">
            <span className="text-xs font-bold text-red-500">M{matchNumber}</span>
          </div>

          {/* Team A */}
          <div className="flex-1 min-w-0 self-stretch">
            <div className="flex flex-col items-end justify-center gap-2 h-full">
              {teamA.map(p => (
                <div key={p.player.id} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {p.player.name}
                  </span>
                  <Avatar
                    src={p.player.avatar_url}
                    name={p.player.name}
                    size={22}
                    bgColor="#f3f4f6"
                    textColor="#6b7280"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Score */}
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

          {/* Team B */}
          <div className="flex-1 min-w-0 self-stretch">
            <div className="flex flex-col items-start justify-center gap-2 h-full">
              {teamB.map(p => (
                <div key={p.player.id} className="flex items-center gap-2">
                  <Avatar
                    src={p.player.avatar_url}
                    name={p.player.name}
                    size={22}
                    bgColor="#f3f4f6"
                    textColor="#6b7280"
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {p.player.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
