# Design Guidelines

Source of truth for the app's visual language — **Japanese Sport / Vermilion** design system. The dev-only `/settings/design-system` route renders every token & component below for in-app preview.

> **App MUST respect this system.** New components reuse the tokens defined in `design-system/tokens/tokens.css`; don't invent new shades, radii, or text sizes without updating this file and the Design System page in lockstep.

All tokens are CSS custom properties loaded from `design-system/tokens/tokens.css`. Use them in Tailwind via `bg-[var(--token)]`, `text-[var(--token)]`, etc.

---

## Surface

- Mobile-first, max width `512px` (`max-w-lg`) centered.
- Background: `var(--bg)` (near-white / near-black in dark).
- Cards: `var(--surface)` with `border border-[var(--border)]`.
- Design philosophy: near-brutalist sharpness. Buttons and inputs have 0px radius; cards get 8px.

---

## Colors

All colors use `oklch()` for perceptually uniform lightness. Light mode is the default; dark mode activates via `[data-theme="dark"]` on `<html>`.

### Core Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg` | oklch(99% 0.003 50) | oklch(12% 0.02 50) | Page background |
| `--surface` | oklch(100% 0 0) | oklch(15% 0.018 50) | Cards, modals, inputs |
| `--fg` | oklch(12% 0.02 50) | oklch(95% 0.005 50) | Primary text, icon fills |
| `--muted` | oklch(50% 0.01 50) | oklch(55% 0.01 50) | Secondary text, placeholders |
| `--border` | oklch(88% 0.008 50) | oklch(28% 0.015 50) | Dividers, card borders |
| `--accent` | oklch(55% 0.20 30) | oklch(60% 0.18 30) | Vermilion — CTAs, live indicator, winner score |
| `--accent-soft` | oklch(96% 0.025 30) | oklch(22% 0.04 30) | Tinted accent background — selected chip fills, queue stamps |

### Semantic Status

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--success` | oklch(50% 0.14 145) | oklch(55% 0.12 145) | Win badges |
| `--danger` | oklch(55% 0.20 25) | oklch(60% 0.18 25) | Loss, delete actions |
| `--warn` | oklch(70% 0.14 85) | oklch(70% 0.12 85) | Warnings |
| `--info` | oklch(55% 0.12 250) | oklch(55% 0.10 250) | Info hints |

```html
<!-- Usage pattern -->
<div class="bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)]">
  <span class="text-[var(--accent)]">Accent text</span>
