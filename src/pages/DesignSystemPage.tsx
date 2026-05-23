import type { ReactNode } from 'react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AppBar, Button, Input, Badge, Card as DSCard, Tabs, MatchCard, SessionCard, ScoreBlock, ListItem, RankItem, StatRow, SectionHeader, EmptyState, LoadingState, ErrorState, Dialog, BottomSheet, BottomSheetItem, BottomSheetDivider, BottomSheetCancel } from '../../design-system/components'
import { Plus, Activity, Share2, Pencil, Trash2 } from 'lucide-react'

const IS_DEV = import.meta.env.DEV

/**
 * Dev-only catalogue of the app's visual language.
 *
 * Each section mirrors a real UI surface so designers/devs can preview
 * tokens, components, and states in one place. Pure render — no side effects.
 */
export default function DesignSystemPage() {
  if (!IS_DEV) return <Navigate to="/" replace />

  return (
    <div className="min-h-svh" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-5 space-y-8 pb-32">
        <HeaderSection />
        <AppBarSection />
        <ColorTokensSection />
        <TypographyTokensSection />
        <SpacingTokensSection />
        <RadiusTokensSection />
        <ButtonSection />
        <FABSection />
        <InputSection />
        <BadgeSection />
        <CardSection />
        <TabsSection />
        <MatchCardSection />
        <SessionCardSection />
        <ScoreBlockSection />
        <ListItemSection />
        <RankItemSection />
        <StatRowSection />
        <SectionHeaderSection />
        <PatternSection />
        <DialogSection />
        <BottomSheetSection />
        <DarkModeToggle />
      </div>
    </div>
  )
}

/* ---------- Section wrapper ---------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.08em] px-1"
        style={{ color: 'var(--muted)' }}
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-4 space-y-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {children}
    </div>
  )
}

/* ---------- Header ---------- */

function HeaderSection() {
  return (
    <div className="pb-5 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        className="text-[11px] uppercase tracking-[0.08em] mb-3"
        style={{ color: 'var(--muted)' }}
      >
        Design System
      </div>
      <h1
        className="text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em]"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
      >
        Badminton Tracker
      </h1>
      <p className="mt-3 text-[15px] max-w-[520px]" style={{ color: 'var(--muted)' }}>
        Japanese Sport / Vermilion direction. All tokens below adapt to light and dark themes.
      </p>
    </div>
  )
}

/* ---------- Color Tokens ---------- */

function ColorSwatch({ label, token }: { label: string; token: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 shrink-0"
        style={{
          background: `var(${token})`,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--fg)' }}>
          {label}
        </p>
        <p className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
          {token}
        </p>
      </div>
    </div>
  )
}

function AppBarSection() {
  return (
    <Section title="App Bar">
      <Card>
        <p className="text-[13px] mb-4" style={{ color: 'var(--muted)' }}>
          Sticky top navigation for sub-pages and detail views.
        </p>
        <div className="space-y-4">
          <AppBar
            title="Session detail"
            leftAction={{
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              ),
              onClick: () => {},
            }}
            rightAction={{
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              ),
              onClick: () => {},
            }}
          />
        </div>
      </Card>
    </Section>
  )
}

function ColorTokensSection() {
  return (
    <Section title="Color Tokens">
      <Card>
        <p className="text-[13px] mb-4" style={{ color: 'var(--muted)' }}>
          Six core tokens plus semantic status colors.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ColorSwatch label="Background" token="--bg" />
          <ColorSwatch label="Surface" token="--surface" />
          <ColorSwatch label="Foreground" token="--fg" />
          <ColorSwatch label="Muted" token="--muted" />
          <ColorSwatch label="Border" token="--border" />
          <ColorSwatch label="Accent (Vermilion)" token="--accent" />
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <ColorSwatch label="Success" token="--success" />
          <ColorSwatch label="Danger" token="--danger" />
          <ColorSwatch label="Warning" token="--warn" />
          <ColorSwatch label="Info" token="--info" />
        </div>
      </Card>
    </Section>
  )
}

/* ---------- Typography Tokens ---------- */

