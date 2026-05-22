# Spacing

8px base unit. Derived from the session-card and match-card specs.

## Scale

| Token       | Value | Usage                               |
|-------------|-------|-------------------------------------|
| `--space-1` | 4px   | Icon gaps, tight padding            |
| `--space-2` | 8px   | Small gaps, icon-text spacing       |
| `--space-3` | 12px  | Default component gaps              |
| `--space-4` | 16px  | Card internal padding               |
| `--space-5` | 24px  | Section gaps, page padding          |
| `--space-6` | 32px  | Large section spacing               |
| `--space-7` | 48px  | Page header spacing                 |
| `--space-8` | 64px  | Major section breaks                |

## Common Patterns

- Card padding: `--space-4` (16px) horizontal, `--space-4` to `--space-5` vertical
- Page padding: `--space-5` (24px) horizontal
- Gap between cards: `--space-3` (12px)
- Section margin: `--space-6` to `--space-8`

## Usage in Tailwind

```html
<div class="p-[var(--space-4)] gap-[var(--space-3)]">
<div class="px-[var(--space-5)] py-[var(--space-6)]">
```