</div>
```

---

## Typography

System font stack via CSS custom properties.

| Token | Stack |
|-------|-------|
| `--font-display` | -apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, Segoe UI |
| `--font-body` | -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, Segoe UI |
| `--font-mono` | ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo |

### Type Scale

| Token | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| `--text-xs` | 11px | 700 | 1 | 0.06em (uppercase) | Badges, labels, meta |
| `--text-sm` | 13px | 500 | 1.3 | — | Captions, subtitles |
| `--text-base` | 15px | 400 | 1.6 | — | Body text, inputs |
| `--text-lg` | 18px | 700 | 1.2 | -0.01em | Team names, scores |
| `--text-xl` | 24px | 800 | 1.15 | -0.02em | Session names |
| `--text-2xl` | 32px | 800 | 1.1 | -0.03em | Section titles |
| `--text-3xl` | 48px | 800 | 1.05 | -0.03em | Page titles |

---

## Spacing

8px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon gaps, tight padding |
| `--space-2` | 8px | Small gaps, icon-text spacing |
| `--space-3` | 12px | Default component gaps |
| `--space-4` | 16px | Card internal padding |
| `--space-5` | 24px | Section gaps, page padding |
| `--space-6` | 32px | Large section spacing |
| `--space-7` | 48px | Page header spacing |
| `--space-8` | 64px | Major section breaks |

**Common patterns:**
- Card padding: `p-[var(--space-4)]` (16px)
- Page padding: `px-[var(--space-5)]` (24px)
- Gap between cards: `gap-[var(--space-3)]` (12px)
- Bottom safe-area room: enough to clear bottom nav + FAB

---

## Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0px | Buttons, inputs, badges — sharp |
| `--radius-md` | 4px | Avatars, small containers |
| `--radius-lg` | 8px | Cards, panels |
| `--radius-xl` | 16px | Dialogs, bottom sheets |

---

## Buttons

See [design-system/components/button.tsx](../design-system/components/button.tsx) for the reference implementation.

| Variant | Styles |
|---------|--------|
| `primary` | `bg-[var(--fg)] text-[var(--surface)] border-2 border-[var(--fg)]` |
| `secondary` | `bg-transparent text-[var(--fg)] border-2 border-[var(--fg)]` |
| `ghost` | `bg-transparent text-[var(--muted)] border border-[var(--border)]` |
| `accent` | `bg-[var(--accent)] text-[var(--surface)] border-2 border-[var(--accent)]` |
| `danger` | `bg-[var(--danger)] text-[var(--surface)] border-2 border-[var(--danger)]` |

**Sizes:** `sm` (36px min-height, 13px text) / `default` (52px, 15px) / `lg` (52px, 18px) / `block` (full-width).

All buttons:
- `rounded-[var(--radius-sm)]` — sharp corners (0px)
- `active:opacity-70` for press feedback
- `minHeight: 52` (36 for sm) — 44px+ touch targets
- `touchAction: manipulation`

---

## Floating Action Button

See [src/components/FloatingActionButton.tsx](../src/components/FloatingActionButton.tsx) for the implementation.

Hanko-style square stamp anchored bottom-right within the mobile container.

| Property | Value |
|----------|-------|
| Size | 56×56px |
| Shape | `border-radius: var(--radius-lg)` (8px) — **not** circular |
| Color | `background: var(--accent)` (vermilion) |
| Shadow | 3-layer oklch: base + colored lift + tinted spread |
| Press | `scale(0.96) translateY(0)` + compressed shadow |
| Hover | `translateY(-1px)` |
| Transition | `transform 0.18s cubic-bezier(0.32, 0, 0.15, 1)` + box-shadow + opacity |
| Focus | `outline: 2px solid var(--fg); outline-offset: 3px` |

**Extended variant:** pill shape (`border-radius: 999px`), auto-width with label, 18px icon. Use only when the icon alone is ambiguous.

**Rules:**
- One FAB per screen — reserved for the primary creation action.
- Fixed bottom-right, pinned inside `max-w-lg` container so it never drifts on wide screens.
- Respects `env(safe-area-inset-bottom)` for notched devices.
- Fade + scale to 0.9 when a bottom sheet or modal opens.

```
Shadow tokens:
0 1px 2px oklch(0% 0 0 / 0.10)         — base drop
0 8px 24px oklch(55% 0.20 30 / 0.28)   — colored lift
0 2px 6px oklch(55% 0.20 30 / 0.18)    — tinted spread
```

---

## Form Inputs

See [design-system/components/input.tsx](../design-system/components/input.tsx).

- Base: `px-4 py-3.5 text-[15px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)]`
- Focus: `focus:border-[var(--fg)] focus:border-2`
- Error: border changes to `var(--danger)`
- Label: `text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]`
- Hint/error text: `text-[11px]` below the input
- Min-height: 52px

---

## Cards

See [design-system/components/card.tsx](../design-system/components/card.tsx).

- Base: `bg-[var(--surface)] border border-[var(--border)] p-4 rounded-[var(--radius-lg)]`
- Interactive: `cursor-pointer active:bg-[var(--bg)]`
- Active sessions / live matches: `border-2 border-[var(--accent)]` instead of default border

---

## Badges

See [design-system/components/badge.tsx](../design-system/components/badge.tsx).

Sharp-cornered (radius-sm), bold uppercase, 11px text, `tracking-[0.06em]`.

| Variant | Usage |
|---------|-------|
| `win` | `bg-[var(--success)]` — win outcomes |
| `loss` | `bg-[var(--danger)]` — loss outcomes |
| `accent` | `bg-[var(--accent)]` — live sessions |
| `neutral` | `bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]` — completed |
| `default` | `bg-[var(--bg)] border-[var(--border)] text-[var(--fg)]` — general labels |

---

## Component Specs

### Avatar
See [design-system/components/avatar.tsx](../design-system/components/avatar.tsx).

- **Shape:** `border-radius: var(--radius-md)` rectangle (not circular)
- **Fallback:** 2-letter initials — first letter of first word + first letter of last word (e.g. `"Danh Nguyen"` → `"DN"`); single-word names use first 2 chars
- **Default bg:** `var(--accent)` (vermilion red); **default text:** `var(--surface)` (white)
- **Font:** `var(--font-display)`, weight 800, `font-size: size * 0.33`
- Custom `bgColor` / `textColor` props override the defaults (used by `PlayerSelector` for team-colored states)
- Image support: renders `<img>` when `src` is provided; falls back to initials on error
- Multiavatar URLs (from the default avatar picker) are resolved to SVG via `src/lib/avatar.ts`

```tsx
// Canonical import
import { Avatar } from '../../design-system/components'
// or via re-export shim (src components only)
import Avatar from '../components/Avatar'
```

**Usage:**
```tsx
<Avatar name="Danh Nguyen" size={36} />
<Avatar src={player.avatar_url} name={player.name} size={40} />
<Avatar name="Tuan" size={28} bgColor="var(--fg)" textColor="var(--surface)" />
```

### Player Names

- Use full player names only on the player's own profile page and in edit/search inputs.
- Use `formatShortPlayerName()` from `src/lib/player-name.ts` for visible player names everywhere else.
- Format: first word + initials for every remaining word (`"Danh Nguyen"` → `"Danh N."`, `"Nhan Duong Ngoc"` → `"Nhan D. N."`).
- Continue passing the full stored name into `<Avatar name={player.name} />` so initials and image alt text remain correct.

---

### SessionCard
See [design-system/components/session-card.tsx](../design-system/components/session-card.tsx).

- Active: `border-2 border-[var(--accent)]` + pulsing `w-2 h-2 rounded-full animate-pulse` dot in accent color
- Scheduled: `Scheduled` badge shown with neutral/transparent styling and the same accent border as open sessions
- Completed: neutral badge and default card border
- Session name: 24px extrabold display font (`--font-display`), `--fg`
- DateTime: 13px mono, `--muted`
- Meta row: 13px mono (`--muted`) with match count and duration
- Active sessions with no matches: show placeholder text `No matches started yet` in the bottom panel
- Scheduled sessions: use section label `Players` and placeholder text `Session hasn’t started yet`
- Top Player / MVP section: uses `<Avatar>` component (accent bg, 2-letter initials), win rate in accent
- Compact variant: tighter padding, smaller text

### MatchCard
See [design-system/components/match-card.tsx](../design-system/components/match-card.tsx).

Three states driven by `match.status: 'SCHEDULED' | 'LIVE' | 'COMPLETED'`.

**Border:**
- `LIVE` → `border-2 border-[var(--accent)]`
- `SCHEDULED` / `COMPLETED` → `border border-[var(--border)]` (1px normal)

**Meta bar (top row):**
- Left: `M{N} · HH:MM` — match number + start time (`played_at`), 11px mono muted uppercase. Shows `dateLabel` instead when provided (e.g. on player history page).
- Right: pulsing dot + `LIVE` label in accent for LIVE; `Scheduled` neutral badge for SCHEDULED; nothing for COMPLETED.

**Teams row:**
- Each player rendered on its own row (13px display font).
- `Team A` / `Team B` label in 11px mono muted below the player names.
- Winner side: `font-weight: 800`, `color: --fg`. Loser side: `font-weight: 500`, `color: --muted`.
- Score center anchor: 32px extrabold display. Winner score `--accent`, loser score `--muted`, no-result `--fg`. Divider `:` in `--border` at 24px.
- `W` / `L` indicator: 11px bold mono uppercase below the score, shown only for `COMPLETED`. `W` in `--accent`, `L` in `--muted` — always from Team A's perspective.

**Footer (bottom row, separated by top border):**
- Left: duration string (e.g. `32 min`, `1h 5m`). Computed from `ended_at − played_at` when `ended_at` is present; falls back to elapsed from `played_at` for LIVE. Shows `Not started` for SCHEDULED. Shows additional set scores when match has more than one set.
- Right: match type label (e.g. `Men's Doubles`), 11px mono muted uppercase.