function TypeSample({
  name,
  size,
  family = 'display',
  children,
}: {
  name: string
  size: string
  family?: 'display' | 'body' | 'mono'
  children: ReactNode
}) {
  const fontFamily =
    family === 'display'
      ? 'var(--font-display)'
      : family === 'mono'
        ? 'var(--font-mono)'
        : 'var(--font-body)'

  return (
    <div className="pb-3 mb-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="text-[11px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--muted)' }}>
        {name}
      </div>
      <div style={{ fontFamily, fontSize: size }}>{children}</div>
    </div>
  )
}

function TypographyTokensSection() {
  return (
    <Section title="Typography">
      <Card>
        <TypeSample name="Display 3xl · 48px · Serif" size="var(--text-3xl)">
          <span className="font-extrabold leading-[1.05] tracking-[-0.03em]" style={{ color: 'var(--fg)' }}>
            Match History
          </span>
        </TypeSample>
        <TypeSample name="Display 2xl · 32px · Serif" size="var(--text-2xl)">
          <span className="font-extrabold leading-[1.1]" style={{ color: 'var(--fg)' }}>
            Create Session
          </span>
        </TypeSample>
        <TypeSample name="Display xl · 24px · Serif" size="var(--text-xl)">
          <span className="font-extrabold leading-[1.15] tracking-[-0.02em]" style={{ color: 'var(--fg)' }}>
            Player Profile
          </span>
        </TypeSample>
        <TypeSample name="Body lg · 18px · Mono" size="var(--text-lg)" family="body">
          <span className="font-normal leading-[1.6]" style={{ color: 'var(--fg)' }}>
            Select four players for a doubles match.
          </span>
        </TypeSample>
        <TypeSample name="Body base · 15px · Mono" size="var(--text-base)" family="body">
          <span className="font-normal leading-[1.6]" style={{ color: 'var(--fg)' }}>
            Track scores, wins, and player rankings across all sessions.
          </span>
        </TypeSample>
        <TypeSample name="Body sm · 13px · Mono" size="var(--text-sm)" family="body">
          <span className="font-medium leading-[1.3]" style={{ color: 'var(--muted)' }}>
            Last played 3 days ago · 12 matches total
          </span>
        </TypeSample>
        <TypeSample name="Body xs · 11px · Mono uppercase" size="var(--text-xs)" family="mono">
          <span className="font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--muted)' }}>
            Win rate · Points · Rank
          </span>
        </TypeSample>
      </Card>
    </Section>
  )
}

/* ---------- Spacing Tokens ---------- */

function SpacingBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-mono min-w-[80px]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div className="h-4" style={{ width: value, background: 'var(--fg)' }} />
      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
        {value}
      </span>
    </div>
  )
}

function SpacingTokensSection() {
  return (
    <Section title="Spacing Scale">
      <Card>
        <p className="text-[13px] mb-4" style={{ color: 'var(--muted)' }}>
          8px base unit. Use --space-4 (16px) as default padding, --space-5 (24px) for section gaps.
        </p>
        <div className="space-y-2">
          <SpacingBar label="space-1" value="4px" />
          <SpacingBar label="space-2" value="8px" />
          <SpacingBar label="space-3" value="12px" />
          <SpacingBar label="space-4" value="16px" />
          <SpacingBar label="space-5" value="24px" />
          <SpacingBar label="space-6" value="32px" />
          <SpacingBar label="space-7" value="48px" />
          <SpacingBar label="space-8" value="64px" />
        </div>
      </Card>
    </Section>
  )
}

/* ---------- Radius Tokens ---------- */

function RadiusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-16 h-16 shrink-0 flex items-center justify-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: value,
        }}
      >
        <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
          {value}
        </span>
      </div>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>
          {label}
        </p>
        <p className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
          {value === '0px' ? 'Buttons, inputs, badges' : value === '4px' ? 'Avatars, small containers' : 'Cards, modals, panels'}
        </p>
      </div>
    </div>
  )
}

