import Avatar from './Avatar'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
import { formatShortPlayerName } from '../lib/player-name'

interface Props {
  playerId: string
  name: string
  avatarUrl: string | null
  losses: number
  matchesPlayed: number
}

export default function DonorListItem({
  name,
  avatarUrl,
  losses,
  matchesPlayed,
}: Props) {
  const amount = losses * LOSS_PENALTY_VND
  const displayName = formatShortPlayerName(name)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
      <Avatar
        src={avatarUrl}
        name={name}
        size={40}
        bgColor="#dcfce7"
        textColor="#15803d"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-bold text-yellow-500 leading-tight tabular-nums">
          {losses} {losses === 1 ? 'Loss' : 'Losses'}
        </p>
        <p className="text-xs text-gray-400 leading-tight">
          {formatCurrency(amount)} ({matchesPlayed} matches)
        </p>
      </div>
    </div>
  )
}
