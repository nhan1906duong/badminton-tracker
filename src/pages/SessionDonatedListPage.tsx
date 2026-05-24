import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Wallet } from 'lucide-react'
import { AppBar, Avatar, EmptyState, LoadingState, PullToRefresh } from '../../design-system/components'
import { useSessionDonationStats } from '../hooks/usePlayerStats'
import { useSession } from '../hooks/useSessions'
import { formatCurrency, LOSS_PENALTY_VND } from '../lib/currency'
import { useI18n } from '../i18n'

interface DonorRowProps {
  rank: number
  name: string
  avatarUrl: string | null
  losses: number
  isLast: boolean
}

function DonorRow({ rank, name, avatarUrl, losses, isLast }: DonorRowProps) {
  const { t } = useI18n()
  const amount = losses * LOSS_PENALTY_VND

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
        minHeight: 64,
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: 28,
          flexShrink: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 900,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--fg)',
        }}
      >
        {rank}
      </div>
      <Avatar src={avatarUrl} name={name} size={36} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)',
            fontWeight: 800,
            lineHeight: 1.2,
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--muted)',
          }}
        >
          {t('donations.losses', { count: losses })}
        </div>
      </div>

      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            lineHeight: 1,
            color: 'var(--accent)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatCurrency(amount)}
        </div>
      </div>
    </div>
  )
}

export default function SessionDonatedListPage() {
  const { t } = useI18n()
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: session } = useSession(sessionId)
  const { donors, totalDonatedVnd, totalLosses, isLoading } = useSessionDonationStats(
    sessionId ?? ''
  )

  const handleRefresh = useCallback(async () => {
    // data refetches via react-query cache invalidation
  }, [])

  if (!sessionId) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] px-[var(--space-5)] py-[var(--space-5)]">
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>{t('sessionDetail.notFound')}</p>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
        <AppBar
          title=""
          leftAction={{
            icon: <ChevronLeft className="w-5 h-5 -ml-1" />,
            onClick: () => navigate(`/sessions/${sessionId}`),
          }}
        />

        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))' }}
        >
          <header style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)' }}>
            <div
              className="inline-flex items-center gap-[var(--space-2)]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--fg)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <Wallet size={14} aria-hidden="true" />
              {t('donations.donorListEyebrow', { session: session?.label ?? t('common.session') })}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 700,
                lineHeight: 1,
                color: 'var(--accent)',
                marginBottom: 'var(--space-2)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCurrency(totalDonatedVnd)}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                color: 'var(--muted)',
              }}
            >
              {t('donations.lossSummary', { losses: totalLosses, amount: formatCurrency(LOSS_PENALTY_VND) })}
            </p>
          </header>

          <main className="px-[var(--space-5)]">
            {isLoading ? (
              <LoadingState message={t('donations.loading')} />
            ) : donors.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-10 h-10 mx-auto" />}
                title={t('donations.noneYet')}
              />
            ) : (
              <section
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0 var(--space-4)',
                }}
              >
                {donors.map((d, index) => (
                  <DonorRow
                    key={d.playerId}
                    rank={index + 1}
                    name={d.name}
                    avatarUrl={d.avatarUrl}
                    losses={d.losses}
                    isLast={index === donors.length - 1}
                  />
                ))}
              </section>
            )}

            {/* MoMo fund link */}
            <a
              href="https://quy.momo.vn/v2/AJlnWBnE93?cover=6749"
              target="_blank"
              rel="noopener noreferrer"
              className="active:opacity-60"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-4)',
                padding: 'var(--space-4)',
                background: 'var(--accent)',
                borderRadius: 'var(--radius-lg)',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
                fontWeight: 800,
                color: 'oklch(100% 0 0)',
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Wallet size={18} aria-hidden="true" />
              {t('donations.openMoMoFund')}
            </a>

            {/* MoMo QR */}
            <div
              className="px-[var(--space-4)] py-[var(--space-6)] mt-[var(--space-6)] flex flex-col items-center gap-[var(--space-3)]"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--muted)',
                }}
              >
                {t('donations.scanToDonate')}
              </p>
              <img
                src="/momo-qr.jpg"
                alt="MoMo QR code"
                style={{
                  width: '100%',
                  maxWidth: 260,
                  borderRadius: 'var(--radius-lg)',
                  display: 'block',
                }}
              />
            </div>
          </main>
        </div>
      </div>
    </PullToRefresh>
  )
}
