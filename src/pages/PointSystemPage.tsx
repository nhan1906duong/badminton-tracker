import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Calculator, ChevronLeft, Medal, Trophy } from 'lucide-react'
import { AppBar, StatRow } from '../../design-system/components'

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
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[var(--space-4)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--accent)]">
          <Calculator className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
            Match points
          </p>
          <p className="mt-1 font-[family:var(--font-display)] text-[18px] font-extrabold leading-snug text-[var(--fg)]">
            Base + Attendance + Score Bonus + Strength Bonus
          </p>
        </div>
      </div>
      <p className="mt-[var(--space-3)] text-[13px] leading-5 text-[var(--muted)]">
        Every player who appears in a completed match receives at least 1 point for that match.
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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
      <AppBar
        title="Points"
        titleAlign="center"
        leftAction={{
          label: 'Settings',
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
            Ranking system
          </div>
          <h1 className="font-[family:var(--font-display)] text-[34px] font-extrabold leading-none text-[var(--fg)]">
            How points work
          </h1>
          <p className="mt-[var(--space-2)] max-w-[34rem] text-[14px] leading-6 text-[var(--muted)]">
            Weekly points rank a session. Skill rating measures long-term strength and updates when a session ends.
          </p>
        </header>

        <main className="px-[var(--space-5)]">
          <Section eyebrow="Weekly points" title="Match score">
            <FormulaCard />
          </Section>

          <Section eyebrow="Base" title="Starting points">
            <RulesCard>
              <StatRow label="Win" value="+10" />
              <StatRow label="Loss" value="+3" />
              <StatRow label="Attendance" value="+1" />
            </RulesCard>
          </Section>

          <Section eyebrow="Score bonus" title="Margin and close-game bonuses">
            <RulesCard>
              <RuleRow label="Winner by 1 to 3" value="+1" tone="good" />
              <RuleRow label="Winner by 4 to 7" value="+2" tone="good" />
              <RuleRow label="Winner by 8 to 15" value="+3" tone="good" />
              <RuleRow label="Winner by 16 or more" value="+4" tone="good" />
              <RuleRow label="Loser scores 20 or more" value="+3" tone="good" />
              <RuleRow label="Loser scores 18 to 19" value="+2" tone="good" />
              <RuleRow label="Loser scores 15 to 17" value="+1" tone="good" />
            </RulesCard>
          </Section>

          <Section eyebrow="Strength bonus" title="Opponent strength">
            <RulesCard>
              <RuleRow label="Win against similar teams" value="+1" tone="good" />
              <RuleRow label="Win against +101 to +250 stronger team" value="+2" tone="good" />
              <RuleRow label="Win against +251 to +400 stronger team" value="+4" tone="good" />
              <RuleRow label="Win against +401 or more stronger team" value="+6" tone="good" />
              <RuleRow label="Stronger team loses to +101 to +250 weaker team" value="-1" tone="warn" />
              <RuleRow label="Stronger team loses to +251 or more weaker team" value="-2" tone="warn" />
            </RulesCard>
          </Section>

          <Section eyebrow="Example" title="Upset win">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[var(--space-4)]">
              <div className="mb-[var(--space-4)] flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--accent)]">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-[family:var(--font-display)] text-[17px] font-extrabold text-[var(--fg)]">
                    Team A/B beats Team C/D, 21-18
                  </p>
                  <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                    A/B rating 850, C/D rating 1150
                  </p>
                </div>
              </div>
              <div className="border-t border-[var(--border)]">
                <RuleRow label="A/B winners" value="16 pts each" tone="good" />
                <RuleRow label="C/D losers" value="4 pts each" />
              </div>
            </div>
          </Section>

          <Section eyebrow="Skill rating" title="Long-term strength">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[var(--space-4)]">
              <div className="mb-[var(--space-4)] flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg)] text-[var(--accent)]">
                  <Medal className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-[family:var(--font-display)] text-[17px] font-extrabold text-[var(--fg)]">
                    Elo-style rating
                  </p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[var(--muted)]">
                    New players start at 1000. Team rating is the average rating of both players.
                  </p>
                </div>
              </div>
              <div className="border-t border-[var(--border)]">
                <StatRow label="Initial rating" value="1000" />
                <StatRow label="K factor" value="32" />
                <RuleRow label="Rating update timing" value="Session end" />
              </div>
            </div>
          </Section>

          <Section eyebrow="Sorting" title="Leaderboard order">
            <RulesCard>
              <RuleRow label="This session" value="Points, wins, diff" />
              <RuleRow label="Overall rankings" value="Rating, avg points, win rate, diff" />
            </RulesCard>
          </Section>
        </main>
      </div>
    </div>
  )
}