function RadiusTokensSection() {
  return (
    <Section title="Radius">
      <Card>
        <p className="text-[13px] mb-4" style={{ color: 'var(--muted)' }}>
          Minimal rounding. Sharp for UI elements, slight rounding for cards.
        </p>
        <div className="space-y-3">
          <RadiusBox label="Small" value="0px" />
          <RadiusBox label="Medium" value="4px" />
          <RadiusBox label="Large" value="8px" />
        </div>
      </Card>
    </Section>
  )
}

/* ---------- Button Components ---------- */

function ButtonSection() {
  return (
    <Section title="Button">
      <DSCard>
        <p className="text-[13px] mb-3" style={{ color: 'var(--muted)' }}>
          Five variants + four sizes.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
        <Button size="block" className="mt-2">Block</Button>
      </DSCard>
    </Section>
  )
}

/* ---------- Floating Action Button ---------- */

const FAB_SHADOW = [
  '0 1px 2px oklch(0% 0 0 / 0.10)',
  '0 8px 24px oklch(55% 0.20 30 / 0.28)',
  '0 2px 6px oklch(55% 0.20 30 / 0.18)',
].join(', ')

const FAB_SHADOW_PRESSED = [
  '0 1px 2px oklch(0% 0 0 / 0.12)',
  '0 4px 12px oklch(55% 0.20 30 / 0.30)',
].join(', ')

const FAB_TRANSITION = [
  'transform 0.18s cubic-bezier(0.32, 0, 0.15, 1)',
  'box-shadow 0.18s ease',
  'opacity 0.12s ease',
].join(', ')

function FabInteractionHandlers() {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'translateY(-1px)'
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = ''
    },
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = 'translateY(0) scale(0.96)'
      e.currentTarget.style.boxShadow = FAB_SHADOW_PRESSED
    },
    onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = ''
      e.currentTarget.style.boxShadow = FAB_SHADOW
    },
  }
}

const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

function FABSection() {
  const handlers = FabInteractionHandlers()

  return (
    <Section title="Floating Action Button">
      <DSCard>
        <p className="text-[13px] mb-5" style={{ color: 'var(--muted)' }}>
          Hanko-style square stamp (56×56, 8px radius) anchored bottom-right within the screen. One per screen, reserved for the primary creation action. Vermilion accent with tinted shadow.
        </p>

        {/* Default variant */}
        <div className="flex items-center gap-5 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            aria-label="Create new"
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              background: 'var(--accent)',
              color: 'var(--surface)',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              touchAction: 'manipulation',
              boxShadow: FAB_SHADOW,
              transition: FAB_TRANSITION,
              WebkitTapHighlightColor: 'transparent',
            }}
            {...handlers}
          >
            <PlusIcon />
          </button>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>Default · 56×56</p>
            <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--muted)' }}>border-radius: var(--radius-lg) · 8px square stamp</p>
          </div>
        </div>

        {/* Extended variant */}
        <div className="flex items-center gap-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            aria-label="New session"
            className="shrink-0 inline-flex items-center"
            style={{
              height: 56,
              padding: '0 var(--space-4) 0 var(--space-3)',
              gap: 'var(--space-2)',
              background: 'var(--accent)',
              color: 'var(--surface)',
              border: 'none',
              borderRadius: 999,
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              touchAction: 'manipulation',
              boxShadow: FAB_SHADOW,
              transition: FAB_TRANSITION,
              WebkitTapHighlightColor: 'transparent',
            }}
            {...handlers}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New session</span>
          </button>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>Extended · with label</p>
            <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--muted)' }}>border-radius: 999px · use when icon alone is ambiguous</p>
          </div>
        </div>

        {/* Rules */}
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--muted)' }}>Rules of use</p>
          <ul className="space-y-2 text-[13px] list-disc pl-4" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            <li>One FAB per screen — reserved for the primary creation action.</li>
            <li>Fixed bottom-right, pinned inside max-w-lg container (never drifts on wide screens).</li>
            <li>Respects <code className="font-mono text-[12px]">env(safe-area-inset-bottom)</code> for notched devices.</li>
            <li>Use the extended variant only when the icon alone is ambiguous (multiple create surfaces).</li>
            <li>Fade + scale to 0.9 when a bottom sheet or modal opens so it doesn't compete with the backdrop.</li>
          </ul>
        </div>
      </DSCard>
    </Section>
  )
}