**`ended_at` field:** Set on the `matches` table when `useRecordResult` is called. Used to compute exact match duration. Defined as `ended_at?: string | null` on the `Match` type in `src/types/database.ts`.

```tsx
// Design-system dumb component (for /settings/design-system preview)
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

// Production component (src/components/MatchCard.tsx) — takes MatchWithDetails directly
<MatchCard match={match} matchNumber={2} />
```

### ListItem
See [design-system/components/list-item.tsx](../design-system/components/list-item.tsx).

- 40×40px `<Avatar>` (rectangle, 2-letter initials, accent bg)
- Title: 15px `--fg`, subtitle: 13px `--muted`
- Optional right-side action slot
- Interactive: `active:bg-[var(--bg)]`

### RankItem
See [design-system/components/rank-item.tsx](../design-system/components/rank-item.tsx).

- Rank number: `--accent` for top 2, `--muted` for others
- Avatar: `<Avatar>` component (rectangle, 2-letter initials)
- Win rate: right-aligned, 15px extrabold `--accent`

### StatRow
See [design-system/components/stat-row.tsx](../design-system/components/stat-row.tsx).

- Label: left, `--muted`; value: right, large `--accent`
- Bottom border divider: `var(--border)`

### SectionHeader
See [design-system/components/section-header.tsx](../design-system/components/section-header.tsx).

