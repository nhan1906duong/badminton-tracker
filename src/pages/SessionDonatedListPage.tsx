import { useParams } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import DonorListItem from '../components/DonorListItem'
import { useSessionDonationStats } from '../hooks/usePlayerStats'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'

export default function SessionDonatedListPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const { donors, totalDonatedVnd, totalLosses, isLoading } = useSessionDonationStats(
    sessionId ?? ''
  )

  if (!sessionId) {
    return (
      <div className="min-h-svh bg-gray-50 px-4 py-5">
        <p className="text-sm text-gray-400">Session not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="px-4 py-5 space-y-4 pb-32">
        {/* Total Donated summary card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Total Donated
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">
            {formatCurrency(totalDonatedVnd)}
          </p>
          <p className="text-xs text-gray-400">
            {totalLosses} losses × {formatCurrency(LOSS_PENALTY_VND)}
          </p>
        </section>

        {/* Donors list */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Loading donations...
          </div>
        ) : donors.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No donations yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {donors.map((d) => (
              <DonorListItem
                key={d.playerId}
                playerId={d.playerId}
                name={d.name}
                avatarUrl={d.avatarUrl}
                losses={d.losses}
                matchesPlayed={d.matchesPlayed}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