/* ---------- Input Components ---------- */

function InputSection() {
  const [text, setText] = useState('')
  const [number, setNumber] = useState('')

  return (
    <Section title="Input">
      <DSCard>
        <p className="text-[13px] mb-3" style={{ color: 'var(--muted)' }}>
          Text and number inputs with labels and hints.
        </p>
        <Input
          label="Player Name"
          placeholder="e.g. Nguyen Van A"
          value={text}
          onChange={(e) => setText(e.target.value)}
          hint="Enter the full name of the player."
        />
        <div className="mt-4">
          <Input
            label="Score"
            type="number"
            placeholder="0"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Input
            label="Error Example"
            placeholder="Invalid input"
            value=""
            onChange={() => {}}
            error="This field is required."
          />
        </div>
      </DSCard>
    </Section>
  )
}

/* ---------- Badge Components ---------- */

function BadgeSection() {
  return (
    <Section title="Badge">
      <DSCard>
        <p className="text-[13px] mb-3" style={{ color: 'var(--muted)' }}>
          Status indicators for match outcomes and labels.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="win">Win</Badge>
          <Badge variant="loss">Loss</Badge>
          <Badge variant="neutral">Pending</Badge>
          <Badge variant="accent">Live</Badge>
          <Badge>Default</Badge>
        </div>
      </DSCard>
    </Section>
  )
}

/* ---------- Card Components ---------- */

function CardSection() {
  return (
    <Section title="Card">
      <DSCard>
        <p className="text-[13px] mb-3" style={{ color: 'var(--muted)' }}>
          Static and interactive containers.
        </p>
        <DSCard>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>
            Static Card
          </p>
          <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>
            Content container with border and background.
          </p>
        </DSCard>
        <div className="mt-3">
          <DSCard interactive onClick={() => alert('Card clicked!')}>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>
              Interactive Card
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>
              Tap to see active state. Has cursor-pointer and active:bg.
            </p>
          </DSCard>
        </div>
      </DSCard>
    </Section>
  )
}

/* ---------- Tabs Components ---------- */

function TabsSection() {
  const [activeTab, setActiveTab] = useState('All Matches')

  return (
    <Section title="Tabs">
      <DSCard>
        <p className="text-[13px] mb-3" style={{ color: 'var(--muted)' }}>
          Underline indicator with animated slide.
        </p>
        <Tabs
          tabs={['All Matches', 'Today', 'This Week', 'Archive']}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <p className="text-[13px] mt-4" style={{ color: 'var(--muted)' }}>
          Active tab: <span className="font-semibold" style={{ color: 'var(--fg)' }}>{activeTab}</span>
        </p>
      </DSCard>
    </Section>
  )
}

/* ---------- Match Card ---------- */

function MatchCardSection() {
  return (
    <Section title="Match Card">
      <p className="text-[13px] px-1" style={{ color: 'var(--muted)' }}>Live</p>
      <MatchCard
        status="LIVE"
        teamAPlayers={['Minh', 'Tuan']}
        teamBPlayers={['Huy', 'Dat']}
        scoreA={18}
        scoreB={14}
        matchLabel="M3 · 19:15"
        duration="32 min"
        type="Men's Doubles"
      />
      <p className="text-[13px] px-1 mt-2" style={{ color: 'var(--muted)' }}>Completed — Team A wins</p>
      <MatchCard
        status="COMPLETED"
        teamAWon
        teamAPlayers={['Minh', 'Tuan']}
        teamBPlayers={['Huy', 'Dat']}
        scoreA={21}
        scoreB={18}
        matchLabel="M2 · 18:30"
        duration="48 min"
        type="Men's Doubles"
      />
      <p className="text-[13px] px-1 mt-2" style={{ color: 'var(--muted)' }}>Completed — Team B wins</p>
      <MatchCard
        status="COMPLETED"
        teamAWon={false}
        teamAPlayers={['Minh', 'Tuan']}
        teamBPlayers={['Long', 'Khoa']}
        scoreA={16}
        scoreB={21}
        matchLabel="M1 · 17:00"
        duration="35 min"
        type="Men's Doubles"
      />
      <p className="text-[13px] px-1 mt-2" style={{ color: 'var(--muted)' }}>Scheduled</p>
      <MatchCard
        status="SCHEDULED"
        teamAPlayers={['Minh', 'Tuan']}
        teamBPlayers={['Huy', 'Dat']}
        matchLabel="M4 · 20:00"
        type="Men's Doubles"
      />
    </Section>
  )
}

