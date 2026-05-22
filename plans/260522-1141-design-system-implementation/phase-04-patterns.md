# Phase 4: Patterns

## Priority
P1 — Composite UI states.

## Status
pending

## Description
Implement reusable pattern components: EmptyState, LoadingState, ErrorState.

## Blocked By
Phase 2 (Core Components)

## Key Insights
- Patterns compose lower-level components
- EmptyState uses Card + Button internally
- LoadingState is a simple spinner
- ErrorState may include a retry action

## Components

### 1. EmptyState
```tsx
interface EmptyStateProps {
  icon?: string; // emoji or icon name
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; variant?: ButtonVariant };
}
```

### 2. LoadingState
```tsx
interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}
```

### 3. ErrorState
```tsx
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}
```

## Files to Create
- `design-system/patterns/empty-state.tsx`
- `design-system/patterns/loading-state.tsx`
- `design-system/patterns/error-state.tsx`

## Implementation Steps
1. Build EmptyState with icon + title + description + optional CTA
2. Build LoadingState with spinning indicator
3. Build ErrorState with message + retry button

## Success Criteria
- [ ] EmptyState centered, uses Card styling
- [ ] LoadingState spinner animates
- [ ] ErrorState shows retry button when callback provided

## Risk Assessment
- **Low risk** — Simple composite components