- Title: 24px extrabold `--fg`
- Optional action: right-aligned, `--accent`

### Tabs
See [design-system/components/tabs.tsx](../design-system/components/tabs.tsx).

- Animated underline indicator in `--fg`
- Active tab: `--fg`; inactive: `--muted`
- Transition: `--duration-normal`

---

### MatchTypeChips

See [design-system/components/match-type-chips.tsx](../design-system/components/match-type-chips.tsx).

Radio-group chip selector for the five badminton match types (MS / WS / MD / WD / XD).

- Outer grid: `repeat(5, 1fr)`, `gap: var(--space-2)`
- Each chip: `min-height: 64px`, `border-radius: var(--radius-lg)`, `display: flex flex-col center`
- **Inactive**: `background: var(--surface)`, `border: 1px solid var(--border)`
- **Active**: `background: var(--accent-soft)`, `border: 2px solid var(--accent)` (padding shrinks by 1px to avoid layout shift)
- Code text (e.g. `MD`): `var(--font-display)`, 18px, 800 weight — accent when active, fg otherwise
- Tag text (e.g. `Men D.`): `var(--font-mono)`, 9px, uppercase, 0.08em tracking — accent at 80% opacity when active
- Uses `role="radiogroup"` on container, `role="radio" aria-checked` on each button
- Press: `active:opacity-70` from parent context; no scale transform

**Token dependency:** requires `--accent-soft` (`oklch(96% 0.025 30)` light / `oklch(22% 0.04 30)` dark).

```tsx
<MatchTypeChips value={matchType} onChange={setMatchType} />
```

### SegmentedControl

Two-segment mode switcher with a sliding filled track. Used for binary choices (e.g. "Start now / Schedule").

- Outer container: `grid grid-cols-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-[3px]`
- Sliding track: `absolute bg-[var(--fg)] rounded-[6px]`, width `calc(50% - 3px)`, animated with `translateX(100%)` for right segment
- Transition: `transform 280ms cubic-bezier(0.32, 0, 0.15, 1)`
- Active segment text: `text-[var(--surface)]`; inactive: `text-[var(--muted)]`
- Segment button: `min-h-[40px]`, `font-semibold`, `text-[13px]`
- Use `role="tablist"` on the container and `role="tab" aria-selected` on buttons

### SuggestCard

Selectable suggestion card — used to present AI/data-driven recommendations (e.g. tournament names).

- Layout: `flex items-center gap-3 min-h-[56px] px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]`
- **Default**: `border-[var(--border)]` (1px)
- **Selected**: `border-[var(--accent)]` (2px) — compensate padding by –1px to avoid layout shift
- Stamp (index number): `w-8 h-8 rounded-[var(--radius-md)]`; default `bg-[var(--bg)] text-[var(--muted)]`; selected `bg-[var(--accent)] text-[var(--surface)]`
- Name: 15px display font, `font-bold`, `text-[var(--fg)]`
- Tag: 11px mono, uppercase, `tracking-[0.06em]`, `text-[var(--muted)]`
- Checkmark circle: `w-[22px] h-[22px] rounded-full border border-[var(--border)]`; selected `bg-[var(--accent)] border-[var(--accent)]` with a 12px check SVG inside
- Skeleton loading: `animate-pulse` on the whole row, stamp and checkmark filled with `bg-[var(--border)]`
- Use `role="radio" aria-checked` on each card; wrap list in `role="radiogroup"`

