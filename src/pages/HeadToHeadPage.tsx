import { ChevronLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppBar } from '../../design-system/components'
import HeadToHeadTab from '../components/HeadToHeadTab'

export default function HeadToHeadPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()

  return (
    <div className="min-h-svh pb-24" style={{ background: 'var(--bg)' }}>
      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft className="w-5 h-5" />,
          onClick: () => navigate(-1),
        }}
      />
      <div className="pt-4">
        <HeadToHeadTab initialPlayerId={playerId} />
      </div>
    </div>
  )
}
