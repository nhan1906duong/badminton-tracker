# UI/UX Enhancement Plan — Badminton Tracker

## Context

The app has a strong foundation: cohesive Japanese-sport / vermilion design system, mobile-first discipline, distinctive brand details (shuttlecock loader, sharp-cornered cards), and a transparent rating breakdown that builds user trust. The largest gaps are **consistency** (inline-style sprawl undermining the design system), **discoverability** (signed-out experience hides entry points), and **information architecture** in 1-2 hot pages.

The recommendations below are ordered easiest-and-highest-impact first.

---

## Recommendation 1 — Fix signed-out discoverability — ❌ WON'T APPLY

> **Decision:** Not applying. The app is primarily a public read-only experience — most visitors never need to sign in. Hiding the Settings tab and the create/add FABs for signed-out users is intentional, not a gap. Surfacing login entry points on the public surface adds noise for the common case. (Sign-in stays admin-driven via the `/login` URL.)

**Why:** Logged-out users see a half-functional app. The Settings tab disappears from bottom nav (`src/App.tsx:31`), the "New session" FAB is gone on `SessionsListPage`, the "Add player" FAB is gone on `RankingPage`. The only login entry point is a small `LoginAffordance` pill next to each page title. A first-time visitor has no clear "sign in" path and no preview of what the app offers.

**What to build:**
- Keep the Settings tab visible in the bottom nav for unauthenticated users — remove the `{user && ...}` gate (`src/App.tsx:31`). Settings can render a public "Sign in" CTA + locale toggle for signed-out users.
- Show signed-out CTAs in a disabled or "tap-to-sign-in" state instead of hiding them. Tapping a disabled FAB should open `/login` with a return-to-path.
- Consider promoting `LoginAffordance` to a sticky bar at the top of every tab route for signed-out users (still dismissible).

**Files to touch:**
- `src/App.tsx` — restore Settings tab unconditionally; document new pattern
- `src/components/FloatingActionButton.tsx` — add an optional `requiresAuth` prop that re-routes to `/login`
- `src/pages/SessionsListPage.tsx`, `src/pages/RankingPage.tsx` — replace `{user && <FAB ... />}` with `<FAB requiresAuth />`
- `src/pages/SettingsPage.tsx` — add a public branch (sign-in CTA, locale, theme — no destructive admin actions)

**Effort:** Small. **Impact:** High — affects every new visitor.

---

## Recommendation 2 — Extract repeated style primitives into the design system

**Why:** Pages like `SessionDetailPage`, `CreateMatchPage`, `PlayerDetailPage`, and `RankingPage` carry hundreds of inline `style={{ … }}` objects that re-declare the same patterns: section labels (`var(--font-mono)`, 11px, uppercase, 0.1em tracking, muted), stat numerals, eyebrow rows, meta lines. This:
- Makes pages hard to scan (many 200+ line files swollen by style props)
- Creates subtle drift — every reimplementation can omit a property
- Defeats the design system as a source of truth
- Inflates bundle size and complicates dark-mode audits

**What to build:**

New components in `design-system/components/`:

| Component | Replaces | Props |
|---|---|---|
| `SectionLabel` | the `var(--font-mono) 11px uppercase tracking-[0.1em] muted` span repeated ~15× | `children`, optional `action` slot |
| `StatNumber` | the large numeric value (`var(--font-display)`, 800 weight, tabular-nums) seen in ranking rows, MVP card, session-stats panel | `value`, `size` ('lg' \| 'xl' \| '2xl'), `color` ('fg' \| 'accent' \| 'muted') |
| `EyebrowBadge` | the colored mono-uppercase row above a title (`status`, `live`, `LIVE`, etc.) | `tone` ('live' \| 'scheduled' \| 'completed' \| 'neutral'), `pulse?`, `children` |
| `MetaRow` | the small mono row with date · duration · dot separators | `items: Array<{ label: string; emphasis?: boolean }>` |

