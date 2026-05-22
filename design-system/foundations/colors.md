# Colors

Six core tokens plus four semantic status colors. All use oklch() for perceptually uniform lightness.

## Core Tokens

| Token   | Light Mode                | Dark Mode                 | Usage                          |
|---------|---------------------------|---------------------------|--------------------------------|
| `--bg`      | oklch(99% 0.003 50)   | oklch(12% 0.02 50)    | Page background                |
| `--surface` | oklch(100% 0 0)       | oklch(15% 0.018 50)   | Cards, modals, inputs          |
| `--fg`      | oklch(12% 0.02 50)    | oklch(95% 0.005 50)   | Primary text, borders          |
| `--muted`   | oklch(50% 0.01 50)    | oklch(55% 0.01 50)    | Secondary text, placeholders   |
| `--border`  | oklch(88% 0.008 50)   | oklch(28% 0.015 50)   | Dividers, card borders         |
| `--accent`  | oklch(55% 0.20 30)    | oklch(60% 0.18 30)    | Vermilion — CTAs, live, winner |

## Status Colors

| Token     | Light Mode              | Dark Mode               | Usage        |
|-----------|-------------------------|-------------------------|--------------|
| `--success` | oklch(50% 0.14 145) | oklch(55% 0.12 145) | Win badges   |
| `--danger`  | oklch(55% 0.20 25)  | oklch(60% 0.18 25)  | Loss, delete |
| `--warn`    | oklch(70% 0.14 85)  | oklch(70% 0.12 85)  | Warnings     |
| `--info`    | oklch(55% 0.12 250) | oklch(55% 0.10 250) | Info hints   |

## Usage in Tailwind

```html
<div class="bg-[var(--surface)] border border-[var(--border)] text-[var(--fg)]">
  <span class="text-[var(--accent)]">Accent text</span>
</div>
```