### SectionLabel

Mono uppercase label above a form section — pairs with an optional right-side action button.

- `font-[family:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]`
- Right action: `text-[var(--accent)] font-semibold text-[13px]`, min-height 32px

### OrDivider

Horizontal rule with centred text — separates recommended options from a custom input.

```tsx
<div className="flex items-center gap-3 my-4 font-[family:var(--font-mono)] uppercase tracking-[0.1em] text-[var(--muted)]"
     style={{ fontSize: 11 }}>
  <span className="flex-1 h-px bg-[var(--border)]" />
  Or
  <span className="flex-1 h-px bg-[var(--border)]" />
</div>
```

### App Bar

Sticky top app bar for page-level navigation and detail views.

**Always use `<AppBar>` from `design-system/components` — never build a custom nav bar.** Import it as:

```tsx
import { AppBar } from '../../design-system/components'
```

- AppBar is required on all sub-pages and detail views (e.g. `/players/:id`, `/sessions/:id`, `/sessions/:id/matches/:id`)
- AppBar is hidden on tab routes (`/`, `/sessions`, `/players`, `/settings`) — the bottom nav replaces it
- Full-screen flow pages (e.g. `/sessions/new`) own their own nav bar but should still use `<AppBar>` for consistency
- Pass `safeArea` prop on pages that are the first thing below the status bar
- Pass `stuck` when the page is scrolled (bind to a scroll listener on the content container)

Props reference (see [design-system/components/app-bar.tsx](../design-system/components/app-bar.tsx)):

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | Page or entity name |
| `titleAlign` | `'center' \| 'left'` | Default `'left'` |
| `titleVisible` | `boolean` | Animate title in/out on scroll |
| `backLabel` | `string` | Label next to the back chevron |
| `onBack` | `() => void` | Use `navigate(-1)` or a specific route |
| `leftAction` / `rightAction` | `AppBarAction` | Custom icon/text buttons |
| `stuck` | `boolean` | Adds `border-b border-[var(--border)]` when scrolled |
| `safeArea` | `boolean` | Adds `env(safe-area-inset-top)` top padding |

Underlying styles (for reference only — use the component, not raw CSS):

- Container: `sticky top-0 z-40 bg-[color-mix(in oklch, var(--bg) 88%, transparent)] backdrop-blur-xl border-b border-transparent`
- Layout: `grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3`
- Left action: icon button with `text-[var(--accent)]`, `font-[family:var(--font-body)]`, `font-medium`, and `active:opacity-70`
- Title: centered, `font-[family:var(--font-display)] font-bold text-[15px] tracking-[-0.01em]`

### Full-screen Page Layout

Pages that own their full viewport (no global AppBar or bottom nav). Add the route to `FULL_SCREEN_ROUTES` in `src/App.tsx`.

Structure:
```
<div className="min-h-[100dvh] flex flex-col bg-[var(--bg)]">
  <nav>                   ← sticky top-0, backdrop-blur, 3-col grid (action | title | action)
  <div className="flex-1 overflow-y-auto overscroll-contain">
    <header>              ← large title (48px display font) + subtitle
    <section> × N        ← form sections, px-6
  </div>
  <div>                   ← sticky bottom-0 CTA bar, backdrop-blur, border-t
</div>
```

- Nav background: `color-mix(in oklch, var(--bg) 88%, transparent)` with `backdrop-filter: saturate(180%) blur(12px)`
- Nav border: `border-b border-transparent`; add `border-[var(--border)]` when `scrollTop > 4` (`.is-stuck`)
- Nav Cancel/action button: `text-[var(--accent)] font-medium text-[15px] min-h-[44px]`
- Nav title: `font-[family:var(--font-display)] font-bold text-[15px] tracking-[-0.01em] text-center`
- Scroll area bottom padding: `max(120px, calc(env(safe-area-inset-bottom) + 104px))`
- CTA bar padding: `12px 24px max(16px, calc(env(safe-area-inset-bottom) + 12px))`
- CTA bar background: `color-mix(in oklch, var(--bg) 92%, transparent)` with same backdrop-filter
- CTA button (enabled): `bg-[var(--accent)] text-[var(--surface)]`, `rounded-[var(--radius-lg)]`, `min-h-[52px]`, shadow `0 1px 2px oklch(0% 0 0 / 0.08), 0 6px 18px oklch(55% 0.20 30 / 0.22)`
- CTA button (disabled): `bg-[var(--border)] text-[var(--muted)]`, no shadow, `cursor-not-allowed`

