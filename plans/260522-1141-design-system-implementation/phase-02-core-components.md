# Phase 2: Core Components

## Priority
P0 — Building blocks for all UI.

## Status
pending

## Description
Implement 5 atomic components used across the app: Button, Input, Badge, Card, Tabs.

## Blocked By
Phase 1 (Foundations)

## Key Insights
- Brutalist button spec (from design-system.html) was rejected — use Japanese Sport styling
- Match card and session card share Badge and Card patterns
- All components need `active:` press states for mobile

## Components

### 1. Button
Variants: Primary, Secondary, Ghost, Accent, Danger
Sizes: sm, default, lg, block
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'default' | 'lg' | 'block';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}
```

### 2. Input
Types: text, number
Features: Label, Hint, Focus state
```tsx
interface InputProps {
  label?: string;
  hint?: string;
  type?: 'text' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}
```

### 3. Badge
Variants: win, loss, neutral, accent, default
```tsx
interface BadgeProps {
  variant?: 'win' | 'loss' | 'neutral' | 'accent' | 'default';
  children: React.ReactNode;
}
```

### 4. Card
Base container with optional interactive state
```tsx
interface CardProps {
  interactive?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

### 5. Tabs
Underline indicator, horizontal scroll on mobile
```tsx
interface TabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}
```

## Files to Create
- `design-system/components/button.tsx`
- `design-system/components/input.tsx`
- `design-system/components/badge.tsx`
- `design-system/components/card.tsx`
- `design-system/components/tabs.tsx`

## Styling Approach
```tsx
// Example: Button primary
<button className="
  inline-flex items-center justify-center gap-2
  px-4 py-3
  font-semibold text-[15px]
  bg-[var(--fg)] text-[var(--surface)]
  border-2 border-[var(--fg)]
  rounded-[var(--radius-sm)]
  active:opacity-70
  transition-opacity duration-150
">
```

## Implementation Steps
1. Implement Button with all variants
2. Implement Input with label + hint
3. Implement Badge with all variants
4. Implement Card (container only)
5. Implement Tabs with underline indicator
6. Export all from `design-system/components/index.ts`

## Success Criteria
- [ ] All variants render correctly in light mode
- [ ] All variants render correctly in dark mode
- [ ] Active press states work on mobile
- [ ] Components are typed (TypeScript)

## Risk Assessment
- **Low risk** — presentational components, no state
- **Mitigation** — Review against design HTML pixel-by-pixel
