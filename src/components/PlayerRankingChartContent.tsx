import { useI18n } from '../i18n'
import { RatingChart, type RatingChartPoint } from './RatingChart'

interface Props {
  data: RatingChartPoint[]
}

export function PlayerRankingChartContent({ data }: Props) {
  const { t } = useI18n()

  return (
    <>
      <div
        className="text-[11px] font-bold uppercase tracking-[0.1em] px-1"
        style={{ color: 'var(--muted)' }}
      >
        {t('players.rankingChart')}
      </div>
      {data.length < 2 ? (
        <div
          className="bg-[var(--bg)] border border-[var(--border)] p-4"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
            {t('players.noPointsYet')}
          </p>
        </div>
      ) : (
        <RatingChart data={data} />
      )}
    </>
  )
}