/* ---------- Session Card ---------- */

function SessionCardSection() {
  return (
    <Section title="Session Card">
      <p className="text-[13px] px-1" style={{ color: 'var(--muted)' }}>Active</p>
      <SessionCard
        status="active"
        name="Friday Night Session"
        dateTime="Today · 7:30 PM"
        duration="1h 42m"
        matchCount={5}
        topPlayer={{ name: 'Tuan', record: '3W – 1L · played 4', winRate: 75 }}
      />
      <p className="text-[13px] px-1 mt-2" style={{ color: 'var(--muted)' }}>Active — no matches yet</p>
      <SessionCard
        status="active"
        name="Friday Night Session"
        dateTime="Today · 7:30 PM"
        duration="0m"
        matchCount={0}
      />
      <p className="text-[13px] px-1 mt-2" style={{ color: 'var(--muted)' }}>Scheduled</p>
      <SessionCard
        status="scheduled"
        name="Saturday Session"
        dateTime="Tomorrow · 7:00 PM"
        duration="Not started"
        matchCount={0}
      />
      <p className="text-[13px] px-1 mt-2" style={{ color: 'var(--muted)' }}>Completed</p>
      <SessionCard
        status="completed"
        name="Wednesday Session"
        dateTime="May 21, 2025 · 6:00 PM"
        duration="2h 15m"
        matchCount={8}
        topPlayer={{ name: 'Minh', record: '5W – 1L · played 6', winRate: 83 }}
      />
    </Section>
  )
}

/* ---------- Score Block ---------- */

function ScoreBlockSection() {
  return (
    <Section title="Score Block">
      <ScoreBlock teamAName="Team A" teamBName="Team B" scoreA={21} scoreB={18} />
    </Section>
  )
}

/* ---------- List Item ---------- */

function ListItemSection() {
  return (
    <Section title="List Item">
      <DSCard style={{ padding: 0 }}>
        <ListItem avatar="MT" title="Minh Tran" subtitle="24 matches · 18 wins" action="75%" />
        <ListItem avatar="TN" title="Tuan Nguyen" subtitle="24 matches · 16 wins" action="67%" />
        <ListItem avatar="HL" title="Huy Le" subtitle="20 matches · 12 wins" action="60%" />
      </DSCard>
    </Section>
  )
}

/* ---------- Rank Item ---------- */

function RankItemSection() {
  return (
    <Section title="Rank Item">
      <DSCard style={{ padding: 0 }}>
        <RankItem rank={1} avatar="MT" name="Minh Tran" stats="24 matches · 18 wins" winRate={75} />
        <RankItem rank={2} avatar="TN" name="Tuan Nguyen" stats="24 matches · 16 wins" winRate={67} />
        <RankItem rank={3} avatar="HL" name="Huy Le" stats="20 matches · 12 wins" winRate={60} />
      </DSCard>
    </Section>
  )
}

/* ---------- Stat Row ---------- */

function StatRowSection() {
  return (
    <Section title="Stat Row">
      <DSCard>
        <StatRow label="Matches Today" value={4} />
        <StatRow label="Win Rate" value="50%" />
        <StatRow label="Total Sessions" value={12} />
      </DSCard>
    </Section>
  )
}

/* ---------- Section Header ---------- */

function SectionHeaderSection() {
  return (
    <Section title="Section Header">
      <SectionHeader title="Rankings" action={{ label: 'View All', onClick: () => {} }} />
      <SectionHeader title="Quick Stats" />
    </Section>
  )
}

/* ---------- Patterns ---------- */

