import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Calculator, ChevronLeft, Medal, Trophy } from 'lucide-react'
import { AppBar, StatRow } from '../../design-system/components'
import { useI18n } from '../i18n'

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-[var(--space-6)]">
      <div className="mb-[var(--space-3)]">
        <p className="font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-[family:var(--font-display)] text-[22px] font-extrabold leading-tight text-[var(--fg)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function FormulaCard() {
  const { t } = useI18n()

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[var(--space-4)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--accent)]">
          <Calculator className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
            {t('points.matchPoints')}
          </p>
          <p className="mt-1 font-[family:var(--font-display)] text-[18px] font-extrabold leading-snug text-[var(--fg)]">
            {t('points.formula')}
          </p>
        </div>
      </div>
      <p className="mt-[var(--space-3)] text-[13px] leading-5 text-[var(--muted)]">
        {t('points.formulaDescription')}
      </p>
    </div>
  )
}

function RuleRow({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'good' | 'warn'
}) {
  const color = tone === 'good' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : 'var(--fg)'

  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-3 last:border-b-0">
      <span className="text-[13px] leading-5 text-[var(--muted)]">{label}</span>
      <span
        className="shrink-0 text-right font-[family:var(--font-display)] text-[16px] font-extrabold leading-5"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  )
}

function RulesCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-[var(--space-4)]">
      {children}
    </div>
  )
}

export default function PointSystemPage() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      <AppBar
        title=""
        leftAction={{
          icon: <ChevronLeft className="h-5 w-5 -ml-1" />,
          onClick: () => navigate('/settings'),
        }}
      />

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))' }}
      >
        <header className="px-[var(--space-5)] pb-[var(--space-6)] pt-[var(--space-4)]">
          <div className="mb-[var(--space-3)] inline-flex items-center gap-[var(--space-2)] font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent)]">
            <Activity className="h-3.5 w-3.5" />
            {t('points.eyebrow')}
          </div>
          <h1 className="font-[family:var(--font-display)] text-[34px] font-extrabold leading-none text-[var(--fg)]">
            {t('points.title')}
          </h1>
          <p className="mt-[var(--space-2)] max-w-[34rem] text-[14px] leading-6 text-[var(--muted)]">
            {t('points.subtitle')}
          </p>
        </header>

        <main className="px-[var(--space-5)]">
          <Section eyebrow={t('points.weeklyPoints')} title={t('points.matchScore')}>
            <FormulaCard />
          </Section>

          <Section eyebrow={t('points.base')} title={t('points.startingPoints')}>
            <RulesCard>
              <StatRow label={t('points.win')} value="+10" />
              <StatRow label={t('points.loss')} value="+3" />
              <StatRow label={t('points.attendance')} value="+1" />
            </RulesCard>
          </Section>

          <Section eyebrow={t('points.scoreBonus')} title={t('points.marginBonus')}>
            <RulesCard>
              <RuleRow label={t('points.winnerBy1To3')} value="+1" tone="good" />
              <RuleRow label={t('points.winnerBy4To7')} value="+2" tone="good" />
              <RuleRow label={t('points.winnerBy8To15')} value="+3" tone="good" />
              <RuleRow label={t('points.winnerBy16More')} value="+4" tone="good" />
              <RuleRow label={t('points.loser20More')} value="+3" tone="good" />
              <RuleRow label={t('points.loser18To19')} value="+2" tone="good" />
              <RuleRow label={t('points.loser15To17')} value="+1" tone="good" />
            </RulesCard>
          </Section>

          <Section eyebrow={t('points.strengthBonus')} title={t('points.opponentStrength')}>
            <RulesCard>
              <RuleRow label={t('points.winSimilar')} value="+1" tone="good" />
              <RuleRow label={t('points.winStronger101')} value="+2" tone="good" />
              <RuleRow label={t('points.winStronger251')} value="+4" tone="good" />
              <RuleRow label={t('points.winStronger401')} value="+6" tone="good" />
              <RuleRow label={t('points.strongerLose101')} value="-1" tone="warn" />
              <RuleRow label={t('points.strongerLose251')} value="-2" tone="warn" />
            </RulesCard>
          </Section>

          <Section eyebrow={t('points.example')} title={t('points.upsetWin')}>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[var(--space-4)]">
              <div className="mb-[var(--space-4)] flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--accent)]">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-[family:var(--font-display)] text-[17px] font-extrabold text-[var(--fg)]">
                    {t('points.exampleTitle')}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                    {t('points.exampleRating')}
                  </p>
                </div>
              </div>
              <div className="border-t border-[var(--border)]">
                <RuleRow label={t('points.abWinners')} value={t('points.ptsEach', { points: 16 })} tone="good" />
                <RuleRow label={t('points.cdLosers')} value={t('points.ptsEach', { points: 4 })} />
              </div>
            </div>
          </Section>

          <Section eyebrow={t('points.skillRating')} title={t('points.longTermStrength')}>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[var(--space-4)]">
              <div className="mb-[var(--space-4)] flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--accent)]">
                  <Medal className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-[family:var(--font-display)] text-[17px] font-extrabold text-[var(--fg)]">
                    {t('points.eloRating')}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[var(--muted)]">
                    {t('points.eloDescription')}
                  </p>
                </div>
              </div>
              <div className="border-t border-[var(--border)]">
                <StatRow label={t('points.initialRating')} value="1000" />
                <StatRow label={t('points.kFactor')} value="32" />
                <RuleRow label={t('points.ratingUpdateTiming')} value={t('points.sessionEnd')} />
              </div>
            </div>
          </Section>

          <Section eyebrow={t('points.sorting')} title={t('points.leaderboardOrder')}>
            <RulesCard>
              <RuleRow label={t('points.thisSession')} value={t('points.pointsWinsDiff')} />
              <RuleRow label={t('points.overallRankings')} value={t('points.ratingAvgWinRateDiff')} />
            </RulesCard>
          </Section>
        </main>
      </div>
    </div>
  )
}
