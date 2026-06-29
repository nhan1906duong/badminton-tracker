import { ChevronLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppBar } from '../../design-system/components'
import FloatingActionButton from '../components/FloatingActionButton'
import { PlayerQuotesCard } from '../components/PlayerQuotesCard'
import { PlayerRacketsCard } from '../components/PlayerRacketsCard'
import { QuoteFormSheet } from '../components/QuoteFormSheet'
import { RacketAddedCelebration } from '../components/RacketAddedCelebration'
import { RacketFormSheet } from '../components/RacketFormSheet'
import { useAuth } from '../hooks/useAuth'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { usePlayerRackets } from '../hooks/usePlayerRackets'
import { usePlayer } from '../hooks/usePlayers'
import { useProfile } from '../hooks/useProfile'
import { useI18n } from '../i18n'
import { MAX_RACKETS_PER_PLAYER, type PlayerQuote, type PlayerRacket } from '../types/database'

export default function PlayerRacketsPage() {
  const { t } = useI18n()
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const id = playerId ?? ''

  const { data: player, isLoading } = usePlayer(id)
  const { data: rackets = [] } = usePlayerRackets(id)
  const { user } = useAuth()
  const { data: myProfile } = useProfile(user?.id)
  const isAdmin = useIsAdmin()
  const isMe = !!myProfile?.player_id && myProfile.player_id === id
  const canEdit = isMe || isAdmin
  const [isAdding, setIsAdding] = useState(false)
  const [editingRacket, setEditingRacket] = useState<PlayerRacket | null>(null)
  const [celebrationRacketName, setCelebrationRacketName] = useState<string | null>(null)
  const [isAddingQuote, setIsAddingQuote] = useState(false)
  const [editingQuote, setEditingQuote] = useState<PlayerQuote | null>(null)
  const canAddMore = rackets.length < MAX_RACKETS_PER_PLAYER

  if (isLoading) {
    return (
      <div className="min-h-svh bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-svh bg-[var(--bg)] flex items-center justify-center">
        <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {t('players.notFound')}
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[var(--bg)]">
      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft className="w-5 h-5" />,
          onClick: () => navigate(-1),
        }}
      />
      <div className="px-4 py-4 flex flex-col" style={{ gap: 'var(--space-6)' }}>
        <PlayerRacketsCard
          playerId={id}
          canEdit={canEdit}
          activeRacketId={player.active_racket_id}
          onEdit={setEditingRacket}
        />

        <PlayerQuotesCard
          playerId={id}
          canEdit={canEdit}
          onAdd={() => setIsAddingQuote(true)}
          onEdit={setEditingQuote}
        />
      </div>

      {canEdit && canAddMore && (
        <FloatingActionButton
          onClick={() => setIsAdding(true)}
          icon={<Plus className="w-6 h-6" />}
          ariaLabel={t('players.addRacket')}
          bottomOffset="1.5rem"
        />
      )}

      {(isAdding || editingRacket) && (
        <RacketFormSheet
          open
          onClose={() => {
            setIsAdding(false)
            setEditingRacket(null)
          }}
          playerId={id}
          racket={editingRacket ?? undefined}
          onCreated={racketName => setCelebrationRacketName(racketName)}
        />
      )}

      <RacketAddedCelebration
        open={!!celebrationRacketName}
        onClose={() => setCelebrationRacketName(null)}
        playerName={player.name}
        racketName={celebrationRacketName ?? ''}
      />

      {(isAddingQuote || editingQuote) && (
        <QuoteFormSheet
          open
          onClose={() => {
            setIsAddingQuote(false)
            setEditingQuote(null)
          }}
          playerId={id}
          quote={editingQuote ?? undefined}
        />
      )}
    </div>
  )
}