---

## Patterns

### EmptyState
See [design-system/patterns/empty-state.tsx](../design-system/patterns/empty-state.tsx).

- Icon: `--muted`, centered
- Title: 24px extrabold
- Description: 13px `--muted`
- Action: accent Button

### ErrorState
See [design-system/patterns/error-state.tsx](../design-system/patterns/error-state.tsx).

- `!` mark: 32px `--danger`
- Default title: "Something went wrong"
- Retry: primary Button

### Dialog
See [design-system/components/dialog.tsx](../design-system/components/dialog.tsx).

Bottom-sheet overlay for errors, warnings, and confirmations.

| Prop | Type | Default |
|------|------|---------|
| `open` | `boolean` | required |
| `onClose` | `() => void` | required |
| `title` | `string` | required |
| `description` | `string` | required |
| `kind` | `'info' \| 'warning' \| 'danger'` | `'info'` |
| `icon` | `ReactNode` | kind's default icon |
| `actions` | `DialogAction[]` | single "Got it" primary button |

- Sheet: `bg-[var(--surface)] rounded-[var(--radius-xl)]` — 16px radius
- Icon container: `w-10 h-10 rounded-[var(--radius-lg)]` with 10% alpha tint of the kind's color
- Backdrop: `oklch(0% 0 0 / 0.40)` + `blur(4px)` — tap backdrop to dismiss
- Clicking backdrop calls `onClose`; clicking inside the sheet stops propagation
- `actions` defaults to `[{ label: 'Got it', variant: 'primary' }]`; pass two actions for confirm/cancel pairs
- Two actions render side-by-side; single action renders full-width

### BottomSheet

See [design-system/components/bottom-sheet.tsx](../design-system/components/bottom-sheet.tsx).

Context-menu sheet that slides up from the screen bottom. Composed of four primitives exported from the same file.

| Primitive | Role |
|-----------|------|
| `BottomSheet` | Backdrop + sliding panel + drag handle wrapper |
| `BottomSheetItem` | Tappable row with optional leading icon |
| `BottomSheetDivider` | 1px `var(--border)` separator between item groups |
| `BottomSheetCancel` | Full-width cancel button pinned at the sheet bottom |

**Panel:**
- `position: fixed; bottom: 0; max-width: max-w-lg`; centered with `left: 50%`
- `background: var(--surface)`, `border-radius: var(--radius-lg) var(--radius-lg) 0 0` (8px top corners only)
- `box-shadow: 0 -4px 32px oklch(0% 0 0 / 0.12)`
- Open: `transform: translateX(-50%) translateY(0)` — transition `0.3s cubic-bezier(0.32, 0, 0.15, 1)`
- Closed: `transform: translateX(-50%) translateY(110%)`

**Backdrop:**
- `background: oklch(0% 0 0 / 0.45)` + `backdrop-filter: blur(2px)`
- `z-index: 100`; panel at `z-index: 101`
- Opacity 0 → 1 on open; `transition: opacity 0.25s`
- Tap backdrop to dismiss

**Drag handle:** `36×4px`, `background: var(--border)`, `border-radius: 2px`, centered with `margin: 0 auto var(--space-4)`

**BottomSheetItem:**
- `min-height: 52px`, `padding: var(--space-3) var(--space-4)`
- `font-size: var(--text-base)`, `font-weight: 500`, `border-radius: var(--radius-md)`
- Default: `color: var(--fg)` — danger variant: `color: var(--danger)`
- Active press: `background: var(--bg)`
- Icon slot: `20×20px`, `flex-shrink: 0`

**BottomSheetDivider:** `height: 1px`, `background: var(--border)`, `margin: var(--space-2) var(--space-2)`

