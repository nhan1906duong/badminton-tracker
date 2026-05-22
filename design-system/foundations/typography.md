# Typography

System font stack with two roles: Display (headings) and Body (everything else). Both use the same stack for consistency in this design.

## Font Stacks

| Role    | Stack                                                                  | Token            |
|---------|------------------------------------------------------------------------|------------------|
| Display | -apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, Segoe UI   | `--font-display` |
| Body    | -apple-system, BlinkMacSystemFont, 'SF Pro Text',  Inter, Segoe UI     | `--font-body`    |
| Mono    | ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo                       | `--font-mono`    |

## Type Scale

| Token       | Size  | Weight | Line Height | Letter Spacing | Usage                 |
|-------------|-------|--------|-------------|----------------|-----------------------|
| `--text-xs`   | 11px  | 700    | 1           | 0.06em (uppercase) | Badges, labels, meta  |
| `--text-sm`   | 13px  | 500    | 1.3         | —              | Captions, subtitles   |
| `--text-base` | 15px  | 400    | 1.6         | —              | Body text             |
| `--text-lg`   | 18px  | 700    | 1.2         | -0.01em        | Team names, scores    |
| `--text-xl`   | 24px  | 800    | 1.15        | -0.02em        | Session names         |
| `--text-2xl`  | 32px  | 800    | 1.1         | -0.03em        | Section titles        |
| `--text-3xl`  | 48px  | 800    | 1.05        | -0.03em        | Page titles           |

## Usage in Tailwind

```html
<h1 class="font-[var(--font-display)] text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em]">
<h2 class="font-[var(--font-display)] text-[32px] font-extrabold leading-[1.1]">
<p class="font-[var(--font-body)] text-[15px] leading-[1.6]">
<span class="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.06em]">
```