function PatternSection() {
  return (
    <Section title="Patterns">
      <p className="text-[13px] px-1" style={{ color: 'var(--muted)' }}>Empty State</p>
      <EmptyState
        icon={<span className="text-[32px]">🏸</span>}
        title="No matches yet"
        description="Create your first session to start tracking scores and player stats."
        action={{ label: 'Create Match', onClick: () => {}, variant: 'accent' }}
      />
      <p className="text-[13px] px-1 mt-4" style={{ color: 'var(--muted)' }}>Loading State</p>
      <DSCard><LoadingState message="Loading sessions..." /></DSCard>
      <p className="text-[13px] px-1 mt-4" style={{ color: 'var(--muted)' }}>Error State</p>
      <ErrorState
        message="Failed to load player data. Please check your connection."
        onRetry={() => {}}
      />
    </Section>
  )
}

/* ---------- Dialog ---------- */

function DialogSection() {
  const [openKind, setOpenKind] = useState<'info' | 'warning' | 'danger' | 'two-actions' | null>(null)

  return (
    <Section title="Dialog">
      <DSCard>
        <p className="text-[13px] mb-4" style={{ color: 'var(--muted)' }}>
          Bottom-sheet overlay for errors, warnings, and confirmations. Backdrop click dismisses.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="ghost" onClick={() => setOpenKind('info')}>Info dialog</Button>
          <Button variant="ghost" onClick={() => setOpenKind('warning')}>Warning dialog</Button>
          <Button variant="danger" onClick={() => setOpenKind('danger')}>Danger dialog</Button>
          <Button variant="secondary" onClick={() => setOpenKind('two-actions')}>Two actions</Button>
        </div>
      </DSCard>

      <Dialog
        open={openKind === 'info'}
        onClose={() => setOpenKind(null)}
        kind="info"
        title="Session saved"
        description="Your session has been saved and is now visible on the sessions list."
      />
      <Dialog
        open={openKind === 'warning'}
        onClose={() => setOpenKind(null)}
        kind="warning"
        title="Tournament already tracked"
        description="A session for this tournament already exists. Choose a different tournament or use a custom name."
      />
      <Dialog
        open={openKind === 'danger'}
        onClose={() => setOpenKind(null)}
        kind="danger"
        title="Failed to create session"
        description="Something went wrong on our end. Please try again in a moment."
      />
      <Dialog
        open={openKind === 'two-actions'}
        onClose={() => setOpenKind(null)}
        kind="danger"
        title="Delete session?"
        description="This will remove the session and all its matches permanently."
        actions={[
          { label: 'Cancel', onClick: () => setOpenKind(null), variant: 'ghost' },
          { label: 'Delete', onClick: () => setOpenKind(null), variant: 'danger' },
        ]}
      />
    </Section>
  )
}

/* ---------- Bottom Sheet ---------- */