Then sweep:
- `CreateMatchPage.tsx` — section labels in match-type, players, when, league teams blocks
- `SessionDetailPage.tsx` — eyebrow + datetime + duration row in the hero
- `RankingPage.tsx` — stat numerals in row right column, mono labels
- `PlayerDetailPage.tsx` — stat panel, history session rows

**Files to touch:**
- `design-system/components/section-label.tsx` (new)
- `design-system/components/stat-number.tsx` (new)
- `design-system/components/eyebrow-badge.tsx` (new)
- `design-system/components/meta-row.tsx` (new)
- `design-system/components/index.ts` — re-export
- `docs/design-guidelines.md` — document the new primitives
- `src/pages/DesignSystemPage.tsx` — preview them
- `src/pages/CreateMatchPage.tsx`, `src/pages/SessionDetailPage.tsx`, `src/pages/RankingPage.tsx`, `src/pages/PlayerDetailPage.tsx` — replace inline styles call-site by call-site

**Effort:** Medium (incremental — can ship one component + sweep per PR). **Impact:** High — every future page benefits, and the visual baseline tightens.

---

## Recommendation 3 — Split `CreateMatchPage` into focused subcomponents — ✅ DONE

> **Done:** `CreateMatchPage.tsx` dropped 1,337 → 485 lines (orchestration only). Extracted `src/components/match-create/`: `PlayerSlotsCard` (now uses `<Avatar>` instead of local `getInitials`), `WhenPanel`, `LeagueTeamSelectors` (native `<select>` → bottom-sheet picker), `ShufflePickerSheet` (owns its selection + shuffle logic, shuffle rows now expose `role="checkbox"`/`aria-checked` — closes Rec #7.2), `PlayerPickerSheet`, and shared `helpers.ts`. Bottom CTA is now two lines (primary verb + secondary meta). New i18n keys added in both locales. Also resolves the league `<select>` portion of Rec #5.

**Why:** The file is 1,411 lines covering match type, league team selectors, player slots, shuffle picker, scheduling, queue preview, two bottom sheets, and a dynamic CTA. Symptoms of "too much in one place":
- `PlayerSlot` reinvents the Avatar with local `getInitials()` (`CreateMatchPage.tsx:60-64`) instead of `<Avatar>` — explicitly against CLAUDE.md
- League team selectors fall back to native `<select>` (`CreateMatchPage.tsx:666-737`) — clashes with the rest of the surface
- The dynamic CTA label (`ctaLabel()` line 465) concatenates 3+ pieces of state into strings that can wrap on small screens

**What to build:**

Decompose into:
- `src/components/match-create/PlayerSlotsCard.tsx` — Team A header + slots + VS divider + Team B header + slots. Slot row uses `<Avatar>`.
- `src/components/match-create/WhenPanel.tsx` — segmented control + Now/Schedule/Queue panels.
- `src/components/match-create/LeagueTeamSelectors.tsx` — replace native `<select>` with a bottom-sheet picker matching the player picker pattern (consistency with the rest of the app).
- `src/components/match-create/ShufflePickerSheet.tsx` — extract the 130+ line bottom sheet.
- Two-line CTA: primary verb ("Start now" / "Schedule" / "Queue") on top, secondary meta ("Tomorrow · 7:00 PM") underneath. Prevents wrapping, communicates the same info more legibly.

**Files to touch:**
- `src/pages/CreateMatchPage.tsx` — orchestration only
- New files under `src/components/match-create/`
- Reuse the bottom-sheet picker primitive for league team selection

**Effort:** Medium. **Impact:** High — maintainability + correctness (closes the Avatar inconsistency), better small-screen CTA.

---

## Recommendation 4 — Pin live sessions to the top of `SessionsListPage`

**Why:** Today, sessions render in a flat reverse-chronological list mixing active, scheduled, and ended. When two sessions are live simultaneously (a supported scenario per CLAUDE.md), a user must visually scan each card for the live indicator. The header subtitle already counts active sessions, but the list itself doesn't prioritize them.

**What to build:**
- Sort sessions into three groups: Live → Scheduled → Ended.
- Render an optional small group header (`SectionLabel` from Rec #2) above each non-empty group: "LIVE NOW", "UPCOMING", "RECENT".
- Skip the header when only one group is present (current behavior).

**Files to touch:**
- `src/pages/SessionsListPage.tsx` — group + sort logic in the `sessions.map(...)` block
- No new components required if Rec #2 is in flight (reuse `SectionLabel`)

**Effort:** Small. **Impact:** Medium-high — every "is anything live?" check gets faster.

---

## Recommendation 5 — Replace native form controls with design-system equivalents

**Why:** Several flows still use raw HTML elements that bypass the design system:
- `<select>` for league team selection (`CreateMatchPage.tsx:666-737`) — OS-styled dropdown, no dark-mode polish, no custom focus ring
- `<input type="datetime-local">` (`SessionDetailPage.tsx:621-626`) and `<input type="date">` / `<input type="time">` (`CreateMatchPage.tsx:964-996`) — browser-native chrome
- Buttons inside `BottomSheet` for edit-time / edit-label modals (`SessionDetailPage.tsx:627-660`) hand-roll their own styles instead of `<Button variant="primary"/"secondary">`

**What to build:**
- Convert league team selectors to a bottom-sheet picker (covered by Rec #3).
- For datetime: keep native pickers (they're the only acceptable mobile UX) but wrap them in a styled "card row" pattern where the **visible** text is your own (already done in `CreateMatchPage.tsx:944-997` via overlay-input technique). Apply the same wrap to `SessionDetailPage`'s edit-time sheet.
- Replace hand-rolled modal buttons with `<Button variant="primary">` / `<Button variant="secondary">`.

**Files to touch:**
- `src/pages/SessionDetailPage.tsx` lines 616-661 — swap modal buttons for `<Button>`
- `src/pages/SessionDetailPage.tsx` lines 621-626 — adopt the overlay-input pattern used in CreateMatchPage
- `src/pages/CreateMatchPage.tsx` — league `<select>` removal (under Rec #3)

**Effort:** Small. **Impact:** Medium — closes visible visual inconsistencies.

---

## Recommendation 6 — Fix `RankingPage` tab overflow

**Why:** Four tabs (All / Doubles / Session / H2H) and the **Session** tab adopts the live session label dynamically (`RankingPage.tsx:326`). On a 360px-wide phone with a long label like "BWF World Tour Finals 2026", the tab strip scrolls horizontally and the **active** tab can land off-screen on first load. Users land on All tab unaware Session even exists.

**What to build:**
- Truncate the dynamic session label inside the tab to ~14 chars with ellipsis: `latestSession.label.length > 14 ? `${label.slice(0, 12)}…` : label`.
- After tab change, scroll the active tab into view: `tabRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth' })`. The `Tabs` component should expose this via a callback or do it internally.
- On initial mount, also scroll the active tab into view (covers deep-links).

**Files to touch:**
- `src/pages/RankingPage.tsx` — truncate label in `tabs={[...]}`
- `design-system/components/tabs.tsx` — auto-scroll active tab into view on change (if not already)

**Effort:** Extra small. **Impact:** Medium — depends on label length but real for tournament sessions.

---

## Recommendation 7 — Small polish + accessibility pass

**Why:** Individually low impact, collectively raises the polish bar and fixes a few real a11y gaps.

**What to fix:**

1. **Clear button in PlayerSlot is not focusable** — `CreateMatchPage.tsx:176-192` uses `role="button"` on a `<span>` with `onClick`. Replace with a real `<button>` so keyboard users can clear a slot.

2. **Shuffle picker rows lack checkbox semantics** — `CreateMatchPage.tsx:1222-1267` are buttons that visually look like checkboxes but don't expose `role="checkbox"` or `aria-checked`. Add the ARIA so screen-reader users can perceive the multi-select.

3. **Share preview is a custom modal** — `SessionDetailPage.tsx:711-746` rolls its own overlay rather than reusing `BottomSheet` / `Dialog`. Promote to a `<Dialog>` or sheet so backdrop-tap, escape-to-close, and focus trapping all work the same as everywhere else.

4. **Dual-element responsive label** — `RankingPage.tsx:126-127` uses `hidden min-[390px]:inline` / `inline min-[390px]:hidden` for a streak label. Works, but a single `<span>` with a CSS `max-width` + ellipsis, or a CSS `clamp()`, is cheaper.

5. **Loading-state inconsistency** — `PlayerDetailPage.tsx:182-185` uses a small accent-bordered spinner instead of `<ShuttleLoading compact />`. Pick one pattern per scope (full-page vs section).

6. **Confirm-on-cancel for CreateMatchPage** — A user with all 4 player slots filled and a scheduled time who taps "Cancel" loses everything silently (`store.reset()` on unmount, `CreateMatchPage.tsx:249`). Show a small confirm dialog if any state is dirty. Low effort, prevents a common frustration.

**Files to touch:**
- `src/pages/CreateMatchPage.tsx` — `PlayerSlot` clear button, shuffle row ARIA, cancel-confirm
- `src/pages/SessionDetailPage.tsx` — replace custom share modal
- `src/pages/RankingPage.tsx` — simplify streak responsive text
- `src/pages/PlayerDetailPage.tsx` — switch loading spinner

**Effort:** Each item is XS. **Impact:** Cumulatively medium.

---

## Recommendation 8 — Surface dark-mode toggle if absent

**Why:** Tokens fully support dark mode via `[data-theme="dark"]` on `<html>`, but I didn't see a user-facing theme toggle on `SettingsPage`. If absent, users on devices that don't pick the OS preference see only light mode despite the work done. If present, it should be one tap from `/settings` with no scrolling.

**What to build:**
- Audit `SettingsPage.tsx`. If a toggle exists, ensure it's above-the-fold and uses a real switch (not text).
- If absent: add a "Theme" row with three options (System / Light / Dark), persisted to `localStorage`, applied to `document.documentElement.dataset.theme`.

**Files to touch:**
- `src/pages/SettingsPage.tsx`
- A new `src/hooks/useTheme.ts` for persistence + system-preference listener

**Effort:** Small (if absent). **Impact:** Medium for users in dark environments.

---

## Priority Order

| # | Recommendation | Effort | Impact |
|---|---|---|---|
| 1 | ~~Signed-out discoverability (Settings tab + login-prompt CTAs)~~ — ❌ won't apply (public-first by design) | S | — |
| 2 | Extract `SectionLabel` / `StatNumber` / `EyebrowBadge` / `MetaRow` | M | High |
| 3 | ~~Split `CreateMatchPage` + bottom-sheet league picker + two-line CTA~~ — ✅ done | M | High |
| 4 | Pin live sessions to top of `SessionsListPage` | S | Medium-High |
| 5 | Replace native `<select>` + modal hand-rolled buttons | S | Medium |
| 6 | `RankingPage` tab overflow fix | XS | Medium |
| 7 | A11y + polish pass (7 small items) | S each | Medium (cumulative) |
| 8 | Dark-mode toggle if absent on `SettingsPage` | S | Medium |

## Suggested Sequencing

- **Week 1:** #6 (tab overflow) + #4 (live pin) — small, high-visibility wins (#1 dropped — public-first by design)
- **Week 2:** #2 (design-system primitives) — foundation for the rest
- **Week 3:** #3 (CreateMatchPage split) — depends on #2 components landing
- **Ongoing:** #5, #7, #8 mixed in as opportunistic cleanups

## Verification (per recommendation)
- `npm run dev` → walk the affected screen in light and dark mode at 360 / 390 / 430px widths
- `npm run build` → confirm no TypeScript errors
- `npm run test` → catch regressions in existing suites
- Manual: tab through with keyboard to confirm a11y improvements