**BottomSheetCancel:** `min-height: 48px`, `font-weight: 600`, `background: var(--bg)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, `margin-top: var(--space-3)`

```tsx
<BottomSheet open={open} onClose={() => setOpen(false)}>
  <BottomSheetItem icon={<PlusIcon />} label="New match" onClick={handleNewMatch} />
  <BottomSheetItem icon={<StatsIcon />} label="View stats" onClick={handleStats} />
  <BottomSheetDivider />
  <BottomSheetItem icon={<TrashIcon />} label="Delete session" danger onClick={handleDelete} />
  <BottomSheetCancel onClick={() => setOpen(false)} />
</BottomSheet>
```

**Rules:**
- Always end with `<BottomSheetCancel>` — users must be able to dismiss without committing.
- Destructive `danger` items come after a `<BottomSheetDivider>`.
- Panel `z-index: 101` sits above `z-40` AppBar and `z-30` FAB — no stacking conflicts.
- The sheet stays in the DOM when closed; CSS transform animates it out rather than unmounting.

### LoadingState
See [design-system/patterns/loading-state.tsx](../design-system/patterns/loading-state.tsx).

- Animated spinner: `border-[var(--accent)] border-t-transparent rounded-full animate-spin`
- Sizes: sm (24px), md (32px), lg (48px)
- Optional message below in `--muted`

---

## Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 0.12s | Button press, opacity |
| `--duration-normal` | 0.15s | Border color changes |
| `--duration-slow` | 0.3s | Page transitions |
| `--easing-default` | ease-in-out | All transitions |

**Keyframes:**
- `pulse` (live indicator): 1.5s infinite, opacity 1→0.4 + scale 1→0.85
- Page transitions: 300ms cubic-bezier(0.32, 0.72, 0, 1) — from existing app

**Principles:**
- Press feedback: `active:opacity-70` (not scale — scale reveals bg at corners)
- No hover effects on mobile
- No decorative animations — instant feel preferred
- Respect `prefers-reduced-motion`

---

## Touch & Accessibility

- Min touch target: 44px (52px on primary actions).
- `touch-action: manipulation` globally — no double-tap zoom.
- `-webkit-tap-highlight-color: transparent` — replaced by `active:` states.
- Always provide `aria-label` on icon-only buttons.

### MatchDetailPage

Full-screen page (`/sessions/:id/matches/:matchId`) that handles all three match states: `SCHEDULED`, `LIVE`, and `COMPLETED`.

**States:**

| State | Description |
|-------|-------------|
| `SCHEDULED` | Pre-match huddle: player roster + serve-first picker. CTA disabled until serve side is chosen. |
| `LIVE` | Live scoreboard with tap-to-score panels, serve indicator, score tools (−1, direct edit), set meter, action row (swap serve / undo), point log. CTA auto-promotes to "Award match to Team X" when winner condition is met. |
| `COMPLETED` | Read-only scoreboard with winner stamp. "Re-open for editing" action row. CTA: "Back to session". |

**Key primitives (page-local, not in design-system):**
- **Scoreboard panel** — 2-column grid with 88px score numerals, `score-bump` keyframe on increment, dotted underline on editable scores.
- **Set meter** — progress bar to `POINTS_TARGET` (21), transitions on width.
- **Point log** — last 8 entries, newest first; latest row highlighted with 5% accent tint.
- **Score keypad sheet** — numeric pad (0–9 + backspace + clear) with quick-chip row (+1, −1, +5, target), delta display.
- **Award-winner sheet** — two team cards side by side.

**Score bump animation** — `@keyframes score-bump` in `tokens.css`; applied inline via `animation: score-bump 0.32s …` on the score numeral element.

**Live score is ephemeral** — individual points are tracked in React state only. The DB score (`match_scores`) is written only when the match is finalized via `useRecordResult`. Stored as a single set: `{ set_number: 1, team_a_score, team_b_score }`.

---

## Planned Features

Features intentionally hidden from the UI pending design/implementation. Keep imports and comments removed from production code — re-add when building.

### Session Detail — Bottom Sheet

| Feature | Status | Notes |
|---------|--------|-------|
| **Share session** | Planned | Export session summary (matches + scores) as shareable link or image. Icon: `Share2`. |
| **Rename session** | Planned | Inline edit for `session.label`. Icon: `Pencil`. Needs inline input or modal flow. |
