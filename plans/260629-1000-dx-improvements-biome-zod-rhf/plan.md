# Plan: DX Improvements — Biome, Zod, react-hook-form

**Status:** In Progress
**Branch:** enhance/dx-improvements

## Goal

Adopt three targeted improvements from the CRUD dashboard spec analysis:
1. **Biome** — replace ESLint with a unified lint + format tool (faster, zero-config)
2. **Zod RPC schemas** — runtime validation on Supabase RPC responses to catch shape drift
3. **react-hook-form + zod resolver** — typed, validated forms replacing manual state in all form components

Phases 4–5 (TanStack Table, TanStack Router) are deferred — higher migration cost, lower payoff for current scope.

---

## Phase Overview

| # | Phase | Status |
|---|-------|--------|
| 1 | [Biome: replace ESLint](#phase-1-biome) | Done |
| 2 | [Zod schemas for RPC responses](#phase-2-zod-rpc-schemas) | Pending |
| 3 | [react-hook-form + zod on all forms](#phase-3-react-hook-form--zod) | Pending |

---

## Phase 1: Biome

**Goal:** Replace ESLint with Biome as the single lint + format tool. No formatter exists today; Biome adds one for free.

### Why

- ESLint runs linting only — no formatting. Biome does both in one pass, ~10x faster.
- Removes 6 dev packages (`@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`, `eslint`).
- Adds 1 (`@biomejs/biome`).

### Files to Remove

- `eslint.config.js`

### Files to Create

- `biome.json` — Biome config (lint + format rules)

### Files to Change

- `package.json`
  - Remove: `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `typescript-eslint`
  - Add: `@biomejs/biome` (dev)
  - Scripts:
    - `lint` → `biome check .`
    - `format` → `biome format --write .` (new)
    - `lint:fix` → `biome check --write .` (new)

### Biome Config (`biome.json`)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.x/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "warn" },
      "correctness": { "useExhaustiveDependencies": "warn" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "semicolons": "asNeeded", "singleQuote": true }
  },
  "files": {
    "ignore": ["dist", "node_modules", "*.d.ts", "public"]
  }
}
```

### Key Decisions

- Keep `react-refresh` behavior — Biome's React rules cover the important subset.
- No Prettier config to migrate — no existing formatter, clean slate.
- `useExhaustiveDependencies` as `warn` not `error` — existing hooks may have intentional omissions.

### Todo

- [ ] Remove ESLint packages from `package.json`
- [ ] Add `@biomejs/biome`
- [ ] Delete `eslint.config.js`
- [ ] Create `biome.json`
- [ ] Update `lint`, add `format`, `lint:fix` scripts
- [ ] Run `bun run lint` — fix any new violations
- [ ] Run `bun run format --write .` — apply formatting across codebase
- [ ] Verify `bun run build` still passes

---

## Phase 2: Zod RPC Schemas

**Goal:** Add Zod parse/validation on Supabase RPC responses at the boundary where data enters the app. Prevents silent shape drift when DB RPCs change.

### Scope

Three RPC hooks return raw typed data from Supabase that is used directly in UI:

| Hook | RPC | Risk |
|------|-----|------|
| `useLeaderboard.ts` | `player_all_time_stats` table select | ranking row shape |
| `usePlayerRankingSummary.ts` | `player_all_time_stats` single row | player stats shape |
| `usePlayerBadges.ts` | `get_badge_leaders()` RPC | badge leader shape |

### Files to Create

- `src/lib/schemas/rpc-schemas.ts`
  - `LeaderboardRowSchema` (Zod) — mirrors `player_all_time_stats` columns used by client
  - `PlayerRankingSummarySchema` — single-row subset
  - `BadgeLeaderSchema` — `{ badge_type, leader_id, leader_count }` per row

### Files to Change

- `src/hooks/useLeaderboard.ts` — parse RPC result with `LeaderboardRowSchema.array().parse(data)`
- `src/hooks/usePlayerRankingSummary.ts` — parse with `PlayerRankingSummarySchema.parse(data)`
- `src/hooks/usePlayerBadges.ts` — parse badge leaders with `BadgeLeaderSchema.array().parse(data)`

### Validation Strategy

- Use `schema.safeParse()` in dev and log warnings on mismatch; throw in production-equivalent to surface issues early.
- Do NOT add Zod to hot-path render loops — parse once per query result in the `select` transformer.

### Package

- Add `zod` to `dependencies` (also needed by Phase 3)

### Todo

- [ ] `bun add zod`
- [ ] Create `src/lib/schemas/rpc-schemas.ts` with 3 schemas
- [ ] Update `useLeaderboard.ts` — wrap mapped rows through `LeaderboardRowSchema`
- [ ] Update `usePlayerRankingSummary.ts` — parse single row
- [ ] Update `usePlayerBadges.ts` — parse badge leader rows
- [ ] Add `bun run test` pass check

---

## Phase 3: react-hook-form + Zod

**Goal:** Replace manual `useState` + ad-hoc validation in all 5 form components with `react-hook-form` + `zod` resolver. Gives typed field state, built-in error messages, and single schema source of truth.

### Forms in Scope

| File | Fields | Current validation |
|------|--------|--------------------|
| `src/pages/LoginPage.tsx` | email, password | inline checks |
| `src/pages/ChangePasswordPage.tsx` | currentPassword, newPassword, confirmPassword | inline checks |
| `src/components/PlayerForm.tsx` | name, avatar_url | manual state |
| `src/components/QuoteFormSheet.tsx` | quote (max 50 chars) | length check in handler |
| `src/components/RacketFormSheet.tsx` | brand, real_name, nickname, mascot_id | manual state |

### Files to Create

- `src/lib/schemas/form-schemas.ts`
  - `LoginSchema` — `{ email: z.string().email(), password: z.string().min(1) }`
  - `ChangePasswordSchema` — `{ currentPassword, newPassword (min 8), confirmPassword }` with `.refine` check
  - `PlayerFormSchema` — `{ name: z.string().min(1).max(50), avatar_url: z.string().url().optional().or(z.literal('')) }`
  - `QuoteSchema` — `{ quote: z.string().min(1).max(50) }`
  - `RacketFormSchema` — `{ brand: z.string(), real_name: z.string().min(1), nickname: z.string().optional(), mascot_id: z.string().nullable() }`

### Files to Change

- `src/pages/LoginPage.tsx` — replace `useState` form state with `useForm<LoginSchema>`
- `src/pages/ChangePasswordPage.tsx` — replace manual state with `useForm<ChangePasswordSchema>`
- `src/components/PlayerForm.tsx` — replace manual state with `useForm<PlayerFormSchema>`
- `src/components/QuoteFormSheet.tsx` — replace manual state with `useForm<QuoteSchema>`; reset on open
- `src/components/RacketFormSheet.tsx` — replace manual state with `useForm<RacketFormSchema>`; reset on open/edit

### Packages to Add

- `react-hook-form`
- `@hookform/resolvers`
- (Zod already added in Phase 2)

### Migration Pattern per Form

```tsx
// Before
const [name, setName] = useState('')
const [error, setError] = useState<string | null>(null)

const handleSubmit = () => {
  if (!name.trim()) { setError('Required'); return }
  mutation.mutate({ name })
}

// After
const { register, handleSubmit, formState: { errors } } = useForm<PlayerFormValues>({
  resolver: zodResolver(PlayerFormSchema),
})

const onSubmit = (data: PlayerFormValues) => {
  mutation.mutate(data)
}
```

### Key Decisions

- Keep existing UI components (inputs, buttons from design system) — only swap state management layer.
- `reset()` called in `useEffect` when sheet opens with existing data (edit mode).
- `QuoteFormSheet` and `RacketFormSheet` accept `defaultValues` prop for edit mode — RHF `reset(defaultValues)` on `useEffect([defaultValues])`.
- Error messages rendered via `errors.fieldName?.message` — matches existing error display pattern.

### Todo

- [ ] `bun add react-hook-form @hookform/resolvers`
- [ ] Create `src/lib/schemas/form-schemas.ts` with all 5 schemas
- [ ] Migrate `LoginPage.tsx`
- [ ] Migrate `ChangePasswordPage.tsx`
- [ ] Migrate `PlayerForm.tsx`
- [ ] Migrate `QuoteFormSheet.tsx`
- [ ] Migrate `RacketFormSheet.tsx`
- [ ] Run `bun run build` — no type errors
- [ ] Run `bun run test` — all tests pass
- [ ] Manual smoke test: login, add player, add racket, add quote, change password

---

## Deferred

| Item | Reason |
|------|--------|
| TanStack Table | High migration cost; existing virtual list impl works well |
| TanStack Router | Non-trivial migration; react-router-dom v7 is adequate |

---

## Files Summary

### New
- `biome.json`
- `src/lib/schemas/rpc-schemas.ts`
- `src/lib/schemas/form-schemas.ts`

### Deleted
- `eslint.config.js`

### Modified
- `package.json`
- `src/hooks/useLeaderboard.ts`
- `src/hooks/usePlayerRankingSummary.ts`
- `src/hooks/usePlayerBadges.ts`
- `src/pages/LoginPage.tsx`
- `src/pages/ChangePasswordPage.tsx`
- `src/components/PlayerForm.tsx`
- `src/components/QuoteFormSheet.tsx`
- `src/components/RacketFormSheet.tsx`