function BottomSheetSection() {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <Section title="Bottom Sheet">
      <DSCard>
        <p className="text-[13px] mb-1" style={{ color: 'var(--muted)' }}>
          Context-menu sheet composed of four primitives: <code className="font-mono text-[12px]">BottomSheet</code>, <code className="font-mono text-[12px]">BottomSheetItem</code>, <code className="font-mono text-[12px]">BottomSheetDivider</code>, <code className="font-mono text-[12px]">BottomSheetCancel</code>.
        </p>
        <p className="text-[13px] mb-4" style={{ color: 'var(--muted)' }}>
          Panel slides up from the bottom with a backdrop. Tap the backdrop or Cancel to dismiss.
        </p>
        <Button variant="ghost" onClick={() => setDemoOpen(true)}>Open demo sheet</Button>
      </DSCard>

      {/* Anatomy preview — static inline layout mirroring the actual sheet */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <div className="pt-4 pb-2 flex flex-col items-center gap-2">
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--muted)' }}>
            Sheet anatomy (static)
          </span>
        </div>

        {/* Regular items */}
        <BottomSheetItem
          icon={<Plus className="w-5 h-5" />}
          label="New match"
          onClick={() => {}}
        />
        <BottomSheetItem
          icon={<Activity className="w-5 h-5" />}
          label="View player stats"
          onClick={() => {}}
        />
        <BottomSheetItem
          icon={<Share2 className="w-5 h-5" />}
          label="Share session"
          onClick={() => {}}
        />
        <BottomSheetItem
          icon={<Pencil className="w-5 h-5" />}
          label="Rename"
          onClick={() => {}}
        />

        {/* Divider + danger items */}
        <BottomSheetDivider />
        <BottomSheetItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          }
          label="End session"
          danger
          onClick={() => {}}
        />
        <BottomSheetItem
          icon={<Trash2 className="w-5 h-5" />}
          label="Delete session"
          danger
          onClick={() => {}}
        />

        {/* Cancel */}
        <div style={{ padding: '0 var(--space-3) var(--space-3)' }}>
          <BottomSheetCancel onClick={() => {}} />
        </div>
      </div>

      {/* Spec table */}
      <DSCard>
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-3" style={{ color: 'var(--muted)' }}>
          Spec
        </p>
        <div className="space-y-2 text-[13px]" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[12px] w-28" style={{ color: 'var(--fg)' }}>Panel bg</span>
            <span>var(--surface)</span>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[12px] w-28" style={{ color: 'var(--fg)' }}>Radius</span>
            <span>var(--radius-lg) var(--radius-lg) 0 0</span>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[12px] w-28" style={{ color: 'var(--fg)' }}>Backdrop</span>
            <span>oklch(0% 0 0 / 0.45) + blur(2px)</span>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[12px] w-28" style={{ color: 'var(--fg)' }}>Open easing</span>
            <span>0.3s cubic-bezier(0.32, 0, 0.15, 1)</span>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[12px] w-28" style={{ color: 'var(--fg)' }}>Item height</span>
            <span>52px min</span>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[12px] w-28" style={{ color: 'var(--fg)' }}>Danger color</span>
            <span>var(--danger)</span>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[12px] w-28" style={{ color: 'var(--fg)' }}>z-index</span>
            <span>backdrop 100 · panel 101</span>
          </div>
        </div>
      </DSCard>

      {/* Interactive demo */}
      <BottomSheet open={demoOpen} onClose={() => setDemoOpen(false)}>
        <BottomSheetItem
          icon={<Plus className="w-5 h-5" />}
          label="New match"
          onClick={() => setDemoOpen(false)}
        />
        <BottomSheetItem
          icon={<Activity className="w-5 h-5" />}
          label="View player stats"
          onClick={() => setDemoOpen(false)}
        />
        <BottomSheetItem
          icon={<Share2 className="w-5 h-5" />}
          label="Share session"
          onClick={() => setDemoOpen(false)}
        />
        <BottomSheetItem
          icon={<Pencil className="w-5 h-5" />}
          label="Rename"
          onClick={() => setDemoOpen(false)}
        />
        <BottomSheetDivider />
        <BottomSheetItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          }
          label="End session"
          danger
          onClick={() => setDemoOpen(false)}
        />
        <BottomSheetItem
          icon={<Trash2 className="w-5 h-5" />}
          label="Delete session"
          danger
          onClick={() => setDemoOpen(false)}
        />
        <BottomSheetCancel onClick={() => setDemoOpen(false)} />
      </BottomSheet>
    </Section>
  )
}

/* ---------- Dark Mode Toggle ---------- */

function DarkModeToggle() {
  const toggleTheme = () => {
    const html = document.documentElement
    const current = html.getAttribute('data-theme')
    const next = current === 'dark' ? null : 'dark'
    if (next) html.setAttribute('data-theme', next)
    else html.removeAttribute('data-theme')
    localStorage.setItem('bt-theme', next || 'light')
  }

  return (
    <Section title="Theme Toggle">
      <button
        onClick={toggleTheme}
        className="w-full py-3.5 font-semibold text-[15px] active:opacity-70 transition-opacity"
        style={{
          background: 'var(--fg)',
          color: 'var(--surface)',
          border: '2px solid var(--fg)',
          borderRadius: 'var(--radius-sm)',
          minHeight: 52,
        }}
      >
        Toggle Light / Dark
      </button>
    </Section>
  )
}
