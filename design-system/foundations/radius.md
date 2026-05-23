# Radius

Minimal rounding — sharp for UI elements, slight rounding for cards.

## Scale

| Token        | Value | Usage                        |
|--------------|-------|------------------------------|
| `--radius-sm`  | 0px   | Buttons, inputs, badges      |
| `--radius-md`  | 4px   | Avatars, small containers    |
| `--radius-lg`  | 8px   | Cards, modals, larger panels |

## Rationale

The Japanese Sport direction favors a near-brutalist sharpness. Buttons and inputs have no radius (0px). Cards get a subtle 8px rounding to soften the layout without feeling bubbly.

## Usage in Tailwind

```html
<button class="rounded-[var(--radius-sm)]">Sharp button</button>
<div class="rounded-[var(--radius-lg)]">Softened card</div>
<div class="rounded-[var(--radius-md)]">Avatar</div>
```
