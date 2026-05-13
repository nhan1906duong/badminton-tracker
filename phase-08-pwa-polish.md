# Phase 8 — PWA Polish

## Overview
- **Priority**: P1
- **Status**: Pending
- **Description**: Make the app feel native on iOS with proper PWA setup, icons, splash screens, and offline support.

## iOS PWA Requirements

### Icons
- 180x180: Apple touch icon
- 192x192: PWA icon
- 512x512: Splash screen / store
- Use real badminton-themed icon (generate or design)

### Splash Screens
- iPhone SE, iPhone 12/13/14, iPhone 14 Pro Max, iPad
- Generate via `pwa-asset-generator` or manually

### Meta Tags (in `index.html`)
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Badminton">
<link rel="apple-touch-icon" href="/icons/icon-180.png">
```

### Manifest (`vite-plugin-pwa`)
```json
{
  "name": "Badminton Match Tracker",
  "short_name": "Badminton",
  "theme_color": "#16a34a",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/"
}
```

## Offline Support

### Workbox Strategy
- Precache: static assets, HTML, JS, CSS
- Runtime cache: API responses (Supabase) with stale-while-revalidate
- Offline fallback: cached data + "offline mode" banner

### Scope
- v1: Basic caching (app shell loads offline)
- v2: Show cached matches when offline
- v3: Queue match creation for sync when back online

## Native Feel

- Viewport: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`
- Safe area insets for notched iPhones
- Overscroll behavior: `overscroll-behavior-y: none` to prevent bounce
- Touch feedback on buttons
- Hide browser chrome: `display: standalone` in manifest
- Bottom nav bar with safe area padding

## Files to Modify
- `index.html` — meta tags
- `vite.config.ts` — PWA plugin config
- `src/index.css` — safe area, overscroll
- `public/icons/` — add all icon sizes

## Tools
```bash
npx pwa-asset-generator logo.png public/icons \
  --background "#16a34a" \
  --splash-only \
  --index index.html
```

## Success Criteria
- [ ] App can be added to iOS home screen
- [ ] Custom icon appears on home screen
- [ ] App opens in standalone mode (no Safari chrome)
- [ ] Splash screen shows on launch
- [ ] Status bar styled correctly
- [ ] Basic offline functionality works

## Next Steps
- Proceed to [Phase 9 — Deploy](phase-09-deploy.md)
