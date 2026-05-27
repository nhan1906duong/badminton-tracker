# Code Standards

## File Naming

- Follow the existing convention for the area you are editing:
  - React page/component files use PascalCase: `PlayerSelector.tsx`, `MatchDetailPage.tsx`
  - Hooks use camelCase with the `use` prefix: `useMatches.ts`, `usePlayerStats.ts`
  - Pure utilities and design-system foundations use kebab-case where already established: `fair-shuffle.ts`, `player-name.ts`, `colors.md`
- Descriptive names even if long: `badminton-match-tracker` is fine

## Component Structure

```tsx
// Single responsibility: one component per file
// File: player-selector.tsx

interface PlayerSelectorProps {
  onSelect: (playerId: string) => void
}

export function PlayerSelector({ onSelect }: PlayerSelectorProps) {
  // Hooks first
  // State next
  // Handlers
  // Render

  return (
    <div className="...">
      {/* JSX */}
    </div>
  )
}
```

## TypeScript Conventions

- Use interfaces for object shapes
- Export types explicitly
- Use `type` for unions and computed types

```typescript
// Good
interface Player {
  id: string
  name: string
  is_active: boolean
}

type MatchType = 'MEN_SINGLES' | 'WOMEN_SINGLES' | 'MEN_DOUBLES' | 'WOMEN_DOUBLES' | 'MIXED_DOUBLES'
```

## Hooks Pattern

```typescript
// Custom hooks return objects with related functionality
export function useMatches() {
  // useQuery/useMutation
  // Return data + functions
}

export function useCreateMatch() {
  // Single mutation
  // Return mutation object
}
```

## State Management

- TanStack Query for server state (matches, players)
- React useState for local UI state
- Context for auth state only

## Styling

- Tailwind CSS utility classes
- Prefer design-system tokens through Tailwind arbitrary values (`bg-[var(--surface)]`, `text-[var(--fg)]`) for normal layout/styling
- Inline styles are acceptable when a component already uses token-driven inline styles or needs dynamic values that are awkward in class names
- Mobile-first design (max-w-lg centered)

## Player Name Display

- Store and edit the full player name in `players.name`.
- Show the full player name only on that player's profile page (`/players/:playerId`) and in name-editing inputs.
- Everywhere else, display the shortened form with `formatShortPlayerName()` from `src/lib/player-name.ts`.
- Short-name format keeps the first word and initials every remaining word:
  - `Danh Nguyen` → `Danh N.`
  - `Nhan Duong Ngoc` → `Nhan D. N.`
- Keep avatar `name` props and search/filter matching on the full stored name so initials, image alt text, and lookup behavior remain stable.

## Error Handling

```typescript
// Always handle errors in mutations
const { mutate, isPending, error } = useCreateMatch()

// Show error in UI
{error && <p className="text-red-500">{error.message}</p>}
```

## Supabase Integration

```typescript
// Always use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate before creating client
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars')
}
```

## File Size Guidelines

- Target <200 lines per file
- Split large components into smaller pieces
- Extract utility functions to `/lib`

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `PlayerSelector` |
| Hooks | camelCase with `use` prefix | `useMatches` |
| Types/Interfaces | PascalCase | `Player`, `MatchType` |
| Files | kebab-case | `player-selector.tsx` |
| CSS classes | Tailwind utilities | `text-green-600` |

## Documentation

- JSDoc for complex functions
- Inline comments for non-obvious logic
- Keep docs in `./docs/` directory
