# Design Guidelines

Source of truth for the app's visual language. The dev-only
`/settings/design-system` route renders every token & component below so changes
can be previewed in-app.

> **App MUST respect this system.** New components reuse the tokens here; don't
> invent new shades, radii, or text sizes without updating this file and the
> Design System page in lockstep.

## Surface

- Mobile-first, max width `512px` (`max-w-lg`) centered.
- Background: `bg-gray-50` page; cards on `bg-white`.
- Border: `border border-gray-100` (cards) / `border-gray-200` (inputs).
- Radius: `rounded-2xl` (16px) for cards / `rounded-xl` (12px) for inner
  controls / `rounded-full` for pills, avatars, FAB.

## Colors

Tailwind tokens (CSS vars in `src/index.css` for raw values).

| Role | Class | Hex |
|------|-------|-----|
| Primary | `green-600` | `#16a34a` |
| Primary dark | `green-700` | `#15803d` |
| Primary tint | `green-50` / `green-100` | — |
| Team A | `blue-500` | `#3b82f6` |
| Team B | `red-500` | `#ef4444` |
| Danger | `red-600` | `#dc2626` |
| Dev tag | `amber-600` on `amber-100` | — |
| Surface | `white` | `#ffffff` |
| Background | `gray-50` | `#f9fafb` |
| Border | `gray-100` / `gray-200` | — |
| Text primary | `gray-900` | `#111827` |
| Text muted | `gray-500` / `gray-400` | — |

## Typography

System font stack (`system-ui`). Sizes are in px to match iOS rhythm.

| Use | Class |
|-----|-------|
| AppBar title | `text-[17px] font-bold` |
| Item title / button label | `text-[15px] font-bold` / `font-semibold` |
| Body | `text-sm font-medium` (14px) |
| Caption | `text-xs` (12px) |
| Tag | `text-[10px] font-bold uppercase tracking-wide` |

## Spacing

- Page padding: `px-4 py-5` (top/bottom adjusted per page).
- Bottom safe-area room: `pb-32` (clears bottom nav + FAB).
- Gap between cards/lists: `space-y-3` or `space-y-4`.

## Buttons

| Variant | Recipe |
|---------|--------|
| Primary | `bg-green-600 text-white active:bg-green-700`, `rounded-2xl`, `py-3.5`, `minHeight: 52` |
| Secondary | `bg-gray-100 text-gray-700 active:bg-gray-200` |
| Danger | `bg-red-600 text-white active:bg-red-700` |
| Outline | `border border-gray-200 bg-white active:bg-gray-50` |
| Mini action | `text-xs font-semibold` on `bg-{color}-50 rounded-xl px-3 py-2` |
| FAB | `w-14 h-14 bg-green-600 rounded-full shadow-lg shadow-green-600/25 active:scale-90` |

Always include `active:` press-state and 44+px touch target.

## Items

- **Player (list)**: avatar `w-10 h-10 bg-green-100 rounded-full`, name `text-sm`,
  stats line `text-xs text-gray-400`. Container: `rounded-2xl border bg-white p-3`.
- **Player (grid card)**: same avatar size; selected → blue/red tint with
  matching border + `shadow-sm`. Disabled → `opacity-50`.
- **Session**: card with bold label + calendar date row; green `Active` pill
  when `!ended_at`.
- **Match card**: type pill (left) + date (right) header, then Team A/score/Team B
  row. Winner team text turns `text-blue-700` / `text-red-700` with `font-bold`
  and a `Trophy` micro-badge.

## Pills & Chips

- Status pill: `text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full`.
- Dev tag: `text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded`.
- Team chip: `px-3 py-2 rounded-lg`, blue/red 50/200 palette + initial avatar.
- Active player chip: `pl-1 pr-3 py-1 rounded-full bg-green-600 text-white text-sm font-medium` with 24px avatar; tap-to-remove.
- Add player CTA (dashed): `border border-dashed border-gray-300 rounded-full px-3 py-1.5` with `+` icon.
- Circle indicator (multi-select): 24px circle; unselected `border-2 border-gray-300`, selected `bg-green-600` + white `Check`.

## Form Inputs

- Height: `minHeight: 52` (large tap target).
- Base: `bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px]`.
- Focus: `focus:ring-2 focus:ring-green-500 focus:border-transparent`.
- Score inputs: `w-16 h-11 rounded-xl text-lg font-bold` (blue for A, red for B).

## States

- Loading: `w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin`.
- Empty: centered icon `w-10 h-10 text-gray-300` + `text-sm text-gray-400` message.
- Modal backdrop: `bg-black/40`; modal `bg-white rounded-2xl p-5 max-w-xs`.

## Motion

- Press feedback: `active:scale-[0.97]` (cards) / `active:scale-90` (FAB).
- Toggle/select: `transition-all` / `transition-transform`.
- No long animations — instant feel preferred.

## Touch & Accessibility

- Min target 44px (52px on primary actions).
- `touch-action: manipulation` globally (`index.css`) — no double-tap zoom.
- `-webkit-tap-highlight-color: transparent` — replace with `active:` state.
- Always provide `aria-label` on icon-only buttons (e.g. FAB).
